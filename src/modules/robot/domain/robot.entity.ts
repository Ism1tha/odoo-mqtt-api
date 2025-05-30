import { getDb } from '../../../core/database.js';
import { Robot, RobotStatus } from './robot.types.js';

export async function addRobot(robot: Robot & { status: RobotStatus }): Promise<void> {
  const db = getDb();
  await db.run('INSERT INTO robots (id, name, topic, status) VALUES (?, ?, ?, ?)', [
    robot.id,
    robot.name,
    robot.topic,
    robot.status,
  ]);
}

export async function getRobot(id: string): Promise<(Robot & { status: RobotStatus }) | null> {
  const db = getDb();
  const row = await db.get('SELECT * FROM robots WHERE id = ?', [id]);
  return row || null;
}

export async function getAllRobots(): Promise<Array<Robot & { status: RobotStatus }>> {
  const db = getDb();
  return db.all('SELECT * FROM robots');
}

export async function updateRobot(robot: Robot & { status: RobotStatus }): Promise<void> {
  const db = getDb();
  await db.run('UPDATE robots SET name = ?, topic = ?, status = ? WHERE id = ?', [
    robot.name,
    robot.topic,
    robot.status,
    robot.id,
  ]);
}

export async function deleteRobot(id: string): Promise<void> {
  const db = getDb();
  await db.run('DELETE FROM robots WHERE id = ?', [id]);
}
