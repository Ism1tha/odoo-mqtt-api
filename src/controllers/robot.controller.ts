import express from 'express';
import { Request, Response } from 'express';

import { Robot, RobotStatus } from '../robots/robot.types.js';
import { syncRobotsService } from '../services/robot.service.js';

const router = express.Router();

export async function syncRobots(req: Request, res: Response) {
  try {
    const robots: Array<Robot & { status: RobotStatus }> = req.body;
    await syncRobotsService(robots);
    res.json({ success: true });
  } catch (err) {
    res
      .status(500)
      .json({ error: 'Failed to sync robots', details: err instanceof Error ? err.message : err });
  }
}

export default router;
