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
  reconnectPeriod: 10000,
};

if (MQTT_USERNAME && MQTT_PASSWORD) {
  mqttOptions.username = MQTT_USERNAME;
  mqttOptions.password = MQTT_PASSWORD;
}

const client = mqtt.connect(`mqtt://${MQTT_ADDRESS}:${MQTT_PORT}`, mqttOptions);

let isFirstConnection = true;
let clientStatus: MQTTClientStatus = MQTTClientStatus.DISCONNECTED;

export const connectMQTT = (): void => {
  client.on('connect', () => {
    if (isFirstConnection) {
      mqttMessage(`Connected to MQTT broker at ${MQTT_ADDRESS}:${MQTT_PORT}`);
      isFirstConnection = false;
    }
    clientStatus = MQTTClientStatus.CONNECTED;
  });

  client.on('error', () => {
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

export const getMQTTClient = (): mqtt.MqttClient | null => {
  return clientStatus === MQTTClientStatus.CONNECTED ? client : null;
};

export const publishMessage = async (topic: string, message: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (clientStatus !== MQTTClientStatus.CONNECTED) {
      reject(new Error('MQTT client is not connected'));
      return;
    }

    client.publish(topic, message, (error) => {
      if (error) {
        reject(error);
      } else {
        mqttMessage(`Published message to topic ${topic}: ${message}`);
        resolve();
      }
    });
  });
};

export const subscribeToTopic = (topic: string, callback: (message: string) => void): void => {
  if (clientStatus !== MQTTClientStatus.CONNECTED) {
    throw new Error('MQTT client is not connected');
  }

  client.subscribe(topic, (error) => {
    if (error) {
      throw error;
    }
    mqttMessage(`Subscribed to topic: ${topic}`);
  });

  client.on('message', (receivedTopic, message) => {
    if (receivedTopic === topic) {
      callback(message.toString());
    }
  });
};

export const unsubscribeFromTopic = (topic: string): void => {
  if (clientStatus !== MQTTClientStatus.CONNECTED) {
    throw new Error('MQTT client is not connected');
  }

  client.unsubscribe(topic, (error) => {
    if (error) {
      throw error;
    }
    mqttMessage(`Unsubscribed from topic: ${topic}`);
  });
};
