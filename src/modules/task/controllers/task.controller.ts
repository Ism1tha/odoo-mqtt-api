import express, { Request, Response } from 'express';

import { CreateTaskRequest } from '../domain/task.types.js';
import { TaskService } from '../services/task.service.js';

/**
 * Express router for task-related API endpoints.
 * Provides endpoints for creating and managing tasks.
 */
export const taskRouter = express.Router();
const taskService = new TaskService();

/**
 * POST /tasks
 * Create a new task.
 *
 * Request body: CreateTaskRequest
 * Response: 201 with created TaskResponse, or 400/500 on error
 */
taskRouter.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const taskRequest: CreateTaskRequest = req.body;

    if (!taskRequest.odooProductionId || !taskRequest.mqttTopic || !taskRequest.binaryPayload) {
      res.status(400).json({
        error: 'Missing required fields: odooProductionId, mqttTopic, binaryPayload',
      });
      return;
    }

    const task = await taskService.createTask(taskRequest);
    res.status(201).json(task);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to create task',
      details: err instanceof Error ? err.message : err,
    });
  }
});
