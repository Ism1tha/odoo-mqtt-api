import express from 'express';

import terminal from '../src/utils/terminal.js';

export enum RobotStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
}

const { info } = terminal;

class Robot {
  private app: express.Application;
  private status: RobotStatus;
  private port: number;
  private robotId: string;

  constructor(robotId: string, port: number) {
    this.app = express();
    this.status = RobotStatus.IDLE;
    this.port = port;
    this.robotId = robotId;
    this.setupRoutes();
  }

  private setupRoutes(): void {
    this.app.use(express.json());

    this.app.post('/start', (req, res) => {
      this.status = RobotStatus.RUNNING;
      info(`Robot ${this.robotId} started`);
      res.json({
        message: `Robot ${this.robotId} started`,
        status: this.status,
        robotId: this.robotId,
      });
    });

    this.app.post('/stop', (req, res) => {
      this.status = RobotStatus.IDLE;
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
    this.status = RobotStatus.RUNNING;
  }

  public stop(): void {
    this.status = RobotStatus.IDLE;
    info(`Robot ${this.robotId} stopped`);
  }

  public getStatus(): RobotStatus {
    return this.status;
  }

  public getRobotId(): string {
    return this.robotId;
  }

  public getPort(): number {
    return this.port;
  }
}

export default Robot;
