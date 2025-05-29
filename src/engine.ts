import express from 'express';

import Robot from '../devices/robot.js';
import terminal from '../src/utils/terminal.js';
import routes from './routes.js';
import { parsePort } from './utils/extra.js';

const { clear, error, engine } = terminal;

const app = express();

app.use(express.json());
app.use('/api', routes);

export function startEngine() {
  try {
    const robot1 = new Robot('robot1', parsePort(process.env.SIMULATE_MQTT_ROBOT1_BIND_PORT, 3001));
    const robot2 = new Robot('robot2', parsePort(process.env.SIMULATE_MQTT_ROBOT2_BIND_PORT, 3002));

    if (process.env.SIMULATE_MQTT_ROBOTS === 'true') {
      robot1.start();
      robot2.start();
    }

    const port = parsePort(process.env.BIND_PORT, 3000);
    app.listen(port, () => {
      engine(`Engine is running on port ${port} and waiting for instructions...`);
    });

    process.on('SIGINT', () => {
      clear();
      engine('Received SIGINT. Shutting down gracefully...');
      setTimeout(() => process.exit(0), 100);
    });
  } catch (ex: unknown) {
    if (ex instanceof Error) {
      error(`Failed to start engine: ${ex.message}`);
    } else {
      error(`Failed to start engine: ${ex}`);
    }
    process.exit(1);
  }
}
