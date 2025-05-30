export interface Robot {
  id: string;
  name: string;
  topic: string;
  status: RobotStatus;
}

export interface Task {
  id: string;
  binary_sequence: string;
  robot_id: string;
}

export enum RobotStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  UNKNOWN = 'UNKNOWN',
}
