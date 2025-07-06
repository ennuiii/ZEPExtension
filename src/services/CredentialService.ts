import * as SDK from 'azure-devops-extension-sdk';
import { CommonServiceIds, IExtensionDataService } from 'azure-devops-extension-api';
import { CredentialStorage, ApiCallResult } from '../types/ZepTypes';

export class CredentialService {
  private readonly STORAGE_KEY = 'zep-api-credentials';
  
  /**
   * Get stored credentials from localStorage (primary method)
   */
  async getCredentials(): Promise<ApiCallResult<{ apiKey?: string; baseUrl?: string; useProxy?: boolean; proxyUrl?: string }>> {
    try {
      // Use localStorage as primary storage since we don't have extension data permissions
      const credentials = this.getCredentialsFromLocalStorage();
      return {
        success: true,
        data: credentials
      };
    } catch (error) {
      console.error('Failed to load credentials:', error);
      return {
        success: false,
        error: 'Failed to load stored credentials',
        details: error
      };
    }
  }

  /**
   * Save credentials to localStorage (primary method)
   */
  async saveCredentials(apiKey: string, baseUrl: string, useProxy: boolean = false, proxyUrl: string = ''): Promise<ApiCallResult<void>> {
    try {
      // Use localStorage as primary storage since we don't have extension data permissions
      this.saveCredentialsToLocalStorage(apiKey, baseUrl, useProxy, proxyUrl);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to save credentials: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Clear stored credentials from localStorage
   */
  async clearCredentials(): Promise<ApiCallResult<void>> {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to clear credentials: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Check if credentials are stored
   */
  async hasStoredCredentials(): Promise<boolean> {
    const result = await this.getCredentials();
    if (!result.success) {
      return false;
    }
    
    const { apiKey, baseUrl } = result.data;
    return !!(apiKey && baseUrl);
  }

  /**
   * Encrypt credentials for storage (simple obfuscation)
   */
  private encrypt(text: string): string {
    // Simple obfuscation (not true encryption)
    // For production, consider using stronger encryption
    return btoa(encodeURIComponent(text));
  }

  /**
   * Decrypt credentials from storage
   */
  private decrypt(text: string): string {
    try {
      return decodeURIComponent(atob(text));
    } catch (error) {
      // If decryption fails, assume it's plain text (backwards compatibility)
      return text;
    }
  }

  /**
   * Fallback: Get credentials from localStorage
   */
  private getCredentialsFromLocalStorage(): { apiKey?: string; baseUrl?: string } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const credentials = JSON.parse(stored);
        return {
          apiKey: credentials.apiKey ? this.decrypt(credentials.apiKey) : undefined,
          baseUrl: credentials.baseUrl || undefined
        };
      }
      return {};
    } catch (error) {
      console.error('Failed to read from localStorage:', error);
      return {};
    }
  }

  /**
   * Fallback: Save credentials to localStorage
   */
  private saveCredentialsToLocalStorage(apiKey: string, baseUrl: string, useProxy: boolean = false, proxyUrl: string = ''): void {
    try {
      const credentials = {
        apiKey: this.encrypt(apiKey),
        baseUrl: baseUrl,
        updatedAt: new Date().toISOString()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(credentials));
    } catch (error) {
      console.error('Failed to save to localStorage:', error);
      throw error;
    }
  }

  /**
   * Get credential storage information
   */
  async getStorageInfo(): Promise<ApiCallResult<{
    hasExtensionStorage: boolean;
    hasLocalStorage: boolean;
    lastUpdated?: string;
  }>> {
    let hasExtensionStorage = false;
    let hasLocalStorage = false;
    let lastUpdated: string | undefined;

    // Skip extension data service check since we're using localStorage
    // and we don't have the proper permissions configured
    hasExtensionStorage = false;

    // Check localStorage
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        hasLocalStorage = true;
        const credentials = JSON.parse(stored);
        if (credentials.updatedAt) {
          lastUpdated = credentials.updatedAt;
        }
      }
    } catch (error) {
      console.error('localStorage not available:', error);
    }

    return {
      success: true,
      data: {
        hasExtensionStorage,
        hasLocalStorage,
        lastUpdated
      }
    };
  }
} 