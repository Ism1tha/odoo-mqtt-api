import {
  getMQTTClientStatus,
  MQTTClientStatus,
  publishMessage,
  subscribeToTopic,
  unsubscribeFromTopic,
} from '../../../core/mqtt.js';
import { terminal } from '../../../utils/terminal.js';
import { TaskRobotStatus, TaskStatus } from '../domain/task.types.js';
import { TaskService } from './task.service.js';

const { infoMessage, errorMessage, engineMessage } = terminal();

/**
 * RobotStatus represents the status message sent by a robot over MQTT.
 */
interface RobotStatus {
  /** Robot-reported status (e.g., SUCCESS, ERROR, PROCESSING, IDLE) */
  status: string;
  /** ISO timestamp of the status message */
  timestamp: string;
  /** Optional: ID of the completed task, if applicable */
  completedTaskId?: string;
}

/**
 * RobotInfo holds metadata about a robot being monitored.
 */
interface RobotInfo {
  /** Unique robot identifier */
  robotId: string;
  /** MQTT topic associated with the robot */
  topic: string;
  /** Last time a status message was received from the robot */
  lastSeen: Date;
  /** Current status of the robot */
  currentStatus: string;
  /** Optional: ID of the current task assigned to the robot */
  currentTaskId?: string;
}

/**
 * TaskMonitoringService provides monitoring and health checking for robots and their tasks.
 * Handles MQTT topic subscriptions, robot status updates, and task timeout detection.
 */
export class TaskMonitoringService {
  private static instance: TaskMonitoringService | null = null;
  private taskService: TaskService;
  private subscribedTopics: Set<string> = new Set();
  private robots: Map<string, RobotInfo> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor(taskService: TaskService) {
    this.taskService = taskService;
  }

  /**
   * Get singleton instance of TaskMonitoringService.
   */
  public static getInstance(taskService?: TaskService): TaskMonitoringService {
    if (!TaskMonitoringService.instance && taskService) {
      TaskMonitoringService.instance = new TaskMonitoringService(taskService);
    }
    if (!TaskMonitoringService.instance) {
      throw new Error(
        'TaskMonitoringService not initialized. Call getInstance with taskService first.'
      );
    }
    return TaskMonitoringService.instance;
  }

  /**
   * Start the monitoring service.
   */
  public start(): void {
    if (this.isRunning) {
      engineMessage('Task monitoring service is already running');
      return;
    }
    this.isRunning = true;
    this.startTaskStatusMonitoring();
    engineMessage('Task monitoring service started');
  }

  /**
   * Stop the monitoring service.
   */
  public stop(): void {
    if (!this.isRunning) return;
    this.isRunning = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    this.subscribedTopics.forEach((statusTopic) => {
      try {
        unsubscribeFromTopic(statusTopic);
      } catch (error) {
        errorMessage(`Failed to unsubscribe from topic ${statusTopic}: ${error}`);
      }
    });
    this.subscribedTopics.clear();
    this.robots.clear();
    engineMessage('Task monitoring service stopped');
  }

  /**
   * Subscribe to robot status topics.
   */
  public subscribeToRobotStatusTopics(robotTopics: string[]): void {
    if (getMQTTClientStatus() !== MQTTClientStatus.CONNECTED) {
      errorMessage('Cannot subscribe to robot status topics - MQTT client not connected');
      return;
    }

    robotTopics.forEach((robotTopic) => {
      const statusTopic = `${robotTopic}/status`;
      const robotId = this.extractRobotIdFromTopic(robotTopic);

      // Skip if already tracking this robot
      if (this.subscribedTopics.has(statusTopic) || this.robots.has(robotId)) {
        infoMessage(`Skipping duplicate subscription for robot ${robotId}`);
        return;
      }

      try {
        subscribeToTopic(statusTopic, (message) => {
          this.handleRobotStatusMessage(robotTopic, message);
        });
        this.subscribedTopics.add(statusTopic);
        this.robots.set(robotId, {
          robotId,
          topic: robotTopic,
          lastSeen: new Date(),
          currentStatus: 'UNKNOWN',
        });
        infoMessage(`Subscribed to robot status topic: ${statusTopic}`);
      } catch (error) {
        errorMessage(`Failed to subscribe to robot status topic ${statusTopic}: ${error}`);
      }
    });
  }

  /**
   * Handle incoming robot status message.
   */
  private async handleRobotStatusMessage(robotTopic: string, message: string): Promise<void> {
    try {
      const statusData: RobotStatus = JSON.parse(message);
      const { status, completedTaskId, timestamp } = statusData;

      if (!status || !timestamp) {
        errorMessage(`Invalid robot status message from ${robotTopic}: missing required fields`);
        return;
      }

      const robotId = this.extractRobotIdFromTopic(robotTopic);
      const robotInfo = this.robots.get(robotId);

      if (robotInfo) {
        robotInfo.lastSeen = new Date();
        robotInfo.currentStatus = status;
        robotInfo.currentTaskId = completedTaskId;
      }

      infoMessage(
        `Robot ${robotId} status: ${status}${completedTaskId ? ` (task: ${completedTaskId})` : ''}`
      );

      if (
        (status === TaskRobotStatus.SUCCESS || status === TaskRobotStatus.ERROR) &&
        completedTaskId
      ) {
        this.taskService.handleRobotStatusUpdate(robotId, status, completedTaskId);
        await this.sendRobotAcknowledgment(robotId, completedTaskId, status);
        this.unsubscribeFromRobotTopic(robotTopic, robotId);
      }
    } catch (error) {
      errorMessage(`Error parsing robot status message from ${robotTopic}: ${error}`);
    }
  }

  /**
   * Start periodic monitoring of tasks and robots.
   */
  private startTaskStatusMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.subscribeToActiveTaskRobots();
        await this.checkProcessingTasksTimeout();
        await this.checkRobotHealth();
      } catch (error) {
        errorMessage(`Error in task monitoring cycle: ${error}`);
      }
    }, 15000);
  }

  /**
   * Subscribe to robots with processing tasks.
   */
  private async subscribeToActiveTaskRobots(): Promise<void> {
    try {
      const processingTasks = await this.taskService.getProcessingTasks();
      if (processingTasks.length === 0) return;

      const robotTopics = new Set<string>();
      processingTasks.forEach((task) => {
        const robotTopic = task.mqttTopic.replace(/\/task$/, '');
        robotTopics.add(robotTopic);
      });

      if (robotTopics.size > 0) {
        const newTopics = Array.from(robotTopics).filter((topic) => {
          const statusTopic = `${topic}/status`;
          const robotId = this.extractRobotIdFromTopic(topic);
          return !this.subscribedTopics.has(statusTopic) && !this.robots.has(robotId);
        });

        if (newTopics.length > 0) {
          infoMessage(
            `Discovered ${newTopics.length} new robot(s) from processing tasks: ${newTopics.join(
              ', '
            )}`
          );
          this.subscribeToRobotStatusTopics(newTopics);
        }
      }
    } catch (error) {
      errorMessage(`Error subscribing to active task robots: ${error}`);
    }
  }

  /**
   * Check for processing tasks that have timed out.
   */
  private async checkProcessingTasksTimeout(): Promise<void> {
    try {
      const processingTasks = await this.taskService.getProcessingTasks();
      const now = new Date();
      const timeoutMinutes = 10;
      for (const task of processingTasks) {
        const taskCreatedAt = new Date(task.createdAt);
        const timeDiff = (now.getTime() - taskCreatedAt.getTime()) / (1000 * 60);
        if (timeDiff > timeoutMinutes) {
          await this.taskService.updateTask(task.id, {
            status: TaskStatus.FAILED,
            error: `Task timeout: no robot response after ${timeoutMinutes} minutes`,
          });
          errorMessage(`Task ${task.id} timed out after ${timeoutMinutes} minutes`);
        }
      }
    } catch (error) {
      errorMessage(`Error checking task timeouts: ${error}`);
    }
  }

  /**
   * Check health of all registered robots.
   */
  private async checkRobotHealth(): Promise<void> {
    const now = new Date();
    const healthTimeoutMinutes = 5;
    this.robots.forEach((robotInfo, robotId) => {
      const timeSinceLastSeen = (now.getTime() - robotInfo.lastSeen.getTime()) / (1000 * 60);
      if (timeSinceLastSeen > healthTimeoutMinutes) {
        errorMessage(
          `Robot ${robotId} not responding for ${Math.round(timeSinceLastSeen)} minutes`
        );
      }
    });
  }

  /**
   * Extract robot ID from MQTT topic.
   */
  private extractRobotIdFromTopic(robotTopic: string): string {
    const parts = robotTopic.split('/');
    return parts[parts.length - 1] || robotTopic;
  }

  /**
   * Unsubscribe from a robot's status topic.
   */
  private unsubscribeFromRobotTopic(robotTopic: string, robotId: string): void {
    const statusTopic = `${robotTopic}/status`;
    if (!this.subscribedTopics.has(statusTopic)) return;
    try {
      unsubscribeFromTopic(statusTopic);
      this.subscribedTopics.delete(statusTopic);
      this.robots.delete(robotId);
      infoMessage(
        `Unsubscribed from robot status topic: ${statusTopic} - Robot ${robotId} task completed`
      );
    } catch (error) {
      errorMessage(`Failed to unsubscribe from robot status topic ${statusTopic}: ${error}`);
    }
  }
  /**
   * Send acknowledgment message to robot after task completion.
   * @param robotId Robot identifier
   * @param completedTaskId ID of the completed task
   * @param status Final status (SUCCESS or ERROR)
   */
  private async sendRobotAcknowledgment(
    robotId: string,
    completedTaskId: string,
    status: string
  ): Promise<void> {
    try {
      const robotInfo = this.robots.get(robotId);
      if (!robotInfo) {
        errorMessage(`Cannot send acknowledgment: robot ${robotId} not found in registry`);
        return;
      }

      const ackTopic = `${robotInfo.topic}/ack`;
      const acknowledgment = {
        taskId: completedTaskId,
        status: status,
        timestamp: new Date().toISOString(),
        acknowledged: true,
      };

      await publishMessage(ackTopic, JSON.stringify(acknowledgment));
      infoMessage(
        `Sent acknowledgment to robot ${robotId} for task ${completedTaskId} with status ${status}`
      );
    } catch (error) {
      errorMessage(`Failed to send acknowledgment to robot ${robotId}: ${error}`);
    }
  }

  /**
   * Get current monitoring stats.
   */
  public getMonitoringStats(): {
    isRunning: boolean;
    subscribedTopics: string[];
    robots: { robotId: string; status: string; lastSeen: string; currentTaskId?: string }[];
  } {
    return {
      isRunning: this.isRunning,
      subscribedTopics: Array.from(this.subscribedTopics),
      robots: Array.from(this.robots.values()).map((robot) => ({
        robotId: robot.robotId,
        status: robot.currentStatus,
        lastSeen: robot.lastSeen.toISOString(),
        currentTaskId: robot.currentTaskId,
      })),
    };
  }

  /**
   * Add a robot topic for monitoring.
   */
  public addRobotTopic(robotTopic: string): void {
    this.subscribeToRobotStatusTopics([robotTopic]);
  }

  /**
   * Get all registered robot IDs.
   */
  public getRegisteredRobots(): string[] {
    return Array.from(this.robots.keys());
  }
}
