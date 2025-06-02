/**
 * SimulationRobotStatus represents the possible states of a simulation robot.
 */
export enum SimulationRobotStatus {
  IDLE = 'IDLE', // Robot is idle and ready for tasks
  PROCESSING = 'PROCESSING', // Robot is currently processing a task
  SUCCESS = 'SUCCESS', // Robot has successfully completed a task
  ERROR = 'ERROR', // Robot encountered an error
}

/**
 * TaskMessage represents the structure of a task sent to a simulation robot.
 */
export interface TaskMessage {
  /** Unique identifier for the task */
  taskId: string;
  /** Task payload (e.g., binary, base64, or string data) */
  payload: string;
}

/**
 * StatusMessage represents the status update sent by a simulation robot.
 */
export interface StatusMessage {
  /** Current status of the robot */
  status: SimulationRobotStatus;
  /** ISO timestamp of the status message */
  timestamp: string;
  /** Optional: ID of the completed task, if applicable */
  completedTaskId?: string;
}
