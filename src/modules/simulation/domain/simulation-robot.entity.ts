import express from 'express';

import { terminal } from '../../../utils/terminal.js';
import { SimulationRobotStatus } from './simulation-robot.types.js';

const { info } = terminal();

export class SimulationRobot {
  private app: express.Application;
  private status: SimulationRobotStatus;
  private port: number;
  private robotId: string;

  constructor(robotId: string, port: number) {
    this.app = express();
    this.status = SimulationRobotStatus.IDLE;
    this.port = port;
    this.robotId = robotId;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    this.app.post('/start', (req, res) => {
      this.status = SimulationRobotStatus.RUNNING;
      info(`Robot ${this.robotId} started`);
      res.json({
        message: `Robot ${this.robotId} started`,
        status: this.status,
        robotId: this.robotId,
      });
    });

    this.app.post('/stop', (req, res) => {
      this.status = SimulationRobotStatus.IDLE;
      info(`Robot ${this.robotId} stopped`);
      res.json({
        message: `Robot ${this.robotId} stopped`,
        status: this.status,
        robotId: this.robotId,
      });
    });

    this.app.get('/status', (req, res) => {
      res.json({
        status: this.status,
        robotId: this.robotId,
      });
    });
  }

  public start(): void {
    this.app.listen(this.port, () => {
      info(`Robot ${this.robotId} is running on port ${this.port}`);
    });
    this.status = SimulationRobotStatus.RUNNING;
  }

  public stop(): void {
    this.status = SimulationRobotStatus.IDLE;
    info(`Robot ${this.robotId} stopped`);
  }

  public getStatus(): SimulationRobotStatus {
    return this.status;
  }

  public getRobotId(): string {
    return this.robotId;
  }

  public getPort(): number {
    return this.port;
  }
}
