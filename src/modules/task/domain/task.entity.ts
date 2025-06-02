import { TaskPriority, TaskStatus } from './task.types.js';

export class Task {
  public readonly id: string;
  public readonly odooProductionId: string;
  public readonly mqttTopic: string;
  public readonly binaryPayload: string;
  public status: TaskStatus;
  public readonly priority: TaskPriority;
  public readonly createdAt: Date;
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

  public updateStatus(status: TaskStatus, error?: string): void {
    this.status = status;
    if (error) {
      this.error = error;
    }
  }

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
