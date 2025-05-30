import { getDb } from '../../../core/database.js';
import { Robot } from './robot.types.js';

export async function addRobot(robot: Robot): Promise<void> {
  const db = getDb();
  await db.run('INSERT INTO robots (id, name, topic) VALUES (?, ?, ?)', [
    robot.id,
    robot.name,
    robot.topic,
  ]);
}

export async function getRobot(id: string): Promise<Robot | null> {
  const db = getDb();
  const row = await db.get('SELECT * FROM robots WHERE id = ?', [id]);
  return row || null;
}

export async function getAllRobots(): Promise<Robot[]> {
  const db = getDb();
  return db.all('SELECT * FROM robots');
}

export async function updateRobot(robot: Robot): Promise<void> {
  const db = getDb();
  await db.run('UPDATE robots SET name = ?, topic = ? WHERE id = ?', [
    robot.name,
    robot.topic,
    robot.id,
  ]);
}

export async function deleteRobot(id: string): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM robots WHERE id = ?', [id]);
}
