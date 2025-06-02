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

/**
 * SimulationRobot simulates a robot for testing task flows and MQTT integration.
 * Handles task reception, status updates, and simulates task execution.
 */
export class SimulationRobot {
  /** Unique robot identifier */
  private id: string;
  /** Human-readable robot name */
  private name: string;
  /** MQTT topic for the robot */
  private topic: string;
  /** Current status of the robot */
  private status: SimulationRobotStatus;
  /** Interval handler for periodic status updates */
  private statusInterval: NodeJS.Timeout | null = null;
  /** Whether the robot is currently running */
  private isRunning: boolean = false;
  /** ID of the current task being processed */
  private currentTaskId: string | null = null;

  constructor(id: string, name: string, topic: string) {
    this.id = id;
    this.name = name;
    this.topic = topic;
    this.status = SimulationRobotStatus.IDLE;
  }

  /**
   * Start the simulation robot and begin listening for tasks.
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    simulationMessage(`Robot ${this.id} (${this.name}) started and initializing...`);
    this.subscribeToTaskTopic();
    this.startStatusUpdates();
  }

  /**
   * Subscribe to the robot's task topic for incoming tasks.
   */
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

  /**
   * Start periodic status updates to the MQTT status topic.
   */
  private startStatusUpdates(): void {
    this.statusInterval = setInterval(() => {
      this.sendStatusUpdate();
    }, INTERVALS.STATUS_UPDATE);
  }

  /**
   * Stop the simulation robot and clear intervals.
   */
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

  /**
   * Handle an incoming task message from MQTT.
   * @param message JSON string representing a TaskMessage
   */
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

  /**
   * Parse and validate a task message from JSON.
   * @param message JSON string representing a TaskMessage
   * @returns Parsed TaskMessage or null if invalid
   */
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

  /**
   * Simulate execution of a received task.
   * @param taskMessage TaskMessage to execute
   */
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

  /**
   * Set robot status to PROCESSING for a given task.
   * @param taskId Task ID
   * @param payload Task payload
   */
  private setProcessingStatus(taskId: string, payload: string): void {
    this.status = SimulationRobotStatus.PROCESSING;
    simulationMessage(
      `Robot ${this.id} processing task ${taskId} with payload: ${payload} - status: PROCESSING`
    );
  }

  /**
   * Set robot status to SUCCESS for a completed task.
   * @param taskId Task ID
   */
  private setSuccessStatus(taskId: string): void {
    this.status = SimulationRobotStatus.SUCCESS;
    simulationMessage(`Robot ${this.id} completed task ${taskId} - status: SUCCESS`);
  }

  /**
   * Set robot status to IDLE, ready for new tasks.
   */
  private setIdleStatus(): void {
    this.status = SimulationRobotStatus.IDLE;
    this.currentTaskId = null;
    simulationMessage(`Robot ${this.id} ready for new tasks - status: IDLE`);
  }

  /**
   * Get the current status of the robot.
   * @returns Current SimulationRobotStatus
   */
  public getStatus(): SimulationRobotStatus {
    return this.status;
  }

  /**
   * Get the robot's unique ID.
   * @returns Robot ID
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Get the robot's name.
   * @returns Robot name
   */
  public getName(): string {
    return this.name;
  }

  /**
   * Get the robot's MQTT topic.
   * @returns MQTT topic string
   */
  public getTopic(): string {
    return this.topic;
  }

  /**
   * Get whether the robot is currently running.
   * @returns True if running, false otherwise
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Send a status update to the robot's MQTT status topic.
   */
  private sendStatusUpdate(): void {
    if (!this.isRunning) return;
    const statusMessage = this.createStatusMessage();
    const statusTopic = `${this.topic}/status`;
    this.publishStatusMessage(statusTopic, statusMessage);
  }

  /**
   * Create a status message for publishing to MQTT.
   * @returns StatusMessage object
   */
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

  /**
   * Publish a status message to the MQTT topic.
   * @param topic MQTT topic string
   * @param message StatusMessage to publish
   */
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
