import { clearQueue } from '../../../core/engine.js';
import { addRobot, clearAllRobots } from '../domain/robot.entity.js';
import { Robot } from '../domain/robot.types.js';

export const syncRobots = async (robots: Array<Robot>): Promise<void> => {
  await clearAllRobots();
  for (const robot of robots) {
    await addRobot(robot);
  }
  clearQueue();
};
