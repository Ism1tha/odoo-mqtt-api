import {
  getMQTTClientStatus,
  MQTTClientStatus,
  publishMessage,
  subscribeToTopic,
} from '../../../core/mqtt.js';
import { terminal } from '../../../utils/terminal.js';
import { SimulationRobotStatus, StatusMessage, TaskMessage } from './simulation-robot.types.js';

const { errorMessage, simulationMessage } = terminal();

const INTERVALS = {
  STATUS_UPDATE: 20000,
  TASK_PROCESSING: 15000,
  TASK_COMPLETION_DELAY: 15000,
} as const;

export class SimulationRobot {
  private id: string;
  private name: string;
  private topic: string;
  private status: SimulationRobotStatus;
  private statusInterval: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private currentTaskId: string | null = null;

  constructor(id: string, name: string, topic: string) {
    this.id = id;
    this.name = name;
    this.topic = topic;
    this.status = SimulationRobotStatus.IDLE;
  }

  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    simulationMessage(`Robot ${this.id} (${this.name}) started and initializing...`);
    this.subscribeToTaskTopic();
    this.startStatusUpdates();
  }

  private subscribeToTaskTopic(): void {
    if (getMQTTClientStatus() !== MQTTClientStatus.CONNECTED) {
      errorMessage(
        `Robot ${this.id}: Cannot subscribe to ${this.topic}/task - MQTT client not connected`
      );
      return;
    }

    try {
      subscribeToTopic(`${this.topic}/task`, (message) => {
        this.handleTaskMessage(message);
      });
      simulationMessage(`Robot ${this.id}: Successfully subscribed to ${this.topic}/task`);
    } catch (error) {
      errorMessage(`Robot ${this.id}: Failed to subscribe to ${this.topic}/task: ${error}`);
    }
  }

  private startStatusUpdates(): void {
    this.statusInterval = setInterval(() => {
      this.sendStatusUpdate();
    }, INTERVALS.STATUS_UPDATE);
  }

  public stop(): void {
    this.isRunning = false;
    this.status = SimulationRobotStatus.IDLE;
    this.currentTaskId = null;

    if (this.statusInterval) {
      clearInterval(this.statusInterval);
      this.statusInterval = null;
    }

    simulationMessage(`Robot ${this.id} (${this.name}) stopped`);
  }

  private handleTaskMessage(message: string): void {
    if (this.status !== SimulationRobotStatus.IDLE || !this.isRunning) {
      simulationMessage(
        `Robot ${this.id} is not available to receive tasks (Status: ${this.status}, Running: ${this.isRunning})`
      );
      return;
    }

    try {
      const taskData = this.parseTaskMessage(message);
      if (!taskData) return;

      this.executeTask(taskData);
    } catch (error) {
      simulationMessage(
        `Robot ${this.id} received invalid JSON message: ${message} - Error: ${error}`
      );
    }
  }

  private parseTaskMessage(message: string): TaskMessage | null {
    const taskData = JSON.parse(message);
    const { taskId, payload } = taskData;

    if (!taskId) {
      simulationMessage(`Robot ${this.id} received invalid task: missing taskId`);
      return null;
    }

    if (typeof payload !== 'string') {
      simulationMessage(`Robot ${this.id} received invalid task: payload must be a string`);
      return null;
    }

    simulationMessage(
      `Robot ${this.id} received task ${taskId} from MQTT with payload: ${payload}`
    );

    return { taskId, payload };
  }

  private executeTask(taskMessage: TaskMessage): void {
    const { taskId, payload } = taskMessage;
    this.currentTaskId = taskId;

    this.setProcessingStatus(taskId, payload);

    setTimeout(() => {
      this.setSuccessStatus(taskId);

      setTimeout(() => {
        this.setIdleStatus();
      }, INTERVALS.TASK_COMPLETION_DELAY);
    }, INTERVALS.TASK_PROCESSING);
  }

  private setProcessingStatus(taskId: string, payload: string): void {
    this.status = SimulationRobotStatus.PROCESSING;
    simulationMessage(
      `Robot ${this.id} processing task ${taskId} with payload: ${payload} - status: PROCESSING`
    );
  }

  private setSuccessStatus(taskId: string): void {
    this.status = SimulationRobotStatus.SUCCESS;
    simulationMessage(`Robot ${this.id} completed task ${taskId} - status: SUCCESS`);
  }

  private setIdleStatus(): void {
    this.status = SimulationRobotStatus.IDLE;
    this.currentTaskId = null;
    simulationMessage(`Robot ${this.id} ready for new tasks - status: IDLE`);
  }

  public getStatus(): SimulationRobotStatus {
    return this.status;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getTopic(): string {
    return this.topic;
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }

  private sendStatusUpdate(): void {
    if (!this.isRunning) return;

    const statusMessage = this.createStatusMessage();
    const statusTopic = `${this.topic}/status`;

    this.publishStatusMessage(statusTopic, statusMessage);
  }

  private createStatusMessage(): StatusMessage {
    const statusMessage: StatusMessage = {
      status: this.status,
      timestamp: new Date().toISOString(),
    };

    if (this.status === SimulationRobotStatus.SUCCESS && this.currentTaskId) {
      statusMessage.completedTaskId = this.currentTaskId;
    }

    return statusMessage;
  }

  private publishStatusMessage(topic: string, message: StatusMessage): void {
    if (getMQTTClientStatus() !== MQTTClientStatus.CONNECTED) {
      errorMessage(
        `Robot ${this.id}: Cannot publish status to ${topic} - MQTT client not connected`
      );
      return;
    }

    const messageJson = JSON.stringify(message);

    try {
      publishMessage(topic, messageJson);
    } catch (error) {
      errorMessage(`Robot ${this.id}: Failed to publish status to ${topic}: ${error}`);
    }
  }
}
