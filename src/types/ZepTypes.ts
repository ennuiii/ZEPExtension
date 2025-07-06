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
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface ZepApiError {
  status: number;
  message: string;
  code?: string;
}

// ZEP API Response Types - Updated to match actual API structure
export interface ZepAttendanceItem {
  id: number;
  date: string;
  from: string;
  to: string;
  employee_id: string;
  duration: number;
  note?: string;
  billable: boolean;
  work_location_id?: string;
  activity_id?: string;
  start?: string;
  destination?: string;
  vehicle_id?: string;
  private?: boolean;
  passengers?: string;
  km?: number;
  direction_of_travel?: {
    id: number;
    name: string;
  };
  project_id: number;
  project_task_id?: number;
  invoice_item_id?: number;
  ticket_id?: number;
  subtask_id?: number;
  work_location_is_project_relevant?: boolean;
  department_id?: number;
  project_release?: {
    id: number;
    name: string;
  };
  project_released_at?: string;
  project_released_by?: string;
  created: string;
  modified: string;
}

export interface ZepAttendanceResponse {
  data: ZepAttendanceItem[];
  links?: {
    first?: string;
    last?: string;
    prev?: string;
    next?: string;
  };
  meta?: {
    current_page: number;
    from: number;
    last_page: number;
    links: Array<{
      url?: string;
      label: string;
      active: boolean;
    }>;
    path: string;
    per_page: number;
    to: number;
    total: number;
  };
}

export interface ZepUserInfo {
  id: string;
  name: string;
  email?: string;
}

// Azure DevOps Types
export interface WorkItemField {
  fieldName: string;
  value: any;
}

export interface WorkItemUpdate {
  [fieldName: string]: any;
}

// Internal Application Types
export interface ProcessStatus {
  step: 'reading' | 'fetching' | 'updating' | 'complete' | 'error';
  message: string;
  progress?: number;
  totalSteps?: number;
}

export interface CredentialStorage {
  apiKey: string;
  baseUrl: string;
  updatedAt: string;
}

export interface ExtensionConfiguration {
  zepApiUrl?: string;
  defaultDateRange?: number; // days
  autoSave?: boolean;
  debugMode?: boolean;
}

export interface TimeEntrySummary {
  totalEntries: number;
  totalHours: number;
  ticketIds: string[];
  dateRange: {
    from: string;
    to: string;
  };
}

// Component Props Types
export interface ZepTimeTrackerProps {
  workItemId: number;
}

export interface CredentialDialogProps {
  onSubmit: (apiKey: string, baseUrl: string) => void;
  onCancel: () => void;
  rememberCredentials: boolean;
  onRememberChange: (value: boolean) => void;
  initialApiKey?: string;
  initialBaseUrl?: string;
}

export interface TimeEntriesTableProps {
  entries: ZepTimeEntry[];
  loading?: boolean;
}

// Error Types
export class ZepApiConnectionError extends Error {
  constructor(message: string, public statusCode?: number) {
    super(message);
    this.name = 'ZepApiConnectionError';
  }
}

export class ZepCorsError extends Error {
  constructor(message: string = 'CORS policy blocks this request') {
    super(message);
    this.name = 'ZepCorsError';
  }
}

export class WorkItemFieldError extends Error {
  constructor(fieldName: string, operation: 'read' | 'write') {
    super(`Failed to ${operation} field: ${fieldName}`);
    this.name = 'WorkItemFieldError';
  }
}

// Utility Types
export type ApiCallResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
  details?: any;
};

export type AsyncOperationState = 'idle' | 'loading' | 'success' | 'error';

export interface LoadingState {
  state: AsyncOperationState;
  message?: string;
  error?: string;
} 