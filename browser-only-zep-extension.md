# Browser-Only Azure DevOps Extension for ZEP Integration (No Backend Required)

## Overview

This solution implements a completely browser-based Azure DevOps extension that directly calls the ZEP API without requiring a backend server. The extension handles three sequential API calls:

1. **Read ZEP ticket IDs** from a custom field in the Azure DevOps work item
2. **Fetch time durations** from the ZEP API for each ticket
3. **Update the Duration field** in the Azure DevOps work item with the aggregated total

## Architecture Benefits & Trade-offs

### ✅ Benefits:
- No backend infrastructure required
- Simpler deployment and maintenance
- Lower operational costs
- Faster response times (no proxy overhead)
- Works entirely within Azure DevOps

### ⚠️ Trade-offs:
- ZEP API must support CORS for Azure DevOps domains
- API credentials stored in browser (less secure)
- Each user needs their own ZEP credentials
- No centralized logging or monitoring

## Complete Implementation

### 1. Extension Manifest (vss-extension.json)

```json
{
  "manifestVersion": 1,
  "id": "zep-time-tracker-browser",
  "publisher": "your-publisher",
  "version": "1.0.0",
  "name": "ZEP Time Tracker (Browser Edition)",
  "description": "Direct browser-based ZEP time tracking integration for Azure DevOps",
  "public": false,
  "categories": ["Azure Boards"],
  "tags": ["time tracking", "zep", "productivity"],
  "targets": [
    {
      "id": "Microsoft.VisualStudio.Services"
    }
  ],
  "icons": {
    "default": "images/extension-icon.png"
  },
  "scopes": [
    "vso.work",
    "vso.work_write",
    "vso.extension_data"
  ],
  "contributions": [
    {
      "id": "zep-time-tracker-group",
      "type": "ms.vss-work-web.work-item-form-group",
      "description": "ZEP time tracking integration",
      "targets": [
        "ms.vss-work-web.work-item-form"
      ],
      "properties": {
        "name": "ZEP Time Tracking",
        "uri": "src/workitem-group/workitem-group.html",
        "height": 500
      }
    },
    {
      "id": "zep-settings-hub",
      "type": "ms.vss-web.hub",
      "description": "ZEP Time Tracker Settings",
      "targets": [
        "ms.vss-web.project-admin-hub-group"
      ],
      "properties": {
        "name": "ZEP Time Tracker",
        "uri": "src/settings/settings.html",
        "icon": "images/settings-icon.png"
      }
    }
  ],
  "files": [
    {
      "path": "src",
      "addressable": true
    },
    {
      "path": "images",
      "addressable": true
    },
    {
      "path": "node_modules/azure-devops-extension-sdk",
      "addressable": true,
      "packagePath": "lib"
    }
  ]
}
```

### 2. Main React Component with Direct API Calls (src/workitem-group/ZepTimeTracker.tsx)

```typescript
import React, { useState, useEffect } from 'react';
import * as SDK from 'azure-devops-extension-sdk';
import { Button } from 'azure-devops-ui/Button';
import { FormItem } from 'azure-devops-ui/FormItem';
import { TextField } from 'azure-devops-ui/TextField';
import { MessageCard, MessageCardSeverity } from 'azure-devops-ui/MessageCard';
import { Spinner, SpinnerSize } from 'azure-devops-ui/Spinner';
import { Table } from 'azure-devops-ui/Table';
import { Toggle } from 'azure-devops-ui/Toggle';
import { Dialog } from 'azure-devops-ui/Dialog';
import { ZepApiService } from '../services/ZepApiService';
import { WorkItemService } from '../services/WorkItemService';
import { CredentialService } from '../services/CredentialService';
import { ZepTimeEntry } from '../types/ZepTypes';

interface ZepTimeTrackerProps {
  workItemId: number;
}

const ZepTimeTracker: React.FC<ZepTimeTrackerProps> = ({ workItemId }) => {
  // State management
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [zepTickets, setZepTickets] = useState<string[]>([]);
  const [timeEntries, setTimeEntries] = useState<ZepTimeEntry[]>([]);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [credentials, setCredentials] = useState<{ apiKey?: string; baseUrl?: string }>({});
  const [showCredentialDialog, setShowCredentialDialog] = useState(false);
  const [rememberCredentials, setRememberCredentials] = useState(true);
  const [processStatus, setProcessStatus] = useState<string>('');

  // Service instances
  const zepApi = new ZepApiService();
  const workItemService = new WorkItemService();
  const credentialService = new CredentialService();

  useEffect(() => {
    initializeExtension();
  }, []);

  const initializeExtension = async () => {
    try {
      SDK.init();
      await SDK.ready();
      
      // Load stored credentials
      const savedCredentials = await credentialService.getCredentials();
      if (savedCredentials.apiKey && savedCredentials.baseUrl) {
        setCredentials(savedCredentials);
        zepApi.setCredentials(savedCredentials.apiKey, savedCredentials.baseUrl);
      } else {
        setShowCredentialDialog(true);
      }

      // Fetch ZEP tickets from custom field
      await fetchZepTicketsFromWorkItem();
    } catch (err) {
      setError('Failed to initialize extension');
      console.error(err);
    }
  };

  // Step 1: Read ZEP tickets from work item custom field
  const fetchZepTicketsFromWorkItem = async () => {
    setProcessStatus('Reading ZEP tickets from work item...');
    
    try {
      const zepTicketField = await workItemService.getFieldValue('Custom.ZepTickets');
      
      if (zepTicketField) {
        // Parse comma-separated ticket IDs
        const tickets = zepTicketField
          .split(',')
          .map(t => t.trim())
          .filter(t => t.length > 0);
        
        setZepTickets(tickets);
        setSuccess(`Found ${tickets.length} ZEP ticket(s) in work item`);
      } else {
        setError('No ZEP tickets found in Custom.ZepTickets field');
      }
    } catch (err) {
      setError(`Failed to read ZEP tickets: ${err.message}`);
    }
  };

  // Step 2: Fetch time entries from ZEP API
  const fetchTimeEntriesFromZep = async () => {
    if (!zepTickets.length) {
      setError('No ZEP tickets to fetch');
      return;
    }

    if (!credentials.apiKey || !credentials.baseUrl) {
      setShowCredentialDialog(true);
      return;
    }

    setLoading(true);
    setError('');
    setProcessStatus('Fetching time entries from ZEP API...');

    try {
      const allEntries: ZepTimeEntry[] = [];
      
      // Fetch entries for each ticket
      for (let i = 0; i < zepTickets.length; i++) {
        const ticket = zepTickets[i];
        setProcessStatus(`Fetching entries for ticket ${ticket} (${i + 1}/${zepTickets.length})...`);
        
        try {
          const entries = await zepApi.getTimeEntriesForTicket(ticket);
          allEntries.push(...entries);
        } catch (err) {
          console.error(`Failed to fetch entries for ticket ${ticket}:`, err);
          // Continue with other tickets even if one fails
        }
      }

      setTimeEntries(allEntries);
      
      // Calculate total duration
      const total = allEntries.reduce((sum, entry) => sum + entry.duration, 0);
      setTotalDuration(total);
      
      setSuccess(`Found ${allEntries.length} time entries totaling ${total.toFixed(2)} hours`);
      setProcessStatus('');
    } catch (err) {
      setError(`ZEP API Error: ${err.message}`);
      
      // Check if it's a CORS error
      if (err.message.includes('CORS') || err.message.includes('blocked')) {
        setError(
          'CORS Error: The ZEP API is blocking requests from Azure DevOps. ' +
          'Please ensure the ZEP API allows cross-origin requests from dev.azure.com domains.'
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Update work item duration field
  const updateWorkItemDuration = async () => {
    if (totalDuration === 0) {
      setError('No duration to update');
      return;
    }

    setLoading(true);
    setError('');
    setProcessStatus('Updating work item duration field...');

    try {
      await workItemService.updateWorkItemField(workItemId, 'Custom.Duration', totalDuration);
      
      setSuccess(`Successfully updated work item duration to ${totalDuration.toFixed(2)} hours`);
      setProcessStatus('');
      
      // Optionally save the work item
      const saved = await workItemService.saveWorkItem();
      if (saved) {
        setSuccess(`Work item saved with duration: ${totalDuration.toFixed(2)} hours`);
      }
    } catch (err) {
      setError(`Failed to update work item: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Execute all steps in sequence
  const syncAllSteps = async () => {
    setLoading(true);
    setError('');
    
    try {
      // Step 1: Read tickets (already done in initialization)
      if (!zepTickets.length) {
        await fetchZepTicketsFromWorkItem();
      }
      
      // Step 2: Fetch from ZEP
      await fetchTimeEntriesFromZep();
      
      // Step 3: Update work item (automatic after successful fetch)
      if (totalDuration > 0) {
        await updateWorkItemDuration();
      }
    } catch (err) {
      setError(`Sync failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Handle credential submission
  const handleCredentialSubmit = async (apiKey: string, baseUrl: string) => {
    setCredentials({ apiKey, baseUrl });
    zepApi.setCredentials(apiKey, baseUrl);
    
    if (rememberCredentials) {
      await credentialService.saveCredentials(apiKey, baseUrl);
    }
    
    setShowCredentialDialog(false);
    
    // Automatically start fetching after credentials are set
    await fetchTimeEntriesFromZep();
  };

  // Time entries table columns
  const columns = [
    {
      id: 'date',
      name: 'Date',
      renderCell: (row: ZepTimeEntry) => new Date(row.date).toLocaleDateString()
    },
    {
      id: 'ticket',
      name: 'Ticket',
      renderCell: (row: ZepTimeEntry) => row.ticketId
    },
    {
      id: 'employee',
      name: 'Employee',
      renderCell: (row: ZepTimeEntry) => row.employeeName || row.employeeId
    },
    {
      id: 'duration',
      name: 'Duration (hours)',
      renderCell: (row: ZepTimeEntry) => row.duration.toFixed(2)
    },
    {
      id: 'description',
      name: 'Description',
      renderCell: (row: ZepTimeEntry) => row.description || '-'
    }
  ];

  return (
    <div className="zep-time-tracker">
      <div className="tracker-header">
        <h3>ZEP Time Tracking Integration</h3>
        <Button
          text="Settings"
          iconProps={{ iconName: 'Settings' }}
          onClick={() => setShowCredentialDialog(true)}
          disabled={loading}
        />
      </div>

      {/* Status Messages */}
      {error && (
        <MessageCard
          severity={MessageCardSeverity.Error}
          onDismiss={() => setError('')}
        >
          {error}
        </MessageCard>
      )}

      {success && (
        <MessageCard
          severity={MessageCardSeverity.Info}
          onDismiss={() => setSuccess('')}
        >
          {success}
        </MessageCard>
      )}

      {processStatus && (
        <div className="process-status">
          <Spinner size={SpinnerSize.small} />
          <span>{processStatus}</span>
        </div>
      )}

      {/* ZEP Tickets Display */}
      {zepTickets.length > 0 && (
        <div className="zep-tickets-section">
          <h4>ZEP Tickets from Work Item</h4>
          <div className="ticket-chips">
            {zepTickets.map(ticket => (
              <span key={ticket} className="ticket-chip">{ticket}</span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="action-buttons">
        <Button
          text="Fetch Time Entries"
          primary
          onClick={fetchTimeEntriesFromZep}
          disabled={loading || !zepTickets.length || !credentials.apiKey}
        />
        
        <Button
          text="Update Duration"
          onClick={updateWorkItemDuration}
          disabled={loading || totalDuration === 0}
        />
        
        <Button
          text="Sync All Steps"
          onClick={syncAllSteps}
          disabled={loading}
          iconProps={{ iconName: 'Sync' }}
        />
      </div>

      {/* Duration Summary */}
      {totalDuration > 0 && (
        <div className="duration-summary">
          <h4>Total Duration: {totalDuration.toFixed(2)} hours</h4>
          <p>{timeEntries.length} time entries found</p>
        </div>
      )}

      {/* Time Entries Table */}
      {timeEntries.length > 0 && (
        <div className="time-entries-section">
          <h4>Time Entries</h4>
          <Table
            columns={columns}
            items={timeEntries}
            showHeader={true}
          />
        </div>
      )}

      {/* Credential Dialog */}
      {showCredentialDialog && (
        <CredentialDialog
          onSubmit={handleCredentialSubmit}
          onCancel={() => setShowCredentialDialog(false)}
          rememberCredentials={rememberCredentials}
          onRememberChange={setRememberCredentials}
          initialApiKey={credentials.apiKey}
          initialBaseUrl={credentials.baseUrl}
        />
      )}
    </div>
  );
};

// Credential Dialog Component
const CredentialDialog: React.FC<{
  onSubmit: (apiKey: string, baseUrl: string) => void;
  onCancel: () => void;
  rememberCredentials: boolean;
  onRememberChange: (value: boolean) => void;
  initialApiKey?: string;
  initialBaseUrl?: string;
}> = ({ onSubmit, onCancel, rememberCredentials, onRememberChange, initialApiKey = '', initialBaseUrl = 'https://api.zep.de' }) => {
  const [apiKey, setApiKey] = useState(initialApiKey);
  const [baseUrl, setBaseUrl] = useState(initialBaseUrl);

  return (
    <Dialog
      title="ZEP API Configuration"
      onDismiss={onCancel}
      footerButtons={[
        {
          text: 'Cancel',
          onClick: onCancel
        },
        {
          text: 'Save',
          primary: true,
          onClick: () => onSubmit(apiKey, baseUrl),
          disabled: !apiKey || !baseUrl
        }
      ]}
    >
      <div className="credential-dialog-content">
        <FormItem label="ZEP API Base URL">
          <TextField
            value={baseUrl}
            onChange={(e, value) => setBaseUrl(value)}
            placeholder="https://api.zep.de"
          />
        </FormItem>
        
        <FormItem label="ZEP API Key">
          <TextField
            value={apiKey}
            onChange={(e, value) => setApiKey(value)}
            placeholder="Enter your ZEP API key"
            inputType="password"
          />
        </FormItem>
        
        <FormItem>
          <Toggle
            checked={rememberCredentials}
            onChange={(e, checked) => onRememberChange(checked)}
            text="Remember credentials (stored in browser)"
          />
        </FormItem>
        
        <MessageCard severity={MessageCardSeverity.Warning}>
          Note: Credentials are stored in your browser's local storage. 
          Each user needs to configure their own ZEP API credentials.
        </MessageCard>
      </div>
    </Dialog>
  );
};

export default ZepTimeTracker;
```

### 3. ZEP API Service with Direct Browser Calls (src/services/ZepApiService.ts)

```typescript
export class ZepApiService {
  private apiKey: string = '';
  private baseUrl: string = '';
  
  setCredentials(apiKey: string, baseUrl: string): void {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
  }

  /**
   * Get time entries for a specific ticket/project
   * Based on ZEP API documentation: https://developer.zep.de/rest-documentation/attendances/list
   */
  async getTimeEntriesForTicket(ticketId: string): Promise<ZepTimeEntry[]> {
    if (!this.apiKey || !this.baseUrl) {
      throw new Error('ZEP API credentials not configured');
    }

    try {
      // Construct the API endpoint
      const url = `${this.baseUrl}/api/v2/attendances`;
      
      // Calculate date range (last 90 days)
      const toDate = new Date();
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 90);
      
      // Build query parameters
      const params = new URLSearchParams({
        project_id: ticketId,
        from: fromDate.toISOString().split('T')[0],
        to: toDate.toISOString().split('T')[0],
        limit: '1000'
      });

      // Make the API request
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors', // Explicitly set CORS mode
        credentials: 'omit' // Don't send cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Invalid API key. Please check your ZEP credentials.');
        } else if (response.status === 403) {
          throw new Error('Access forbidden. Check your API permissions.');
        } else if (response.status === 404) {
          throw new Error('API endpoint not found. Check the base URL.');
        }
        
        const errorText = await response.text();
        throw new Error(`ZEP API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Transform ZEP API response to our format
      return this.transformZepResponse(data, ticketId);
      
    } catch (error) {
      // Check if it's a CORS error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        throw new Error(
          'CORS Error: Unable to connect to ZEP API. ' +
          'The API needs to allow requests from Azure DevOps domains. ' +
          'Consider using a proxy server or contacting ZEP support to enable CORS.'
        );
      }
      
      throw error;
    }
  }

  /**
   * Transform ZEP API response to our internal format
   */
  private transformZepResponse(data: any, ticketId: string): ZepTimeEntry[] {
    if (!data || !Array.isArray(data.items)) {
      return [];
    }

    return data.items.map((item: any) => ({
      id: item.id,
      ticketId: ticketId,
      employeeId: item.employee?.id || 'unknown',
      employeeName: item.employee?.name || 'Unknown',
      date: item.date,
      startTime: item.start_time,
      endTime: item.end_time,
      duration: this.calculateDuration(item.start_time, item.end_time),
      description: item.description || '',
      project: item.project?.name || ticketId,
      activity: item.activity?.name || '',
      billable: item.billable || false
    }));
  }

  /**
   * Calculate duration in hours from start and end time
   */
  private calculateDuration(startTime: string, endTime: string): number {
    if (!startTime || !endTime) return 0;
    
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    
    const diffMs = end.getTime() - start.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v2/me`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Accept': 'application/json'
        },
        mode: 'cors'
      });

      return response.ok;
    } catch (error) {
      return false;
    }
  }
}
```

### 4. Work Item Service (src/services/WorkItemService.ts)

```typescript
import * as SDK from 'azure-devops-extension-sdk';
import { IWorkItemFormService, WorkItemTrackingServiceIds } from 'azure-devops-extension-api/WorkItemTracking';

export class WorkItemService {
  private formService: IWorkItemFormService | null = null;

  /**
   * Get the work item form service
   */
  private async getFormService(): Promise<IWorkItemFormService> {
    if (!this.formService) {
      this.formService = await SDK.getService<IWorkItemFormService>(
        WorkItemTrackingServiceIds.WorkItemFormService
      );
    }
    return this.formService;
  }

  /**
   * Get field value from work item
   */
  async getFieldValue(fieldName: string): Promise<any> {
    try {
      const service = await this.getFormService();
      const value = await service.getFieldValue(fieldName);
      return value;
    } catch (error) {
      console.error(`Failed to get field ${fieldName}:`, error);
      throw new Error(`Cannot read field ${fieldName}. Ensure it exists in your work item type.`);
    }
  }

  /**
   * Update field value in work item
   */
  async updateWorkItemField(workItemId: number, fieldName: string, value: any): Promise<void> {
    try {
      const service = await this.getFormService();
      
      // Set the field value
      await service.setFieldValue(fieldName, value);
      
      console.log(`Updated field ${fieldName} to ${value}`);
    } catch (error) {
      console.error(`Failed to update field ${fieldName}:`, error);
      throw new Error(`Cannot update field ${fieldName}. Ensure it exists and you have permission.`);
    }
  }

  /**
   * Save the work item
   */
  async saveWorkItem(): Promise<boolean> {
    try {
      const service = await this.getFormService();
      
      // Check if work item has unsaved changes
      const isDirty = await service.isDirty();
      
      if (isDirty) {
        const saved = await service.save();
        return saved;
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save work item:', error);
      throw new Error('Failed to save work item');
    }
  }

  /**
   * Get all field values
   */
  async getAllFields(): Promise<{ [fieldName: string]: any }> {
    try {
      const service = await this.getFormService();
      const fields = await service.getFieldValues();
      return fields;
    } catch (error) {
      console.error('Failed to get all fields:', error);
      return {};
    }
  }
}
```

### 5. Credential Service for Browser Storage (src/services/CredentialService.ts)

```typescript
import * as SDK from 'azure-devops-extension-sdk';
import { CommonServiceIds, IExtensionDataService } from 'azure-devops-extension-api';

export class CredentialService {
  private readonly STORAGE_KEY = 'zep-api-credentials';
  
  /**
   * Get stored credentials from extension data service
   */
  async getCredentials(): Promise<{ apiKey?: string; baseUrl?: string }> {
    try {
      const dataService = await SDK.getService<IExtensionDataService>(
        CommonServiceIds.ExtensionDataService
      );
      
      const credentials = await dataService.getValue(this.STORAGE_KEY, {
        scopeType: 'User' // Store per user
      });
      
      return credentials || {};
    } catch (error) {
      console.error('Failed to load credentials:', error);
      
      // Fallback to localStorage if extension data service fails
      return this.getCredentialsFromLocalStorage();
    }
  }

  /**
   * Save credentials to extension data service
   */
  async saveCredentials(apiKey: string, baseUrl: string): Promise<void> {
    try {
      const dataService = await SDK.getService<IExtensionDataService>(
        CommonServiceIds.ExtensionDataService
      );
      
      await dataService.setValue(this.STORAGE_KEY, {
        apiKey,
        baseUrl,
        updatedAt: new Date().toISOString()
      }, {
        scopeType: 'User'
      });
    } catch (error) {
      console.error('Failed to save credentials:', error);
      
      // Fallback to localStorage
      this.saveCredentialsToLocalStorage(apiKey, baseUrl);
    }
  }

  /**
   * Clear stored credentials
   */
  async clearCredentials(): Promise<void> {
    try {
      const dataService = await SDK.getService<IExtensionDataService>(
        CommonServiceIds.ExtensionDataService
      );
      
      await dataService.setValue(this.STORAGE_KEY, null, {
        scopeType: 'User'
      });
    } catch (error) {
      console.error('Failed to clear credentials:', error);
    }
    
    // Also clear from localStorage
    localStorage.removeItem(this.STORAGE_KEY);
  }

  /**
   * Fallback: Get credentials from localStorage
   */
  private getCredentialsFromLocalStorage(): { apiKey?: string; baseUrl?: string } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      return {};
    }
  }

  /**
   * Fallback: Save credentials to localStorage
   */
  private saveCredentialsToLocalStorage(apiKey: string, baseUrl: string): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify({
        apiKey,
        baseUrl,
        updatedAt: new Date().toISOString()
      }));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
    }
  }
}
```

### 6. CSS Styling (src/workitem-group/ZepTimeTracker.css)

```css
.zep-time-tracker {
  padding: 16px;
  font-family: "Segoe UI VSS (Regular)", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.tracker-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.tracker-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}

.process-status {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--palette-neutral-4);
  border-radius: 4px;
  margin: 12px 0;
}

.zep-tickets-section {
  margin: 16px 0;
  padding: 12px;
  background: var(--palette-neutral-2);
  border-radius: 4px;
}

.zep-tickets-section h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
}

.ticket-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ticket-chip {
  display: inline-block;
  padding: 4px 12px;
  background: var(--palette-primary);
  color: white;
  border-radius: 16px;
  font-size: 12px;
  font-weight: 500;
}

.action-buttons {
  display: flex;
  gap: 8px;
  margin: 16px 0;
  flex-wrap: wrap;
}

.duration-summary {
  padding: 16px;
  background: var(--palette-accent-tint-10);
  border: 1px solid var(--palette-accent-tint-30);
  border-radius: 4px;
  margin: 16px 0;
  text-align: center;
}

.duration-summary h4 {
  margin: 0 0 4px 0;
  color: var(--palette-accent-shade-30);
  font-size: 20px;
}

.duration-summary p {
  margin: 0;
  color: var(--palette-neutral-70);
}

.time-entries-section {
  margin-top: 20px;
}

.time-entries-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
}

.credential-dialog-content {
  padding: 16px;
  min-width: 400px;
}

.credential-dialog-content .form-item {
  margin-bottom: 16px;
}

/* Responsive design */
@media (max-width: 768px) {
  .tracker-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }
  
  .action-buttons {
    flex-direction: column;
    width: 100%;
  }
  
  .action-buttons button {
    width: 100%;
  }
}
```

### 7. Type Definitions (src/types/ZepTypes.ts)

```typescript
export interface ZepTimeEntry {
  id: string;
  ticketId: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  startTime: string;
  endTime: string;
  duration: number; // in hours
  description?: string;
  project?: string;
  activity?: string;
  billable: boolean;
}

export interface ZepApiConfig {
  apiKey: string;
  baseUrl: string;
}

export interface ZepApiError {
  status: number;
  message: string;
  code?: string;
}
```

### 8. HTML Entry Point (src/workitem-group/workitem-group.html)

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ZEP Time Tracker</title>
    <script src="../node_modules/azure-devops-extension-sdk/lib/SDK.min.js"></script>
</head>
<body>
    <div id="root"></div>
    <script type="module" src="workitem-group.js"></script>
</body>
</html>
```

### 9. TypeScript Entry Point (src/workitem-group/workitem-group.tsx)

```typescript
import React from 'react';
import ReactDOM from 'react-dom';
import * as SDK from 'azure-devops-extension-sdk';
import ZepTimeTracker from './ZepTimeTracker';
import './ZepTimeTracker.css';

// Initialize the extension
SDK.init().then(() => {
  SDK.ready().then(() => {
    // Get work item ID from context
    SDK.getConfiguration().then((config: any) => {
      const workItemId = config?.workItemId || 0;
      
      // Render the React component
      ReactDOM.render(
        <ZepTimeTracker workItemId={workItemId} />,
        document.getElementById('root')
      );
    });
  });
});
```

## CORS Configuration Requirements

For this browser-only solution to work, the ZEP API must be configured to allow CORS requests from Azure DevOps domains. The ZEP API needs to return these headers:

```
Access-Control-Allow-Origin: https://dev.azure.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Authorization, Content-Type
Access-Control-Max-Age: 86400
```

If ZEP doesn't support CORS, you have these options:

1. **Request CORS Support**: Contact ZEP support to enable CORS for Azure DevOps domains
2. **Use a CORS Proxy**: Deploy a simple CORS proxy (like cors-anywhere) as an intermediary
3. **Browser Extension**: Install a CORS-enabling browser extension (development only)
4. **Fall back to Backend**: Use the backend proxy solution from the previous response

## Security Considerations

### ⚠️ Important Security Notes:

1. **API Keys in Browser**: This solution stores API keys in the browser, which is less secure than server-side storage
2. **User-Specific Credentials**: Each user must provide their own ZEP API credentials
3. **HTTPS Only**: Ensure all API communications use HTTPS
4. **Limited Scope**: Use API keys with minimal required permissions
5. **Regular Rotation**: Encourage users to rotate API keys regularly

### Recommended Security Practices:

```typescript
// Example: Encrypt credentials before storage
class SecureCredentialService extends CredentialService {
  private encrypt(text: string): string {
    // Simple obfuscation (not true encryption)
    return btoa(encodeURIComponent(text));
  }
  
  private decrypt(text: string): string {
    return decodeURIComponent(atob(text));
  }
  
  async saveCredentials(apiKey: string, baseUrl: string): Promise<void> {
    const encrypted = {
      apiKey: this.encrypt(apiKey),
      baseUrl: baseUrl,
      updatedAt: new Date().toISOString()
    };
    
    await super.saveCredentials(encrypted.apiKey, encrypted.baseUrl);
  }
}
```

## Installation and Configuration

### 1. Build the Extension

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Package the extension
tfx extension create --manifest-globs vss-extension.json
```

### 2. Configure Work Item Fields

Add these custom fields to your work item types:

1. **Custom.ZepTickets** (String): Stores comma-separated ZEP ticket IDs
2. **Custom.Duration** (Decimal): Stores the aggregated duration in hours

### 3. Install the Extension

```bash
# Install to your Azure DevOps organization
tfx extension install --vsix your-extension.vsix --organization https://dev.azure.com/yourorg
```

### 4. User Setup

Each user needs to:
1. Open a work item with ZEP tickets
2. Navigate to the "ZEP Time Tracking" group
3. Click "Settings" and enter their ZEP API credentials
4. Click "Sync All Steps" to fetch and update duration

## Troubleshooting

### Common Issues:

1. **CORS Error**: 
   - The ZEP API doesn't allow requests from Azure DevOps
   - Solution: Use a CORS proxy or backend service

2. **401 Unauthorized**:
   - Invalid API key
   - Solution: Check API key in settings

3. **Field Not Found**:
   - Custom fields don't exist in work item type
   - Solution: Add required fields to process template

4. **No Time Entries Found**:
   - Check date range in API calls
   - Verify ticket IDs exist in ZEP

This browser-only solution eliminates the need for backend infrastructure while providing direct integration between Azure DevOps and ZEP. The main limitation is CORS support from the ZEP API, but the solution includes proper error handling and user feedback for all scenarios.