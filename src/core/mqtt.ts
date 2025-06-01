import mqtt from 'mqtt';

import { parsePort } from '../utils/extra.js';
import { terminal } from '../utils/terminal.js';

export enum MQTTClientStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  RECONNECTING = 'RECONNECTING',
}

const { mqttMessage } = terminal();

const MQTT_ADDRESS = process.env.MQTT_ADDRESS || 'localhost';
const MQTT_PORT = parsePort(process.env.MQTT_PORT, 1883);

const client = mqtt.connect(`mqtt://${MQTT_ADDRESS}:${MQTT_PORT}`, {
  clientId: 'robot-mqtt-client',
  clean: true,
  connectTimeout: 3000,
  reconnectPeriod: 1000,
});

let clientStatus: MQTTClientStatus = MQTTClientStatus.DISCONNECTED;

export const connectMQTT = (): void => {
  client.once('connect', () => {
    clientStatus = MQTTClientStatus.CONNECTED;
    mqttMessage(`Connected to MQTT broker at ${MQTT_ADDRESS}:${MQTT_PORT}`);
  });

  client.once('error', () => {
    clientStatus = MQTTClientStatus.ERROR;
  });

  client.on('reconnect', () => {
    clientStatus = MQTTClientStatus.RECONNECTING;
  });
};

export const disconnectMQTT = (): void => {
  if (clientStatus === MQTTClientStatus.CONNECTED || clientStatus === MQTTClientStatus.ERROR) {
    client.end(false, () => {
      clientStatus = MQTTClientStatus.DISCONNECTED;
      mqttMessage(`Disconnected from MQTT broker, status: ${clientStatus}`);
    });
  } else {
    mqttMessage('MQTT client not connected; nothing to disconnect.');
  }
};

export const getMQTTClientStatus = (): MQTTClientStatus => {
  return clientStatus;
};
