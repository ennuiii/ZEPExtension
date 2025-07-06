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
  private apiKey: string = '';
  private baseUrl: string = '';
  private useProxy: boolean = true; // Default to proxy mode to avoid CORS issues
  private proxyUrl: string = 'https://zepextension.onrender.com/api/zep';
  
  setCredentials(apiKey: string, baseUrl: string, useProxy: boolean = false, proxyUrl?: string): void {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.useProxy = useProxy;
    if (proxyUrl) {
      this.proxyUrl = proxyUrl.replace(/\/$/, ''); // Remove trailing slash
    }
    
    // Debug configuration
    console.log('🔧 ZEP API Service Configuration Updated:');
    console.log('  ├─ API Key:', this.apiKey ? `${this.apiKey.substring(0, 8)}...` : 'NOT SET');
    console.log('  ├─ Base URL:', this.baseUrl || 'NOT SET');
    console.log('  ├─ Use Proxy:', this.useProxy);
    console.log('  └─ Proxy URL:', this.proxyUrl);
    
    if (this.useProxy) {
      console.log('🚨 PROXY MODE ENABLED - All requests will go through proxy server');
      console.log('📡 Proxy Server URL:', this.proxyUrl);
      console.log('🔀 Proxy will forward to:', this.baseUrl);
    } else {
      console.log('🚨 DIRECT MODE - Requests will go directly to ZEP API (may cause CORS issues)');
      console.log('🎯 Direct API URL:', this.baseUrl);
    }
  }

  /**
   * Get the effective API URL based on proxy settings
   */
  private getApiUrl(endpoint: string): string {
    if (this.useProxy) {
      return `${this.proxyUrl}${endpoint}`;
    }
    return `${this.baseUrl}/api/v1${endpoint}`;
  }

  /**
   * Get time entries for a specific ticket/project
   * Based on ZEP API documentation: https://developer.zep.de/rest-documentation/attendances/list
   */
  async getTimeEntriesForTicket(ticketId: string): Promise<ZepTimeEntry[]> {
    if (!this.apiKey || !this.baseUrl) {
      throw new ZepApiConnectionError('ZEP API credentials not configured');
    }

    try {
      // Construct the API endpoint
      const url = this.getApiUrl('/attendances');
      
      // Build query parameters - using ticket_id as per actual API
      const params = new URLSearchParams({
        ticket_id: ticketId
      });

      console.log(`🔗 ZEP API Request: ${url}?${params}`);
      console.log(`📡 Using proxy: ${this.useProxy}`);
      console.log(`🌐 Proxy URL: ${this.proxyUrl}`);
      console.log(`🏢 Base URL: ${this.baseUrl}`);
      console.log(`🔑 API Key: ${this.apiKey.substring(0, 8)}...`);
      
      if (this.useProxy) {
        console.log(`🔄 PROXY MODE: Forwarding request through proxy server`);
        console.log(`📤 Proxy will forward to: ${this.baseUrl}/api/v1${'/attendances'}`);
      } else {
        console.log(`🔄 DIRECT MODE: Making direct API call to ZEP server`);
      }

      // Prepare headers for the request
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      // When using proxy, send the base URL as a header
      if (this.useProxy) {
        headers['X-ZEP-Base-URL'] = this.baseUrl;
        console.log(`📨 Adding X-ZEP-Base-URL header: ${this.baseUrl}`);
      }
      
      console.log(`📋 Request headers:`, Object.keys(headers).reduce((acc, key) => {
        acc[key] = key === 'Authorization' ? 'Bearer ***' : headers[key];
        return acc;
      }, {} as any));

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
        const corsMessage = this.useProxy 
          ? `CORS Error: Cannot connect to proxy server at ${this.proxyUrl}

PROXY SERVER ISSUES:
1. Check if proxy server is running at: ${this.proxyUrl}
2. Verify proxy server allows requests from Azure DevOps domains
3. Check network connectivity to proxy server
4. Try testing proxy health: ${this.proxyUrl.replace('/api/zep', '/health')}

Current configuration:
- Proxy Mode: ${this.useProxy ? 'ENABLED' : 'DISABLED'}
- Proxy URL: ${this.proxyUrl}
- ZEP Base URL: ${this.baseUrl}`
          : `CORS Error: Cannot connect to ZEP API directly. 

RECOMMENDED FIX: Enable proxy mode in extension settings!
Proxy URL: https://zepextension.onrender.com/api/zep

OTHER FIXES:
1. Install a CORS browser extension (CORS Unblock for Chrome/Edge)
2. Ask your ZEP admin to whitelist Azure DevOps domains
3. Use browser with --disable-web-security flag (temporary)

See CORS_WORKAROUND.md for detailed instructions.`;
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
   * Test API connection
   */
  async testConnection(): Promise<ApiCallResult<ZepUserInfo>> {
    if (!this.apiKey || !this.baseUrl) {
      return {
        success: false,
        error: 'API credentials not configured'
      };
    }

    try {
      // Test with a simple attendances call
      const url = this.getApiUrl('/attendances');
      
      // Prepare headers for the request
      const headers: HeadersInit = {
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'application/json'
      };

      // When using proxy, send the base URL as a header
      if (this.useProxy) {
        headers['X-ZEP-Base-URL'] = this.baseUrl;
        console.log(`🧪 TEST: Adding X-ZEP-Base-URL header: ${this.baseUrl}`);
      }
      
      console.log(`🧪 TEST: Request headers:`, Object.keys(headers).reduce((acc, key) => {
        acc[key] = key === 'Authorization' ? 'Bearer ***' : headers[key];
        return acc;
      }, {} as any));

      const response = await fetch(`${url}`, {
        method: 'GET',
        headers: headers,
        mode: 'cors'
      });

      if (!response.ok) {
        return {
          success: false,
          error: `API test failed: ${response.status} ${response.statusText}`,
          details: { status: response.status }
        };
      }

      const testData = await response.json();
      return {
        success: true,
        data: {
          id: 'test-user',
          name: 'Connection successful',
          email: `API connection verified ${this.useProxy ? '(via proxy)' : '(direct)'}`
        }
      };
    } catch (error) {
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        const corsMessage = this.useProxy 
          ? 'CORS Error: Cannot connect to proxy server'
          : 'CORS Error: Cannot connect to ZEP API directly. Try enabling proxy mode.';
        return {
          success: false,
          error: corsMessage,
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
   * Get current configuration
   */
  getConfig(): ZepApiConfig | null {
    if (!this.apiKey || !this.baseUrl) {
      return null;
    }
    return {
      apiKey: this.apiKey,
      baseUrl: this.baseUrl,
      useProxy: this.useProxy,
      proxyUrl: this.proxyUrl
    };
  }

  /**
   * Clear stored credentials
   */
  clearCredentials(): void {
    this.apiKey = '';
    this.baseUrl = '';
    this.useProxy = false;
  }
} 