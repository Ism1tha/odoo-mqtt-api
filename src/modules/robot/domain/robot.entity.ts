import { getDb } from '../../../core/database.js';
import { Robot } from './robot.types.js';

export const addRobot = async (robot: Robot): Promise<void> => {
  const db = getDb();
  await db.run('INSERT INTO robots (id, name, topic) VALUES (?, ?, ?)', [
    robot.id,
    robot.name,
    robot.topic,
  ]);
};

export const getRobot = async (id: string): Promise<Robot | null> => {
  const db = getDb();
  const row = await db.get('SELECT * FROM robots WHERE id = ?', [id]);
  return row || null;
};

export const getAllRobots = async (): Promise<Robot[]> => {
  const db = getDb();
  return db.all('SELECT * FROM robots');
};

export const updateRobot = async (robot: Robot): Promise<void> => {
  const db = getDb();
  await db.run('UPDATE robots SET name = ?, topic = ? WHERE id = ?', [
    robot.name,
    robot.topic,
    robot.id,
  ]);
};

export const clearAllRobots = async (): Promise<void> => {
  const db = getDb();
  await db.run('DELETE FROM robots');
};

export const deleteRobot = async (id: string): Promise<void> => {
  const db = getDb();
  await db.run('DELETE FROM robots WHERE id = ?', [id]);
};
