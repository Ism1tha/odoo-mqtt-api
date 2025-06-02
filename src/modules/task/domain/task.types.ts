/**
 * TaskStatus represents the lifecycle state of a task.
 */
export enum TaskStatus {
  PENDING = 'pending', // Task is created and waiting to be processed
  PROCESSING = 'processing', // Task is currently being processed
  COMPLETED = 'completed', // Task completed successfully
  FAILED = 'failed', // Task failed during processing
  CANCELLED = 'cancelled', // Task was cancelled
}

/**
 * TaskPriority defines the urgency of a task.
 */
export enum TaskPriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * TaskRobotStatus represents the status reported by a robot.
 */
export enum TaskRobotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

/**
 * Request payload for creating a new task.
 */
export interface CreateTaskRequest {
  odooProductionId: string; // Odoo manufacturing order/production ID
  mqttTopic: string; // MQTT topic for the robot
  binaryPayload: string; // Task payload (binary, base64, etc.)
  priority?: TaskPriority; // Optional task priority
}

/**
 * TaskResponse represents a task as returned by the API/service.
 */
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

/**
 * Request payload for updating a task's status or error.
 */
export interface UpdateTaskRequest {
  status?: TaskStatus;
  error?: string;
}

/**
 * Filters for querying tasks.
 */
export interface TaskFilters {
  status?: TaskStatus;
  odooProductionId?: string;
}
