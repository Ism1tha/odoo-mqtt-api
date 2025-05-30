import express from 'express';

import { terminal } from '../../../utils/terminal.js';
import { SimulationRobotStatus } from './simulation-robot.types.js';

const { info, mqtt } = terminal();

export class SimulationRobot {
  private id: string;
  private name: string;
  private topic: string;
  private status: SimulationRobotStatus;
  private interval: NodeJS.Timeout | null = null;

  private app: express.Application;
  private port: number;

  constructor(id: string, name: string, topic: string, port: number) {
    this.id = id;
    this.name = name;
    this.topic = topic;
    this.status = SimulationRobotStatus.IDLE;

    this.app = express();
    this.port = port;

    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    this.app.post('/start', (req, res) => {
      this.status = SimulationRobotStatus.RUNNING;
      info(`Robot ${this.id} started`);
      res.json({
        message: `Robot ${this.id} started`,
        status: this.status,
        id: this.id,
      });
    });

    this.app.post('/stop', (req, res) => {
      this.status = SimulationRobotStatus.IDLE;
      info(`Robot ${this.id} stopped`);
      res.json({
        message: `Robot ${this.id} stopped`,
        status: this.status,
        id: this.id,
      });
    });

    this.app.get('/status', (req, res) => {
      res.json({
        status: this.status,
        id: this.id,
        name: this.name,
        topic: this.topic,
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      info(`Robot ${this.id} is running on port ${this.port}`);
    });
    this.status = SimulationRobotStatus.RUNNING;
    this.interval = setInterval(this.sendCurrentState.bind(this), 5000);
  }

  public stop(): void {
    this.status = SimulationRobotStatus.IDLE;
    info(`Robot ${this.id} stopped`);
  }

  public getStatus(): SimulationRobotStatus {
    return this.status;
  }

  public getId(): string {
    return this.id;
  }

  public getName(): string {
    return this.name;
  }

  public getTopic(): string {
    return this.topic;
  }

  public getPort(): number {
    return this.port;
  }

  public sendCurrentState(): void {
    mqtt(`Sending to MQTT the current state for robot ${this.id}`);
    // TODO: Implement MQTT publish logic here
  }
}
