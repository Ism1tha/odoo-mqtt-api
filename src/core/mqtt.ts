import mqtt from 'mqtt';

import { parsePort } from '../utils/extra.js';
import { terminal } from '../utils/terminal.js';

/**
 * MQTTClientStatus represents the connection state of the MQTT client.
 */
export enum MQTTClientStatus {
  CONNECTED = 'CONNECTED',
  DISCONNECTED = 'DISCONNECTED',
  ERROR = 'ERROR',
  RECONNECTING = 'RECONNECTING',
}

const { mqttMessage, errorMessage } = terminal();

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

let clientStatus: MQTTClientStatus = MQTTClientStatus.DISCONNECTED;
let connectionCallbacks: (() => void)[] = [];

/**
 * Connect to the MQTT broker and set up event handlers.
 */
export const connectMQTT = (): void => {
  client.on('connect', () => {
    clientStatus = MQTTClientStatus.CONNECTED;
    mqttMessage(`Connected to MQTT broker at ${MQTT_ADDRESS}:${MQTT_PORT}`);

    const callbacks = [...connectionCallbacks];
    connectionCallbacks = [];
    callbacks.forEach((callback) => {
      try {
        callback();
      } catch (error) {
        errorMessage(`Error executing connection callback: ${error}`);
      }
    });
  });

  client.on('error', (error) => {
    clientStatus = MQTTClientStatus.ERROR;
    errorMessage(`MQTT connection error: ${error.message}`);
  });

  client.on('reconnect', () => {
    clientStatus = MQTTClientStatus.RECONNECTING;
    mqttMessage('Attempting to reconnect to MQTT broker...');
  });

  client.on('disconnect', () => {
    clientStatus = MQTTClientStatus.DISCONNECTED;
    mqttMessage('Disconnected from MQTT broker');
  });
};

/**
 * Register a callback to be called when the MQTT client is connected.
 * @param callback Function to call on connection
 */
export const onMQTTConnected = (callback: () => void): void => {
  if (clientStatus === MQTTClientStatus.CONNECTED) {
    callback();
  } else {
    connectionCallbacks.push(callback);
  }
};

/**
 * Disconnect from the MQTT broker.
 */
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

/**
 * Get the current status of the MQTT client.
 * @returns MQTTClientStatus
 */
export const getMQTTClientStatus = (): MQTTClientStatus => {
  return clientStatus;
};

/**
 * Get the MQTT client instance if connected.
 * @returns mqtt.MqttClient or null
 */
export const getMQTTClient = (): mqtt.MqttClient | null => {
  return clientStatus === MQTTClientStatus.CONNECTED ? client : null;
};

/**
 * Publish a message to a given MQTT topic.
 * @param topic MQTT topic string
 * @param message Message payload (string)
 */
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

/**
 * Subscribe to a given MQTT topic and register a callback for incoming messages.
 * @param topic MQTT topic string
 * @param callback Function to handle received messages
 */
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

/**
 * Unsubscribe from a given MQTT topic.
 * @param topic MQTT topic string
 */
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
