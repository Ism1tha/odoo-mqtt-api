export interface Robot {
  id: string;
  name: string;
  topic: string;
}

export enum RobotStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
}
