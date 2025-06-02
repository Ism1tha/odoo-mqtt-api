import express from 'express';

import { SimulationRobot } from '../modules/simulation/index.js';
import { TaskMonitoringService, TaskService } from '../modules/task/index.js';
import { parsePort } from '../utils/extra.js';
import { terminal } from '../utils/terminal.js';
import { setupDatabase } from './database.js';
import { connectMQTT, getMQTTClientStatus, MQTTClientStatus, onMQTTConnected } from './mqtt.js';
import { apiRouter } from './routes.js';

const { clear, errorMessage, engineMessage, infoMessage, simulationMessage } = terminal();

const simulationRobots: SimulationRobot[] = [];
const taskService = new TaskService();

const taskMonitoringService = TaskMonitoringService.getInstance(taskService);

const BIND_PORT = parsePort(process.env.BIND_PORT, 3000);
const SIMULATE_ROBOTS = process.env.SIMULATE_MQTT_ROBOTS === 'true';

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

export const setupSimulationRobots = async (): Promise<void> => {
  if (!SIMULATE_ROBOTS) {
    infoMessage('Simulation robots are disabled. Set SIMULATE_MQTT_ROBOTS=true to enable.');
    return;
  }

  if (simulationRobots.length > 0) {
    simulationMessage('Simulation robots already setup, skipping...');
    return;
  }

  try {
    const robot1 = new SimulationRobot('1', 'robot1', 'F1/W1/PKG1/0x1');
    const robot2 = new SimulationRobot('2', 'robot2', 'F1/W1/PKG1/0x2');

    robot1.start();
    robot2.start();

    simulationRobots.push(robot1, robot2);

    simulationMessage(`Simulation robots started: ${robot1.getName()}, ${robot2.getName()}`);
    infoMessage(
      'Robot monitoring service will automatically discover and monitor these robots when tasks are sent to them'
    );
  } catch (err) {
    errorMessage('Error setting up simulation robots.');
    throw err;
  }
};

export const startEngine = async (): Promise<void> => {
  try {
    await setupDatabase();

    app.listen(BIND_PORT, () => {
      engineMessage(`Engine is running on port ${BIND_PORT} and waiting for instructions...`);
    });

    setInterval(checkQueue, 15000);

    connectMQTT();

    onMQTTConnected(() => {
      taskMonitoringService.start();

      setupSimulationRobots().catch((error) => {
        errorMessage(`Failed to setup simulation robots: ${error}`);
      });
    });

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

    taskMonitoringService.stop();

    simulationRobots.forEach((robot) => {
      try {
        robot.stop();
      } catch (error) {
        errorMessage(`Error stopping robot ${robot.getId()}: ${error}`);
      }
    });

    setTimeout(() => process.exit(0), 100);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    errorMessage(`Failed to stop engine: ${message}`);
    process.exit(1);
  }
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
