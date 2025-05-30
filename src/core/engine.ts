import express from 'express';

import { getAllRobots } from '../modules/robot/domain/robot.entity.js';
import { Robot, RobotStatus, Task } from '../modules/robot/domain/robot.types.js';
import { SimulationRobot } from '../modules/simulation/index.js';
import { parsePort } from '../utils/extra.js';
import { terminal } from '../utils/terminal.js';
import { setupDatabase } from './database.js';
import { apiRouter } from './routes.js';

const { clear, error, engine } = terminal();

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

const simulationRobots: SimulationRobot[] = [];
const robots: Robot[] = [];
const tasks: Task[] = [];

// --- Environment Setup ---
const BIND_PORT = parsePort(process.env.BIND_PORT, 3000);
const SIMULATE_ROBOTS = process.env.SIMULATE_MQTT_ROBOTS === 'true';
const ROBOT1_PORT = parsePort(process.env.SIMULATE_MQTT_ROBOT1_BIND_PORT, 3001);
const ROBOT2_PORT = parsePort(process.env.SIMULATE_MQTT_ROBOT2_BIND_PORT, 3002);

// --- Robot Setup ---
const setupSimulationRobots = async (): Promise<void> => {
  if (!SIMULATE_ROBOTS) return;

  try {
    const robot1 = new SimulationRobot('1', 'robot1', 'robot1/topic', ROBOT1_PORT);
    const robot2 = new SimulationRobot('2', 'robot2', 'robot2/topic', ROBOT2_PORT);

    robot1.start();
    robot2.start();

    simulationRobots.push(robot1, robot2);
  } catch (err) {
    error('Error setting up simulation robots.');
    throw err;
  }
};

// --- Engine Startup ---
export const startEngine = async (): Promise<void> => {
  try {
    await setupDatabase();
    await setupSimulationRobots();

    const dbRobots = await getAllRobots();
    dbRobots.forEach((robot) => {
      robots.push({
        id: robot.id,
        name: robot.name,
        topic: robot.topic,
        status: RobotStatus.UNKNOWN,
      });
    });

    engine(`Total robots in system: ${robots.length}`);

    app.listen(BIND_PORT, () => {
      engine(`Engine is running on port ${BIND_PORT} and waiting for instructions...`);
    });

    setInterval(checkQueue, 30000);

    process.on('SIGINT', () => shutdownEngine());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Failed to start engine: ${message}`);
    process.exit(1);
  }
};

// --- Graceful Shutdown ---
const shutdownEngine = (): void => {
  try {
    clear();
    engine('Received SIGINT. Shutting down gracefully...');
    setTimeout(() => process.exit(0), 100);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    error(`Failed to stop engine: ${message}`);
    process.exit(1);
  }
};

// --- Clear Queue Function ---
export const clearQueue = (): void => {
  tasks.length = 0;
  engine('Tasks queue cleared.');
};

// --- Check current Queue ---
export const checkQueue = (): void => {
  engine(`Checking current queue... ${tasks.length} tasks in queue.`);
};
