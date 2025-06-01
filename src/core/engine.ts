import express from 'express';

import { SimulationRobot } from '../modules/simulation/index.js';
import { TaskService } from '../modules/task/index.js';
import { parsePort } from '../utils/extra.js';
import { terminal } from '../utils/terminal.js';
import { setupDatabase } from './database.js';
import { connectMQTT, getMQTTClientStatus, MQTTClientStatus } from './mqtt.js';
import { apiRouter } from './routes.js';

const { clear, errorMessage, engineMessage, infoMessage } = terminal();

const simulationRobots: SimulationRobot[] = [];
const taskService = new TaskService();

const BIND_PORT = parsePort(process.env.BIND_PORT, 3000);
const SIMULATE_ROBOTS = process.env.SIMULATE_MQTT_ROBOTS === 'true';
const ROBOT1_PORT = parsePort(process.env.SIMULATE_MQTT_ROBOT1_BIND_PORT, 3001);
const ROBOT2_PORT = parsePort(process.env.SIMULATE_MQTT_ROBOT2_BIND_PORT, 3002);

const AUTHENTICATION_ENABLED = process.env.AUTHENTICATION_ENABLED === 'true';
const AUTHENTICATION_PASSWORD = process.env.AUTHENTICATION_PASSWORD;

const authMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void => {
  if (!AUTHENTICATION_ENABLED) {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  const providedPassword = authHeader?.replace('Bearer ', '');

  if (!providedPassword || providedPassword !== AUTHENTICATION_PASSWORD) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  next();
};

const app = express();
app.use(express.json());
app.use('/api', authMiddleware, apiRouter);

const setupSimulationRobots = async (): Promise<void> => {
  if (!SIMULATE_ROBOTS) return;

  try {
    const robot1 = new SimulationRobot('1', 'robot1', 'robot1/topic', ROBOT1_PORT);
    const robot2 = new SimulationRobot('2', 'robot2', 'robot2/topic', ROBOT2_PORT);

    robot1.start();
    robot2.start();

    simulationRobots.push(robot1, robot2);
  } catch (err) {
    errorMessage('Error setting up simulation robots.');
    throw err;
  }
};

export const startEngine = async (): Promise<void> => {
  try {
    await setupDatabase();
    await setupSimulationRobots();

    // TODO: Get pending tasks from the database and add them to the queue

    app.listen(BIND_PORT, () => {
      engineMessage(`Engine is running on port ${BIND_PORT} and waiting for instructions...`);
    });

    setInterval(checkQueue, 15000);

    connectMQTT();

    process.on('SIGINT', () => shutdownEngine());
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errorMessage(`Failed running engine, exiting... ${message}`);
    process.exit(1);
  }
};

const shutdownEngine = (): void => {
  try {
    clear();
    engineMessage('Received SIGINT. Shutting down gracefully...');
    setTimeout(() => process.exit(0), 100);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errorMessage(`Failed to stop engine: ${message}`);
    process.exit(1);
  }
};

export const clearQueue = (): void => {
  infoMessage('Tasks queue cleared.');
  // TODO: Implement actual queue clearing logic - cancel all pending tasks
};

const checkQueue = async (): Promise<void> => {
  if (getMQTTClientStatus() !== MQTTClientStatus.CONNECTED) {
    errorMessage('MQTT client is not connected. Skipping queue check.');
    return;
  }

  try {
    const nextTask = await taskService.getNextPendingTask();
    if (nextTask) {
      infoMessage(`Processing task: ${nextTask.id} for production ${nextTask.odooProductionId}`);
      await taskService.processTask(nextTask.id);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    errorMessage(`Error processing queue: ${message}`);
  }
};
