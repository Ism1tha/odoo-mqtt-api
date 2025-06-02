import { randomUUID } from 'crypto';

import { query, run } from '../../../core/database.js';
import { getMQTTClient, publishMessage } from '../../../core/mqtt.js';
import { terminal } from '../../../utils/terminal.js';
import { Task } from '../domain/task.entity.js';
import {
  CreateTaskRequest,
  TaskFilters,
  TaskPriority,
  TaskResponse,
  TaskStatus,
  UpdateTaskRequest,
} from '../domain/task.types.js';

const { infoMessage, errorMessage } = terminal();

export class TaskService {
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

  async getTaskById(id: string): Promise<TaskResponse | null> {
    const tasks = await this.getTasks();
    return tasks.find((task) => task.id === id) || null;
  }

  async updateTask(id: string, updates: UpdateTaskRequest): Promise<TaskResponse | null> {
    const task = await this.getTaskById(id);
    if (!task) {
      return null;
    }

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

    if (setClauses.length === 0) {
      return task;
    }

    sql += setClauses.join(',') + ' WHERE id = ?';
    params.push(id);

    await run(sql, params);
    return await this.getTaskById(id);
  }

  async deleteTask(id: string): Promise<boolean> {
    const task = await this.getTaskById(id);
    if (!task) {
      return false;
    }

    infoMessage(`Deleting task ${id} with status: ${task.status}`);

    await run('DELETE FROM tasks WHERE id = ?', [id]);
    infoMessage(`Task deleted: ${id} (was ${task.status})`);
    return true;
  }

  async getNextPendingTask(): Promise<TaskResponse | null> {
    const tasks = await this.getTasks({ status: TaskStatus.PENDING });
    return tasks.length > 0 ? tasks[0] : null;
  }

  async processTask(taskId: string): Promise<boolean> {
    try {
      const task = await this.getTaskById(taskId);
      if (!task || task.status !== TaskStatus.PENDING) {
        return false;
      }

      await this.updateTask(taskId, { status: TaskStatus.PROCESSING });

      const mqttClient = getMQTTClient();
      if (!mqttClient) {
        await this.updateTask(taskId, {
          status: TaskStatus.FAILED,
          error: 'MQTT client not available',
        });
        return false;
      }

      await publishMessage(task.mqttTopic, task.binaryPayload);

      await this.updateTask(taskId, { status: TaskStatus.COMPLETED });

      infoMessage(`Task processed successfully: ${taskId}`);
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
