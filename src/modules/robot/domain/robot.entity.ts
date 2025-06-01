import { query, run } from '../../../core/database.js';
import { Robot } from './robot.types.js';

export const addRobot = async (robot: Robot): Promise<void> => {
  await run('INSERT INTO robots (id, name, topic) VALUES (?, ?, ?)', [
    robot.id,
    robot.name,
    robot.topic,
  ]);
};

export const getRobot = async (id: string): Promise<Robot | null> => {
  const rows = await query('SELECT * FROM robots WHERE id = ?', [id]);
  return rows.length > 0 ? (rows[0] as Robot) : null;
};

export const getAllRobots = async (): Promise<Robot[]> => {
  const rows = await query('SELECT * FROM robots');
  return rows as Robot[];
};

export const updateRobot = async (robot: Robot): Promise<void> => {
  await run('UPDATE robots SET name = ?, topic = ? WHERE id = ?', [
    robot.name,
    robot.topic,
    robot.id,
  ]);
};

export const clearAllRobots = async (): Promise<void> => {
  await run('DELETE FROM robots');
};

export const deleteRobot = async (id: string): Promise<void> => {
  await run('DELETE FROM robots WHERE id = ?', [id]);
};
