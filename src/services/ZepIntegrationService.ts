import { ZepApiService } from './ZepApiService';
import { WorkItemService } from './WorkItemService';
import { CredentialService } from './CredentialService';
import {
  ZepTimeEntry,
  ProcessStatus,
  TimeEntrySummary,
  ApiCallResult,
  ZepApiConnectionError,
  ZepCorsError,
  WorkItemFieldError,
  ZepTicketDetails,
  ZepTicketSummary,
  ZepTimeEntryFilter
} from '../types/ZepTypes';

export class ZepIntegrationService {
  private zepApi: ZepApiService;
  private workItemService: WorkItemService;
  private credentialService: CredentialService;
  private onStatusUpdate?: (status: ProcessStatus) => void;

  constructor() {
    this.zepApi = new ZepApiService();
    this.workItemService = new WorkItemService();
    this.credentialService = new CredentialService();
  }

  /**
   * Set status update callback
   */
  setStatusCallback(callback: (status: ProcessStatus) => void): void {
    this.onStatusUpdate = callback;
  }

  /**
   * Update processing status
   */
  private updateStatus(step: ProcessStatus['step'], message: string, progress?: number, totalSteps?: number): void {
    if (this.onStatusUpdate) {
      this.onStatusUpdate({ step, message, progress, totalSteps });
    }
  }

  /**
   * Main process: Execute complete ZEP integration workflow
   */
  async executeZepIntegration(): Promise<ApiCallResult<TimeEntrySummary>> {
    try {
      this.updateStatus('reading', 'Starting ZEP integration...', 0, 4);

      // Step 1: Get ZEP ticket IDs from work item
      this.updateStatus('reading', 'Reading ZEP ticket IDs from work item...', 1, 4);
      const ticketResult = await this.workItemService.getZepTicketIds();
      
      if (!ticketResult.success) {
        this.updateStatus('error', `Failed to read ZEP tickets: ${ticketResult.error}`);
        return ticketResult;
      }

      const ticketIds = ticketResult.data;
      console.log('Found ZEP ticket IDs:', ticketIds);

      // Step 2: Ensure ZEP API credentials are available
      this.updateStatus('reading', 'Checking ZEP API credentials...', 1.5, 4);
      const credentialsResult = await this.credentialService.getCredentials();
      
      if (!credentialsResult.success) {
        this.updateStatus('error', 'Failed to load ZEP API credentials');
        return {
          success: false,
          error: 'ZEP API credentials not available. Please configure them first.'
        };
      }

      const { apiKey, baseUrl, useProxy, proxyUrl } = credentialsResult.data;
      
      if (!apiKey || !baseUrl) {
        this.updateStatus('error', 'ZEP API credentials are incomplete');
        return {
          success: false,
          error: 'ZEP API credentials are incomplete. Please configure API key and base URL.'
        };
      }

      // Set credentials in ZEP API service
      this.zepApi.setCredentials(apiKey, baseUrl, useProxy, proxyUrl);

      // Step 3: Fetch time entries from ZEP API
      this.updateStatus('fetching', `Fetching time entries for ${ticketIds.length} ZEP tickets...`, 2, 4);
      
      let allTimeEntries: ZepTimeEntry[] = [];
      
      for (let i = 0; i < ticketIds.length; i++) {
        const ticketId = ticketIds[i];
        this.updateStatus(
          'fetching', 
          `Fetching time entries for ticket ${ticketId} (${i + 1}/${ticketIds.length})...`,
          2 + (i / ticketIds.length) * 0.8,
          4
        );
        
        try {
          const entries = await this.zepApi.getTimeEntriesForTicket(ticketId);
          allTimeEntries.push(...entries);
          console.log(`Found ${entries.length} time entries for ticket ${ticketId}`);
        } catch (error) {
          console.error(`Failed to fetch entries for ticket ${ticketId}:`, error);
          
          if (error instanceof ZepCorsError) {
            this.updateStatus('error', 'CORS Error: Cannot connect to ZEP API from browser');
            return {
              success: false,
              error: 'CORS policy prevents direct browser connection to ZEP API. You may need to configure CORS on the ZEP server or use a proxy.',
              details: error
            };
          }
          
          if (error instanceof ZepApiConnectionError) {
            this.updateStatus('error', `ZEP API Error: ${error.message}`);
            return {
              success: false,
              error: `ZEP API Error: ${error.message}`,
              details: error
            };
          }
          
          // Continue with other tickets even if one fails
          console.warn(`Skipping ticket ${ticketId} due to error:`, error);
        }
      }

      if (allTimeEntries.length === 0) {
        this.updateStatus('error', 'No time entries found for any of the ZEP tickets');
        return {
          success: false,
          error: `No time entries found for ZEP tickets: ${ticketIds.join(', ')}`
        };
      }

      // Step 4: Calculate total duration and update work item
      this.updateStatus('updating', 'Calculating total duration and updating work item...', 3, 4);
      
      const totalHours = this.calculateTotalHours(allTimeEntries);
      console.log(`Total hours from ZEP: ${totalHours}`);

      // Update the CUSTOM.IST field with total duration
      const updateResult = await this.workItemService.updateDurationField(totalHours);
      
      if (!updateResult.success) {
        this.updateStatus('error', `Failed to update duration field: ${updateResult.error}`);
        return updateResult;
      }

      // Step 5: Create summary
      const summary: TimeEntrySummary = {
        totalEntries: allTimeEntries.length,
        totalHours: totalHours,
        totalPlannedHours: 0, // Legacy method doesn't fetch planned hours
        ticketSummaries: [], // Legacy method doesn't provide per-ticket summaries
        ticketIds: ticketIds,
        dateRange: this.getDateRange(allTimeEntries)
      };

      this.updateStatus('complete', `Successfully updated work item with ${totalHours} hours from ${allTimeEntries.length} time entries`, 4, 4);
      
      return {
        success: true,
        data: summary
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.updateStatus('error', `Unexpected error: ${errorMessage}`);
      
      return {
        success: false,
        error: `Integration failed: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Test ZEP API connection
   */
  async testZepConnection(): Promise<ApiCallResult<boolean>> {
    try {
      const credentialsResult = await this.credentialService.getCredentials();
      
      if (!credentialsResult.success || !credentialsResult.data.apiKey || !credentialsResult.data.baseUrl) {
        return {
          success: false,
          error: 'ZEP API credentials not configured'
        };
      }

      const { apiKey, baseUrl } = credentialsResult.data;
      this.zepApi.setCredentials(apiKey, baseUrl);

      const testResult = await this.zepApi.testConnection();
      
      if (testResult.success) {
        return {
          success: true,
          data: true
        };
      } else {
        return {
          success: false,
          error: testResult.error || 'Connection test failed'
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Validate Azure DevOps work item fields
   */
  async validateWorkItemFields(): Promise<ApiCallResult<{ zepField: boolean; durationField: boolean }>> {
    try {
      return await this.workItemService.validateRequiredFields();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Field validation failed: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Get preview of time entries without updating work item
   */
  async previewTimeEntries(): Promise<ApiCallResult<ZepTimeEntry[]>> {
    try {
      // Get ZEP ticket IDs
      const ticketResult = await this.workItemService.getZepTicketIds();
      if (!ticketResult.success) {
        return ticketResult;
      }

      // Get credentials
      const credentialsResult = await this.credentialService.getCredentials();
      if (!credentialsResult.success || !credentialsResult.data.apiKey || !credentialsResult.data.baseUrl) {
        return {
          success: false,
          error: 'ZEP API credentials not configured'
        };
      }

      const { apiKey, baseUrl } = credentialsResult.data;
      this.zepApi.setCredentials(apiKey, baseUrl);

      // Fetch time entries
      const timeEntries = await this.zepApi.getTimeEntriesForTickets(ticketResult.data);
      
      return {
        success: true,
        data: timeEntries
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Preview failed: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Calculate total hours from time entries
   */
  private calculateTotalHours(timeEntries: ZepTimeEntry[]): number {
    const total = timeEntries.reduce((sum, entry) => sum + entry.duration, 0);
    return Math.round(total * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get date range from time entries
   */
  private getDateRange(timeEntries: ZepTimeEntry[]): { from: string; to: string } {
    if (timeEntries.length === 0) {
      const today = new Date().toISOString().split('T')[0];
      return { from: today, to: today };
    }

    const dates = timeEntries.map(entry => entry.date).sort();
    return {
      from: dates[0],
      to: dates[dates.length - 1]
    };
  }

  /**
   * Save ZEP API credentials
   */
  async saveCredentials(apiKey: string, baseUrl: string): Promise<ApiCallResult<void>> {
    return await this.credentialService.saveCredentials(apiKey, baseUrl);
  }

  /**
   * Clear ZEP API credentials
   */
  async clearCredentials(): Promise<ApiCallResult<void>> {
    this.zepApi.clearCredentials();
    return await this.credentialService.clearCredentials();
  }

  /**
   * Check if credentials are stored
   */
  async hasStoredCredentials(): Promise<boolean> {
    return await this.credentialService.hasStoredCredentials();
  }

  /**
   * Get time entries for work item with filtering and planned hours support
   */
  async getTimeEntriesForWorkItem(workItemId: string, ticketIds: string[], filter?: ZepTimeEntryFilter): Promise<ApiCallResult<TimeEntrySummary>> {
    try {
      console.log('🔄 Starting ZEP integration for work item:', workItemId);
      console.log('📋 Tickets to fetch:', ticketIds);
      console.log('🔍 Filter applied:', filter);

      // Fetch time entries for all tickets with filtering
      const allTimeEntries = await this.zepApi.getTimeEntriesForTickets(ticketIds, filter);
      
      // Fetch ticket details to get planned hours
      const ticketDetails = await this.zepApi.getTicketsDetails(ticketIds);
      
      // Calculate per-ticket summaries
      const ticketSummaries = this.calculateTicketSummaries(allTimeEntries, ticketDetails);
      
      // Calculate overall summary
      const totalHours = allTimeEntries.reduce((sum, entry) => sum + entry.duration, 0);
      const totalPlannedHours = ticketSummaries.reduce((sum, ticket) => sum + ticket.plannedHours, 0);
      
      const summary: TimeEntrySummary = {
        totalEntries: allTimeEntries.length,
        totalHours,
        totalPlannedHours,
        ticketSummaries,
        ticketIds,
        dateRange: this.getDateRange(allTimeEntries)
      };

      console.log('✅ ZEP integration completed successfully');
      console.log(`📊 Summary: ${totalHours}h actual / ${totalPlannedHours}h planned across ${allTimeEntries.length} entries`);

      return {
        success: true,
        data: summary
      };

    } catch (error) {
      console.error('❌ ZEP Integration Error:', error);
      
      let errorMessage: string;
      let errorDetails: any = {};

      if (error instanceof ZepCorsError) {
        errorMessage = `CORS Error: ${error.message}`;
        errorDetails = { type: 'cors' };
      } else if (error instanceof ZepApiConnectionError) {
        errorMessage = `ZEP API Error: ${error.message}`;
        errorDetails = { statusCode: error.statusCode };
      } else {
        errorMessage = error instanceof Error ? error.message : String(error);
        errorDetails = { type: 'unknown' };
      }

      return {
        success: false,
        error: errorMessage,
        details: errorDetails
      };
    }
  }

  /**
   * Calculate per-ticket summaries with planned vs actual hours
   */
  private calculateTicketSummaries(timeEntries: ZepTimeEntry[], ticketDetails: ZepTicketDetails[]): ZepTicketSummary[] {
    const ticketMap = new Map<string, ZepTicketSummary>();
    
    // Initialize summaries for all tickets (even those without time entries)
    ticketDetails.forEach(ticket => {
      ticketMap.set(ticket.id, {
        ticketId: ticket.id,
        plannedHours: ticket.plannedHours,
        actualHours: 0,
        entryCount: 0,
        ticketDetails: ticket
      });
    });
    
    // Aggregate time entries by ticket
    timeEntries.forEach(entry => {
      const existing = ticketMap.get(entry.ticketId) || {
        ticketId: entry.ticketId,
        plannedHours: 0,
        actualHours: 0,
        entryCount: 0
      };
      
      existing.actualHours += entry.duration;
      existing.entryCount += 1;
      
      ticketMap.set(entry.ticketId, existing);
    });
    
    return Array.from(ticketMap.values());
  }

  /**
   * Apply filters to time entries
   */
  private applyFilters(entries: ZepTimeEntry[], filter: ZepTimeEntryFilter): ZepTimeEntry[] {
    return entries.filter(entry => {
      // Date range filter
      if (filter.dateFrom && entry.date < filter.dateFrom) {
        return false;
      }
      if (filter.dateTo && entry.date > filter.dateTo) {
        return false;
      }
      
      // Ticket ID filter (partial match)
      if (filter.ticketId && !entry.ticketId.toLowerCase().includes(filter.ticketId.toLowerCase())) {
        return false;
      }
      
      // Employee filter
      if (filter.employeeId && entry.employeeId !== filter.employeeId) {
        return false;
      }
      
      return true;
    });
  }

  /**
   * Format duration for display
   */
  formatDuration(hours: number): string {
    if (hours === 0) return '0h';
    if (hours < 1) return `${Math.round(hours * 60)}m`;
    
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    
    if (minutes === 0) return `${wholeHours}h`;
    return `${wholeHours}h ${minutes}m`;
  }

  /**
   * Format date for display (remove time component)
   */
  formatDate(dateString: string): string {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });
    } catch (error) {
      return dateString;
    }
  }

  /**
   * Test ZEP API connection
   */
  async testConnection(): Promise<ApiCallResult<any>> {
    try {
      return await this.zepApi.testConnection();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get ZEP API configuration
   */
  getApiConfig() {
    return this.zepApi.getConfig();
  }
} 