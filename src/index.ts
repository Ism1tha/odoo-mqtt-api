import 'dotenv/config';

import { startEngine } from './engine.js';
import { ConsoleColors } from './utils/colors.js';
import terminal from './utils/terminal.js';

const { message, clear } = terminal;

clear();
message('Odoo MQTT API - Press Ctrl+C to exit', ConsoleColors.GREEN);
message('GitHub repository: https://github.com/Ism1tha/odoo-mqtt-api\n', ConsoleColors.DEFAULT);

startEngine();
