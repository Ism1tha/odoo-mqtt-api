import dotenv from 'dotenv';
import { startExpress, stopExpress } from './src/express.js';
import { connectToMqtt, disconnectFromMqtt } from './src/mqtt.js';

dotenv.config();

console.log('Starting application');

try {
    startExpress();
    connectToMqtt();
} catch (e) {
    console.error('Error starting application');
    process.exit(1);
}

process.on('SIGINT', () => {
    console.log('Stopping application');
    stopExpress();
    disconnectFromMqtt();
    process.exit();
});
