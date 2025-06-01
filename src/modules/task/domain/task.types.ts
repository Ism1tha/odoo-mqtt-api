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
  metadata?: Record<string, unknown>;
}

export interface TaskResponse {
  id: string;
  odooProductionId: string;
  mqttTopic: string;
  binaryPayload: string;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  updatedAt: string;
  processedAt?: string;
  completedAt?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateTaskRequest {
  status?: TaskStatus;
  error?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  odooProductionId?: string;
  mqttTopic?: string;
}
