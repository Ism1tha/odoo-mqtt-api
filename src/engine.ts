import express from 'express';

import SimulationRobot from '../devices/robot.js';
import terminal from '../src/utils/terminal.js';
import routes from './routes.js';
import { parsePort } from './utils/extra.js';

const { clear, error, engine } = terminal;

const app = express();
app.use(express.json());
app.use('/api', routes);

const robots: SimulationRobot[] = [];

// --- Environment Setup ---
const BIND_PORT = parsePort(process.env.BIND_PORT, 3000);
const SIMULATE_ROBOTS = process.env.SIMULATE_MQTT_ROBOTS === 'true';
const ROBOT1_PORT = parsePort(process.env.SIMULATE_MQTT_ROBOT1_BIND_PORT, 3001);
const ROBOT2_PORT = parsePort(process.env.SIMULATE_MQTT_ROBOT2_BIND_PORT, 3002);

// --- Robot Setup ---
const setupRobots = (): void => {
  if (!SIMULATE_ROBOTS) return;

  try {
    const robot1 = new SimulationRobot('robot1', ROBOT1_PORT);
    const robot2 = new SimulationRobot('robot2', ROBOT2_PORT);

    robot1.start();
    robot2.start();

    robots.push(robot1, robot2);

    engine(`Simulation robots started on ports ${ROBOT1_PORT}, ${ROBOT2_PORT}`);
  } catch (err) {
    error('Error setting up simulation robots.');
    throw err;
  }
};

// --- Engine Startup ---
export const startEngine = (): void => {
  try {
    setupRobots();

    app.listen(BIND_PORT, () => {
      engine(`Engine is running on port ${BIND_PORT} and waiting for instructions...`);
    });

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
