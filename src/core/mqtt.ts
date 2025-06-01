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

const MQTT_ADDRESS = process.env.MQTT_BRORKER_ADDRESS || 'localhost';
const MQTT_PORT = parsePort(process.env.MQTT_BRORKER_PORT, 1883);
const MQTT_USERNAME = process.env.MQTT_BRORKER_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_BRORKER_PASSWORD;

const mqttOptions: mqtt.IClientOptions = {
  clientId: 'robot-mqtt-client',
  clean: true,
  connectTimeout: 3000,
  reconnectPeriod: 1000,
};

if (MQTT_USERNAME && MQTT_PASSWORD) {
  mqttOptions.username = MQTT_USERNAME;
  mqttOptions.password = MQTT_PASSWORD;
}

const client = mqtt.connect(`mqtt://${MQTT_ADDRESS}:${MQTT_PORT}`, mqttOptions);

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
