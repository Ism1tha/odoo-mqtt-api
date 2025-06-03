# 🤖 Odoo MQTT API - Robot Manufacturing Integration

![MQTT Integration Preview](https://i.imgur.com/UudhAIy.png)

> ⚠️ **Educational Project** - This project is designed for self-education and learning purposes. It may be unfinished, contain bugs, or have breaking changes. Not intended for production use.

A Node.js API that connects Odoo manufacturing orders with MQTT-enabled robots for automated production workflows.

> **Related Project**: [Odoo MQTT Integration Addon](https://github.com/Ism1tha/odoo-mqtt-addon) - The Odoo addon that works with this API

---

## 📦 What's Inside

- **Odoo Integration**: Direct connection with manufacturing orders
- **MQTT Communication**: Real-time robot communication via MQTT protocol
- **Task Management**: Automated task queuing and processing
- **Robot Monitoring**: Health checks and status tracking with timeout handling
- **Simulation Mode**: Built-in testing with virtual robots
- **Authentication**: Optional Bearer token security

---

## 🚀 Quick Setup

### 1. Clone the Repository

```bash
git clone git@github.com:Ism1tha/odoo-mqtt-api.git
cd odoo-mqtt-api
```

### 2. Environment Configuration

```bash
cp .env.example .env
```

Edit `.env`:

```bash
# API Settings
BIND_PORT=3000
AUTHENTICATION_ENABLED=false

# MQTT Broker
MQTT_BRORKER_ADDRESS=127.0.0.1
MQTT_BRORKER_PORT=1883

# Odoo Connection
ODOO_HOST=localhost
ODOO_PORT=8069

# Testing
SIMULATE_MQTT_ROBOTS=false
```

### 3. Start Services

```bash
# Start MQTT broker
docker-compose up -d

# Install dependencies
npm install

# Start API
npm run dev
```

---

## 🤖 Robot Communication Protocol

### Task Assignment (API → Robot)

**Topic**: `{robot_topic}/task`

```json
{
  "taskId": "uuid-task-id",
  "payload": "base64_encoded_binary_data"
}
```

### Status Update (Robot → API)

**Topic**: `{robot_topic}/status`

```json
{
  "status": "SUCCESS|ERROR|PROCESSING",
  "timestamp": "2024-01-01T12:00:00Z",
  "completedTaskId": "uuid-task-id"
}
```

---

## 📊 Configuration Overview

| Variable                 | Description              | Default     |
| ------------------------ | ------------------------ | ----------- |
| `BIND_PORT`              | API server port          | `3000`      |
| `AUTHENTICATION_ENABLED` | Enable Bearer token auth | `false`     |
| `MQTT_BRORKER_ADDRESS`   | MQTT broker host         | `127.0.0.1` |
| `MQTT_BRORKER_PORT`      | MQTT broker port         | `1883`      |
| `ODOO_HOST`              | Odoo server host         | `localhost` |
| `ODOO_PORT`              | Odoo server port         | `8069`      |
| `SIMULATE_MQTT_ROBOTS`   | Enable test robots       | `false`     |

---

## 📋 Task States

| State        | Description                        |
| ------------ | ---------------------------------- |
| `PENDING`    | Waiting to be sent to robot        |
| `PROCESSING` | Sent to robot, awaiting completion |
| `COMPLETED`  | Successfully finished              |
| `FAILED`     | Failed or timed out                |

---

## 🧪 Testing with Simulation

Enable virtual robots for testing:

```bash
SIMULATE_MQTT_ROBOTS=true
```

This creates `robot1` and `robot2` that automatically:

- Respond to task assignments
- Send realistic status updates
- Complete the full workflow

---

## 🔐 Authentication (Optional)

```bash
AUTHENTICATION_ENABLED=true
AUTHENTICATION_PASSWORD=your_secure_password
```

Add to requests:

```http
Authorization: Bearer your_secure_password
```

---

## 🧼 Stop & Clean Up

To stop services:

```bash
# Stop API
npm stop

# Stop MQTT broker
docker-compose down
```

---

## 🆘 Troubleshooting

- **MQTT not connecting**: Check broker address and port in `.env`
- **Tasks stuck in PROCESSING**: Check robot connectivity and MQTT topics
- **Odoo integration fails**: Verify `ODOO_HOST` and `ODOO_PORT` settings
- **Authentication errors**: Check `AUTHENTICATION_PASSWORD` configuration

---

## 📣 Notes

- This setup works with the [Odoo MQTT Integration Addon](https://github.com/Ism1tha/odoo-mqtt-addon)
- Simulation mode is **not intended for production** use
- Make sure your MQTT broker is running before starting the API

---

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for details.

---

**Happy Manufacturing! 🏭✨**
