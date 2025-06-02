import 'dotenv/config';

import { startEngine } from './core/engine.js';
import { ConsoleColors } from './utils/colors.js';
import { terminal } from './utils/terminal.js';

const { message, clear } = terminal();

/**
 * Entry point for the Odoo MQTT API application.
 * Initializes the terminal, displays startup messages, and starts the engine.
 */
clear();
message('Odoo MQTT API - Press Ctrl+C to exit', ConsoleColors.GREEN);
message('GitHub repository: https://github.com/Ism1tha/odoo-mqtt-api\n', ConsoleColors.DEFAULT);

startEngine();
