export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface CreateTaskRequest {
  odooProductionId: string;
  mqttTopic: string;
  binaryPayload: string;
  priority?: TaskPriority;
}

export interface TaskResponse {
  id: string;
  odooProductionId: string;
  mqttTopic: string;
  binaryPayload: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  error?: string;
}

export interface UpdateTaskRequest {
  status?: TaskStatus;
  error?: string;
}

export interface TaskFilters {
  status?: TaskStatus;
  odooProductionId?: string;
}
