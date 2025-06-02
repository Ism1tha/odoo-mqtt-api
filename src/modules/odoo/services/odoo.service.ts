import { terminal } from '../../../utils/terminal.js';

const { infoMessage, errorMessage } = terminal();

// Types
/**
 * OdooConfig defines the configuration required to connect to the Odoo API.
 */
export interface OdooConfig {
  /** Odoo server host (IP or domain) */
  host: string;
  /** Odoo server port */
  port: string;
  /** Whether authentication is enabled */
  authEnabled: boolean;
  /** Optional authentication password/token */
  authPassword?: string;
}

/**
 * TaskCompletionPayload represents the payload sent to Odoo when notifying about task completion.
 */
export interface TaskCompletionPayload {
  /** Unique task identifier */
  taskId: string;
  /** Odoo manufacturing order/production ID */
  productionId: string;
  /** Task completion status */
  status: 'completed' | 'failed';
  /** Optional error message if task failed */
  error?: string;
}

// Service for interacting with Odoo API endpoints
/**
 * OdooService provides methods to interact with Odoo API endpoints for task completion
 * notifications and manufacturing order status updates.
 */
export class OdooService {
  private config: OdooConfig;

  /**
   * Create a new OdooService instance.
   * @param config Odoo API configuration
   */
  constructor(config: OdooConfig) {
    this.config = config;
  }

  /**
   * Notify Odoo about the completion of a task.
   * @param payload Task completion payload
   * @returns True if notification succeeded, false otherwise
   */
  async notifyTaskCompletion(payload: TaskCompletionPayload): Promise<boolean> {
    try {
      const url = `http://${this.config.host}:${this.config.port}/mqtt-integration/task-completion`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.authEnabled && this.config.authPassword) {
        headers['Authorization'] = `Bearer ${this.config.authPassword}`;
      }
      infoMessage(`Notifying Odoo about task completion: ${payload.taskId} (${payload.status})`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        errorMessage(`Failed to notify Odoo: ${response.status} - ${errorText}`);
        return false;
      }
      infoMessage(`Successfully notified Odoo about task ${payload.taskId} completion`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorMessage(`Error notifying Odoo about task completion: ${errorMsg}`);
      return false;
    }
  }

  /**
   * Update the status of a manufacturing order in Odoo.
   * @param productionId Odoo manufacturing order/production ID
   * @param status New status ('done' or 'failed')
   * @param taskId Optional task ID related to the update
   * @returns True if update succeeded, false otherwise
   */
  async updateManufacturingOrderStatus(
    productionId: string,
    status: 'done' | 'failed',
    taskId?: string
  ): Promise<boolean> {
    try {
      const url = `http://${this.config.host}:${this.config.port}/mqtt-integration/update-production-status`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (this.config.authEnabled && this.config.authPassword) {
        headers['Authorization'] = `Bearer ${this.config.authPassword}`;
      }
      const payload = { productionId, status, taskId };
      infoMessage(`Updating manufacturing order ${productionId} status to ${status}`);
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorText = await response.text();
        errorMessage(
          `Failed to update manufacturing order status: ${response.status} - ${errorText}`
        );
        return false;
      }
      infoMessage(`Successfully updated manufacturing order ${productionId} status to ${status}`);
      return true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      errorMessage(`Error updating manufacturing order status: ${errorMsg}`);
      return false;
    }
  }
}
