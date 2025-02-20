import mqtt from "mqtt";

var mqttClient = null;

export const connectToMqtt = () => {
    console.log(`Connecting to MQTT broker at mqtt://${process.env.MQTT_BRORKER_ADDRESS || 'localhost'}:${process.env.MQTT_BRORKER_PORT || 1883}`);
    mqttClient = mqtt.connect(`mqtt://${process.env.MQTT_BRORKER_ADDRESS || 'localhost'}:${process.env.MQTT_BRORKER_PORT || 1883}`);
    mqttClient.on("connect", () => {
        console.log("Connected to MQTT broker");
    });
}

export const disconnectFromMqtt = () => {
    mqttClient.end();
}

export const publishToMqtt = (topic, message) => {
    mqttClient.publish(topic, message);
}

export const subscribeToMqtt = (topic, callback) => {
    mqttClient.subscribe(topic);
    mqttClient.on("message", callback);
}

export const unsubscribeFromMqtt = (topic) => {
    mqttClient.unsubscribe(topic);
}
