import { TaskPriority, TaskStatus } from './task.types.js';

export class Task {
  public readonly id: string;
  public readonly odooProductionId: string;
  public readonly mqttTopic: string;
  public readonly binaryPayload: string;
  public status: TaskStatus;
  public readonly priority: TaskPriority;
  public readonly createdAt: Date;
  public updatedAt: Date;
  public processedAt?: Date;
  public completedAt?: Date;
  public error?: string;
  public metadata?: Record<string, unknown>;

  constructor(
    id: string,
    odooProductionId: string,
    mqttTopic: string,
    binaryPayload: string,
    priority: TaskPriority = TaskPriority.NORMAL,
    metadata?: Record<string, unknown>
  ) {
    this.id = id;
    this.odooProductionId = odooProductionId;
    this.mqttTopic = mqttTopic;
    this.binaryPayload = binaryPayload;
    this.status = TaskStatus.PENDING;
    this.priority = priority;
    this.createdAt = new Date();
    this.updatedAt = new Date();
    this.metadata = metadata;
  }

  public updateStatus(status: TaskStatus, error?: string): void {
    this.status = status;
    this.updatedAt = new Date();

    if (error) {
      this.error = error;
    }

    if (status === TaskStatus.PROCESSING && !this.processedAt) {
      this.processedAt = new Date();
    }

    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      this.completedAt = new Date();
    }
  }

  public updateMetadata(metadata: Record<string, unknown>): void {
    this.metadata = { ...this.metadata, ...metadata };
    this.updatedAt = new Date();
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
      updatedAt: this.updatedAt.toISOString(),
      processedAt: this.processedAt?.toISOString(),
      completedAt: this.completedAt?.toISOString(),
      error: this.error,
      metadata: this.metadata,
    };
  }
}
