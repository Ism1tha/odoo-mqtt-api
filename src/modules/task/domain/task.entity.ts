import { TaskPriority, TaskStatus } from './task.types.js';

/**
 * Task entity representing a manufacturing/robot task.
 * Encapsulates all task properties and provides utility methods for status updates and serialization.
 */
export class Task {
  /** Unique task identifier */
  public readonly id: string;
  /** Odoo manufacturing order/production ID */
  public readonly odooProductionId: string;
  /** MQTT topic for the robot */
  public readonly mqttTopic: string;
  /** Task payload (binary, base64, etc.) */
  public readonly binaryPayload: string;
  /** Current status of the task */
  public status: TaskStatus;
  /** Task priority */
  public readonly priority: TaskPriority;
  /** Task creation timestamp */
  public readonly createdAt: Date;
  /** Optional error message if task failed */
  public error?: string;

  constructor(
    id: string,
    odooProductionId: string,
    mqttTopic: string,
    binaryPayload: string,
    priority: TaskPriority = TaskPriority.NORMAL
  ) {
    this.id = id;
    this.odooProductionId = odooProductionId;
    this.mqttTopic = mqttTopic;
    this.binaryPayload = binaryPayload;
    this.status = TaskStatus.PENDING;
    this.priority = priority;
    this.createdAt = new Date();
  }

  /**
   * Update the status and error of the task.
   * @param status New status for the task
   * @param error Optional error message
   */
  public updateStatus(status: TaskStatus, error?: string): void {
    this.status = status;
    if (error) {
      this.error = error;
    }
  }

  /**
   * Convert the task entity to a response object suitable for API responses.
   * @returns TaskResponse object
   */
  public toResponse(): import('./task.types.js').TaskResponse {
    return {
      id: this.id,
      odooProductionId: this.odooProductionId,
      mqttTopic: this.mqttTopic,
      binaryPayload: this.binaryPayload,
      status: this.status,
      priority: this.priority,
      createdAt: this.createdAt.toISOString(),
      error: this.error,
    };
  }
}
