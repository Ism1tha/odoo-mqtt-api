import { addRobot, deleteRobot, getAllRobots } from '../domain/robot.entity.js';
import { Robot, RobotStatus } from '../domain/robot.types.js';

export async function syncRobots(robots: Array<Robot & { status: RobotStatus }>): Promise<void> {
  if (!Array.isArray(robots)) {
    throw new Error('Invalid robots array');
  }
  const existing = await getAllRobots();
  await Promise.all(existing.map((r) => deleteRobot(r.id)));
  await Promise.all(robots.map((robot) => addRobot(robot)));
}
