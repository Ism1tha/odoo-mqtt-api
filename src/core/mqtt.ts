import mqtt from 'mqtt';

import { parsePort } from '../utils/extra.js';
import { terminal } from '../utils/terminal.js';

enum MQTTClientStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  RECONNECTING = 'RECONNECTING',
  CLOSED = 'CLOSED',
}

const { mqttMessage, errorMessage } = terminal();

const MQTT_ADDRESS = process.env.MQTT_ADDRESS || 'localhost';
const MQTT_PORT = parsePort(process.env.MQTT_PORT, 1883);

const client = mqtt.connect(`mqtt://${MQTT_ADDRESS}:${MQTT_PORT}`, {
  clientId: 'robot-mqtt-client',
  clean: true,
  connectTimeout: 4000,
  reconnectPeriod: 1000,
});

let clientStatus: MQTTClientStatus = MQTTClientStatus.DISCONNECTED;

export const connectMQTT = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    client.on('connect', () => {
      clientStatus = MQTTClientStatus.CONNECTED;
      mqttMessage(
        `Connected to MQTT broker at ${MQTT_ADDRESS}:${MQTT_PORT}, status: ${clientStatus}`
      );
      resolve();
    });

    client.on('error', (err) => {
      clientStatus = MQTTClientStatus.ERROR;
      errorMessage(`Failed to connect to MQTT broker at ${MQTT_ADDRESS}:${MQTT_PORT}.`);
      reject(err);
    });
  });
};

export const disconnectMQTT = (): Promise<void> => {
  return new Promise((resolve) => {
    if (clientStatus === MQTTClientStatus.CONNECTED) {
      client.end(true, () => {
        clientStatus = MQTTClientStatus.CLOSED;
        mqttMessage(`Disconnected from MQTT broker, status: ${clientStatus}`);
        resolve();
      });
    } else {
      resolve();
    }
  });
};
