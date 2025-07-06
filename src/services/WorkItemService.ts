import * as SDK from 'azure-devops-extension-sdk';
import { IWorkItemFormService, WorkItemTrackingServiceIds } from 'azure-devops-extension-api/WorkItemTracking';
import { WorkItemFieldError, ApiCallResult } from '../types/ZepTypes';

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
   * Get ZEP ticket IDs from Custom.ZEPNummer field
   */
  async getZepTicketIds(): Promise<ApiCallResult<string[]>> {
    try {
      const service = await this.getFormService();
      const value = await service.getFieldValue('Custom.ZEPNummer');
      
      if (!value) {
        return {
          success: false,
          error: 'No ZEP ticket IDs found in Custom.ZEPNummer field'
        };
      }

      // Parse comma-separated ticket IDs (e.g., "8136, 8403")
      const ticketIds = String(value)
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);

      if (ticketIds.length === 0) {
        return {
          success: false,
          error: 'Custom.ZEPNummer field is empty or contains no valid ticket IDs'
        };
      }

      return {
        success: true,
        data: ticketIds
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to read ZEP tickets: ${errorMessage}`,
        details: error
      };
    }
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
      throw new WorkItemFieldError(fieldName, 'read');
    }
  }

  /**
   * Update CUSTOM.IST field with total duration
   */
  async updateDurationField(totalHours: number): Promise<ApiCallResult<void>> {
    try {
      const service = await this.getFormService();
      
      // Set the field value
      await service.setFieldValue('CUSTOM.IST', totalHours);
      
      console.log(`Updated CUSTOM.IST field to ${totalHours} hours`);
      
      return {
        success: true,
        data: undefined
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Cannot update CUSTOM.IST field: ${errorMessage}. Ensure the field exists and you have permission.`,
        details: error
      };
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
      
      console.log(`Updated field ${fieldName} to ${value} for work item ${workItemId}`);
    } catch (error) {
      console.error(`Failed to update field ${fieldName}:`, error);
      throw new WorkItemFieldError(fieldName, 'write');
    }
  }

  /**
   * Save the work item
   */
  async saveWorkItem(): Promise<ApiCallResult<boolean>> {
    try {
      const service = await this.getFormService();
      
      // Check if work item has unsaved changes
      const isDirty = await service.isDirty();
      
      if (isDirty) {
        await service.save();
        return {
          success: true,
          data: true
        };
      }
      
      return {
        success: true,
        data: true
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to save work item: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Check if work item has unsaved changes
   */
  async hasUnsavedChanges(): Promise<boolean> {
    try {
      const service = await this.getFormService();
      return await service.isDirty();
    } catch (error) {
      console.error('Failed to check if work item has unsaved changes:', error);
      return false;
    }
  }

  /**
   * Get all field values
   */
  async getAllFields(): Promise<ApiCallResult<{ [fieldName: string]: any }>> {
    try {
      const service = await this.getFormService();
      const fields = await service.getFieldValues([]);
      return {
        success: true,
        data: fields
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get all fields: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Get work item ID
   */
  async getWorkItemId(): Promise<ApiCallResult<number>> {
    try {
      const service = await this.getFormService();
      const id = await service.getId();
      return {
        success: true,
        data: id
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Failed to get work item ID: ${errorMessage}`,
        details: error
      };
    }
  }

  /**
   * Validate required fields exist
   */
  async validateRequiredFields(): Promise<ApiCallResult<{ zepField: boolean; durationField: boolean }>> {
    try {
      const allFieldsResult = await this.getAllFields();
      
      if (!allFieldsResult.success) {
        return {
          success: false,
          error: 'Cannot validate fields: ' + allFieldsResult.error
        };
      }

      const fields = allFieldsResult.data;
      const zepField = 'Custom.ZEPNummer' in fields;
      const durationField = 'CUSTOM.IST' in fields;

      return {
        success: true,
        data: {
          zepField,
          durationField
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return {
        success: false,
        error: `Field validation failed: ${errorMessage}`,
        details: error
      };
    }
  }
} 