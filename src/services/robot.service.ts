import { addRobot, deleteRobot, getAllRobots } from '../robots/robot.js';
import { Robot, RobotStatus } from '../robots/robot.types.js';

export async function syncRobotsService(
  robots: Array<Robot & { status: RobotStatus }>
): Promise<void> {
  if (!Array.isArray(robots)) {
    throw new Error('Invalid robots array');
  }
  const existing = await getAllRobots();
  await Promise.all(existing.map((r) => deleteRobot(r.id)));
  await Promise.all(robots.map((robot) => addRobot(robot)));
}
