import {
  ZepTimeEntry,
  ZepApiConfig,
  ZepAttendanceResponse,
  ZepAttendanceItem,
  ZepUserInfo,
  ZepApiConnectionError,
  ZepCorsError,
  ApiCallResult
} from '../types/ZepTypes';

export class ZepApiService {
  private readonly useProxy: boolean = true; // Always use proxy mode
  private readonly proxyUrl: string = 'https://zepextension.onrender.com/api/zep';

  constructor() {
    console.log('🔧 ZEP API Service Configuration:');
    console.log('  ├─ Mode: PROXY ONLY (credentials managed server-side)');
    console.log('  └─ Proxy URL:', this.proxyUrl);
    console.log('🚨 PROXY MODE ENABLED - All requests go through proxy server');
    console.log('🔑 Authentication handled by proxy server (no client credentials needed)');
  }

  // Legacy method for compatibility - now does nothing
  setCredentials(apiKey?: string, baseUrl?: string, useProxy?: boolean, proxyUrl?: string): void {
    console.log('⚠️ setCredentials called but ignored (proxy-only mode)');
    console.log('🔄 Extension is configured for proxy-only mode');
    console.log('🔑 All credentials are managed server-side');
  }

  /**
   * Get the effective API URL (always uses proxy)
   */
  private getApiUrl(endpoint: string): string {
    return `${this.proxyUrl}${endpoint}`;
  }

  /**
   * Get time entries for a specific ticket/project
   * Based on ZEP API documentation: https://developer.zep.de/rest-documentation/attendances/list
   */
  async getTimeEntriesForTicket(ticketId: string): Promise<ZepTimeEntry[]> {
    try {
      // Construct the API endpoint
      const url = this.getApiUrl('/attendances');
      
      // Build query parameters - using ticket_id as per actual API
      const params = new URLSearchParams({
        ticket_id: ticketId
      });

      console.log(`🔗 ZEP API Request (via proxy): ${url}?${params}`);
      console.log(`🔄 PROXY MODE: All requests go through proxy server`);
      console.log(`🔑 Authentication handled server-side`);

      // Prepare headers for the request (no authentication needed - handled by proxy)
      const headers: HeadersInit = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      
      console.log(`📋 Request headers:`, headers);

      // Make the API request
      const response = await fetch(`${url}?${params}`, {
        method: 'GET',
        headers: headers,
        mode: 'cors', // Always use CORS mode
        credentials: 'omit' // Don't send cookies
      });

      console.log(`📊 Response Status: ${response.status} ${response.statusText}`);

      if (!response.ok) {
        if (response.status === 401) {
          throw new ZepApiConnectionError('Invalid API key. Please check your ZEP credentials.', 401);
        } else if (response.status === 403) {
          throw new ZepApiConnectionError('Access forbidden. Check your API permissions.', 403);
        } else if (response.status === 404) {
          throw new ZepApiConnectionError('API endpoint not found. Check the base URL.', 404);
        }
        
        const errorText = await response.text();
        throw new ZepApiConnectionError(`ZEP API error (${response.status}): ${errorText}`, response.status);
      }

      const data: ZepAttendanceResponse = await response.json();
      console.log(`📋 ZEP API Response:`, data);
      
      // Transform ZEP API response to our format
      return this.transformZepResponse(data, ticketId);
      
    } catch (error) {
      console.error('❌ ZEP API Error:', error);
      
      // Check if it's a CORS error
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const corsMessage = `CORS Error: Cannot connect to proxy server at ${this.proxyUrl}

PROXY SERVER ISSUES:
1. Check if proxy server is running at: ${this.proxyUrl}
2. Verify proxy server allows requests from Azure DevOps domains
3. Check network connectivity to proxy server
4. Try testing proxy health: ${this.proxyUrl.replace('/api/zep', '/health')}

Current configuration:
- Proxy Mode: ENABLED (always)
- Proxy URL: ${this.proxyUrl}
- Server-side authentication: Configured on proxy server`;
        throw new ZepCorsError(corsMessage);
      }
      
      // Re-throw our custom errors
      if (error instanceof ZepApiConnectionError || error instanceof ZepCorsError) {
        throw error;
      }
      
      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new ZepApiConnectionError(`Unexpected error: ${errorMessage}`);
    }
  }

  /**
   * Get time entries for multiple tickets
   */
  async getTimeEntriesForTickets(ticketIds: string[]): Promise<ZepTimeEntry[]> {
    const allEntries: ZepTimeEntry[] = [];
    
    for (const ticketId of ticketIds) {
      try {
        const entries = await this.getTimeEntriesForTicket(ticketId.trim());
        allEntries.push(...entries);
      } catch (error) {
        console.error(`Failed to fetch entries for ticket ${ticketId}:`, error);
        // Continue with other tickets even if one fails
      }
    }
    
    return allEntries;
  }

  /**
   * Transform ZEP API response to our internal format
   */
  private transformZepResponse(data: ZepAttendanceResponse, ticketId: string): ZepTimeEntry[] {
    // The actual API returns data array, not items
    if (!data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((item: ZepAttendanceItem) => ({
      id: item.id.toString(),
      ticketId: ticketId,
      employeeId: item.employee_id,
      employeeName: item.employee_id, // ZEP API doesn't provide name in this endpoint
      date: item.date,
      startTime: item.from,
      endTime: item.to,
      duration: item.duration, // ZEP API provides duration directly
      description: item.note || '',
      project: item.project_id?.toString() || ticketId,
      activity: item.activity_id || '',
      billable: item.billable || false
    }));
  }

  /**
   * Calculate duration in hours from start and end time
   * Note: This is now redundant since ZEP API provides duration directly,
   * but keeping for backward compatibility
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
   * Test API connection (proxy-only mode)
   */
  async testConnection(): Promise<ApiCallResult<ZepUserInfo>> {
    try {
      // Test with a simple attendances call
      const url = this.getApiUrl('/attendances');
      
      // Prepare headers for the request (no authentication needed - handled by proxy)
      const headers: HeadersInit = {
        'Accept': 'application/json'
      };

      console.log(`🧪 TEST: Testing proxy connection to ${url}`);
      
      const response = await fetch(`${url}`, {
        method: 'GET',
        headers: headers,
        mode: 'cors'
      });

      if (!response.ok) {
        return {
          success: false,
          error: `Proxy test failed: ${response.status} ${response.statusText}`,
          details: { status: response.status }
        };
      }

      const testData = await response.json();
      return {
        success: true,
        data: {
          id: 'test-user',
          name: 'Connection successful',
          email: 'API connection verified via proxy server'
        }
      };
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return {
          success: false,
          error: 'CORS Error: Cannot connect to proxy server',
          details: { type: 'cors' }
        };
      }
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Connection test failed: ${errorMessage}`
      };
    }
  }

  /**
   * Get current configuration (proxy-only mode)
   */
  getConfig(): ZepApiConfig | null {
    return {
      apiKey: 'server-managed',
      baseUrl: 'server-managed',
      useProxy: this.useProxy,
      proxyUrl: this.proxyUrl
    };
  }

  /**
   * Clear stored credentials (no-op in proxy-only mode)
   */
  clearCredentials(): void {
    console.log('⚠️ clearCredentials called but ignored (proxy-only mode)');
    // No-op in proxy-only mode
  }
} 