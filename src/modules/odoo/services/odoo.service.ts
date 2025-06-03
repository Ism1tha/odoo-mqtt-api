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
   * Create the headers for Odoo API requests, including authentication if enabled.
   * @returns Headers object for HTTP requests
   */
  private createHeaders(): Record<string, string> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };

    if (this.config.authEnabled && this.config.authPassword) {
      headers['Authorization'] = `Bearer ${this.config.authPassword}`;
    }

    return headers;
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
      const headers = this.createHeaders();
      const payload = { productionId, status, taskId };

      infoMessage(`Updating manufacturing order ${productionId} status to ${status}`);

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();

        if (response.status === 401) {
          errorMessage('Authentication failed when updating manufacturing order status');
          errorMessage('Please check your Odoo authentication configuration');
        } else {
          errorMessage(
            `Failed to update manufacturing order status: ${response.status} - ${errorText}`
          );
        }
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
