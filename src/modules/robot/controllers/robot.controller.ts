import express from 'express';
import { Request, Response } from 'express';

import { Robot } from '../domain/robot.types.js';
import { syncRobots } from '../services/robot.service.js';

export const robotRouter = express.Router();

robotRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const robots: Array<Robot> = req.body.robots;
    await syncRobots(robots);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({
      error: 'Failed to sync robots',
      details: err instanceof Error ? err.message : err,
    });
  }
});
