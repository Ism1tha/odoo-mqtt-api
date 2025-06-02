// Types
import { randomUUID } from 'crypto';

import { query, run } from '../../../core/database.js';
import { getMQTTClient, publishMessage } from '../../../core/mqtt.js';
import { terminal } from '../../../utils/terminal.js';
import { OdooConfig, OdooService } from '../../odoo/services/odoo.service.js';
import { Task } from '../domain/task.entity.js';
import {
  CreateTaskRequest,
  TaskFilters,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  UpdateTaskRequest,
} from '../domain/task.types.js';

/**
 * Service for managing manufacturing/robot tasks, including creation, retrieval,
 * updating, deletion, and processing. Integrates with Odoo for task completion
 * notifications and manufacturing order status updates.
 */
const { infoMessage, errorMessage } = terminal();

// Singleton OdooService instance
const odooConfig: OdooConfig = {
  host: process.env.ODOO_HOST || 'localhost',
  port: process.env.ODOO_PORT || '8069',
  authEnabled: process.env.ODOO_AUTH_ENABLED === 'true',
  authPassword: process.env.ODOO_AUTH_PASSWORD,
};
const odooService = new OdooService(odooConfig);

/**
 * TaskService provides methods to create, retrieve, update, delete, and process tasks.
 * It also handles robot status updates and Odoo integration for task completion.
 */
export class TaskService {
  /**
   * Create a new task and persist it to the database.
   * @param request Task creation request payload
   * @returns The created task as a response object
   */
  async createTask(request: CreateTaskRequest): Promise<TaskResponse> {
    const task = new Task(
      randomUUID(),
      request.odooProductionId,
      request.mqttTopic,
      request.binaryPayload,
      request.priority || TaskPriority.NORMAL
    );
    await this.saveTask(task);
    infoMessage(`Task created: ${task.id} for production ${task.odooProductionId}`);
    return task.toResponse();
  }

  /**
   * Retrieve tasks from the database, optionally filtered by status or production ID.
   * @param filters Optional filters for status and production ID
   * @returns Array of task response objects
   */
  async getTasks(filters?: TaskFilters): Promise<TaskResponse[]> {
    let sql = `
      SELECT id, odoo_production_id, mqtt_topic, binary_payload, status, priority,
             created_at, error
      FROM tasks WHERE 1=1
    `;
    const params: unknown[] = [];
    if (filters?.status) {
      sql += ' AND status = ?';
      params.push(filters.status);
    }
    if (filters?.odooProductionId) {
      sql += ' AND odoo_production_id = ?';
      params.push(filters.odooProductionId);
    }
    sql += ' ORDER BY priority DESC, created_at ASC';
    const rows = (await query(sql, params)) as Array<{
      id: string;
      odoo_production_id: string;
      mqtt_topic: string;
      binary_payload: string;
      status: TaskStatus;
      priority: TaskPriority;
      created_at: string;
      error?: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      odooProductionId: row.odoo_production_id,
      mqttTopic: row.mqtt_topic,
      binaryPayload: row.binary_payload,
      status: row.status,
      priority: row.priority,
      createdAt: row.created_at,
      error: row.error,
    }));
  }

  /**
   * Retrieve a single task by its unique ID.
   * @param id Task ID
   * @returns Task response object or null if not found
   */
  async getTaskById(id: string): Promise<TaskResponse | null> {
    const tasks = await this.getTasks();
    return tasks.find((task) => task.id === id) || null;
  }

  /**
   * Update a task's status or error message.
   * @param id Task ID
   * @param updates Fields to update (status, error)
   * @returns Updated task response object or null if not found
   */
  async updateTask(id: string, updates: UpdateTaskRequest): Promise<TaskResponse | null> {
    const task = await this.getTaskById(id);
    if (!task) return null;
    let sql = 'UPDATE tasks SET';
    const params: unknown[] = [];
    const setClauses: string[] = [];
    if (updates.status !== undefined) {
      setClauses.push(' status = ?');
      params.push(updates.status);
    }
    if (updates.error !== undefined) {
      setClauses.push(' error = ?');
      params.push(updates.error);
    }
    if (setClauses.length === 0) return task;
    sql += setClauses.join(',') + ' WHERE id = ?';
    params.push(id);
    await run(sql, params);
    return await this.getTaskById(id);
  }

  /**
   * Delete a task by its ID.
   * @param id Task ID
   * @returns True if deleted, false if not found
   */
  async deleteTask(id: string): Promise<boolean> {
    const task = await this.getTaskById(id);
    if (!task) return false;
    infoMessage(`Deleting task ${id} with status: ${task.status}`);
    await run('DELETE FROM tasks WHERE id = ?', [id]);
    infoMessage(`Task deleted: ${id} (was ${task.status})`);
    return true;
  }

  /**
   * Get the next pending task, ordered by priority and creation time.
   * @returns The next pending task response object or null if none
   */
  async getNextPendingTask(): Promise<TaskResponse | null> {
    const tasks = await this.getTasks({ status: TaskStatus.PENDING });
    return tasks.length > 0 ? tasks[0] : null;
  }

  /**
   * Process a pending task: update status, publish to MQTT, and handle errors.
   * @param taskId Task ID
   * @returns True if processed successfully, false otherwise
   */
  async processTask(taskId: string): Promise<boolean> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task || task.status !== TaskStatus.PENDING) return false;
      await this.updateTask(taskId, { status: TaskStatus.PROCESSING });
      const mqttClient = getMQTTClient();
      if (!mqttClient) {
        await this.updateTask(taskId, {
          status: TaskStatus.FAILED,
          error: 'MQTT client not available',
        });
        return false;
      }
      const taskMessage = { taskId: task.id, payload: task.binaryPayload };
      const robotTaskTopic = `${task.mqttTopic}/task`;
      await publishMessage(robotTaskTopic, JSON.stringify(taskMessage));
      const robotId = this.extractRobotIdFromTopic(task.mqttTopic);
      infoMessage(`Task ${taskId} sent to robot ${robotId} on topic ${robotTaskTopic}`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorMessage(`Error processing task ${taskId}: ${errorMsg}`);
      await this.updateTask(taskId, {
        status: TaskStatus.FAILED,
        error: errorMsg,
      });
      return false;
    }
  }

  /**
   * Extract the robot ID from an MQTT topic string.
   * @param robotTopic MQTT topic string
   * @returns Robot ID
   */
  private extractRobotIdFromTopic(robotTopic: string): string {
    const parts = robotTopic.split('/');
    return parts[parts.length - 1] || robotTopic;
  }

  /**
   * Handle status updates from robots, updating task and Odoo as needed.
   * @param robotId Robot ID
   * @param status Robot-reported status (e.g., SUCCESS, ERROR)
   * @param completedTaskId Optional completed task ID
   */
  async handleRobotStatusUpdate(
    robotId: string,
    status: string,
    completedTaskId?: string
  ): Promise<void> {
    if (status === 'SUCCESS' && completedTaskId) {
      try {
        const task = await this.getTaskById(completedTaskId);
        if (task && task.status === TaskStatus.PROCESSING) {
          await this.updateTask(completedTaskId, { status: TaskStatus.COMPLETED });
          infoMessage(`Task ${completedTaskId} completed by robot ${robotId}`);

          if (odooService) {
            await odooService.updateManufacturingOrderStatus(
              task.odooProductionId,
              'done',
              completedTaskId
            );
          } else {
            errorMessage('Odoo service not available for task completion notification');
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errorMessage(`Error updating task status from robot ${robotId}: ${errorMsg}`);
      }
    } else if (status === 'ERROR' && completedTaskId) {
      try {
        const task = await this.getTaskById(completedTaskId);
        if (task && task.status === TaskStatus.PROCESSING) {
          const errorDescription = `Robot ${robotId} reported error during task execution`;
          await this.updateTask(completedTaskId, {
            status: TaskStatus.FAILED,
            error: errorDescription,
          });
          infoMessage(`Task ${completedTaskId} failed on robot ${robotId}`);

          if (odooService) {
            await odooService.updateManufacturingOrderStatus(
              task.odooProductionId,
              'failed',
              completedTaskId
            );
          } else {
            errorMessage('Odoo service not available for task failure notification');
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        errorMessage(`Error updating failed task status from robot ${robotId}: ${errorMsg}`);
      }
    }
  }

  /**
   * Retrieve all tasks currently in PROCESSING status.
   * @returns Array of processing task response objects
   */
  async getProcessingTasks(): Promise<TaskResponse[]> {
    return await this.getTasks({ status: TaskStatus.PROCESSING });
  }

  /**
   * Persist a new task entity to the database.
   * @param task Task entity to save
   */
  private async saveTask(task: Task): Promise<void> {
    await run(
      `
      INSERT INTO tasks (
        id, odoo_production_id, mqtt_topic, binary_payload, status, priority,
        created_at, error
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
      [
        task.id,
        task.odooProductionId,
        task.mqttTopic,
        task.binaryPayload,
        task.status,
        task.priority,
        task.createdAt.toISOString(),
        task.error,
      ]
    );
  }
}
