import express, { Request, Response } from 'express';

import { CreateTaskRequest, TaskFilters } from '../domain/task.types.js';
import { TaskService } from '../services/task.service.js';

export const taskRouter = express.Router();
const taskService = new TaskService();

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

taskRouter.get('/', async (req: Request, res: Response) => {
  try {
    const filters: TaskFilters = {
      status: req.query.status as TaskFilters['status'],
      odooProductionId: req.query.odooProductionId as string,
    };

    Object.keys(filters).forEach((key) => {
      if (filters[key as keyof TaskFilters] === undefined) {
        delete filters[key as keyof TaskFilters];
      }
    });

    const tasks = await taskService.getTasks(Object.keys(filters).length > 0 ? filters : undefined);
    res.json(tasks);
  } catch (err) {
    res.status(500).json({
      error: 'Failed to get tasks',
      details: err instanceof Error ? err.message : err,
    });
  }
});

taskRouter.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const taskId = req.params.id;

    if (!taskId) {
      res.status(400).json({
        error: 'Task ID is required',
      });
      return;
    }

    const deleted = await taskService.deleteTask(taskId);

    if (deleted) {
      res.status(200).json({
        message: 'Task deleted successfully',
        taskId: taskId,
      });
    } else {
      res.status(404).json({
        error: 'Task not found',
        taskId: taskId,
      });
    }
  } catch (err) {
    res.status(500).json({
      error: 'Failed to delete task',
      details: err instanceof Error ? err.message : err,
    });
  }
});
