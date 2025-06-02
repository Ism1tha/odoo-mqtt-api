export enum SimulationRobotStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
}

export interface TaskMessage {
  taskId: string;
  payload: string;
}

export interface StatusMessage {
  status: SimulationRobotStatus;
  timestamp: string;
  completedTaskId?: string;
}
