# Firebase Push Utility

A lightweight and reusable utility for Firebase authentication and sending push notifications using Firebase Cloud Messaging (FCM). This utility can be used in any JavaScript or TypeScript project and supports sending notifications to individual devices, multiple devices, and topics.

## Features

- **Authentication**: Automatically manages OAuth 2.0 authentication with Firebase using service account credentials
- **Token Management**: Automatic caching and renewal of access tokens
- **Multiple Notification Types**: Support for single device, multiple devices, and topic notifications
- **TypeScript Support**: Includes TypeScript definitions for better development experience
- **Reusable**: Can be used with multiple Firebase projects in the same application
- **Environment Agnostic**: Works in Node.js, browsers with Web Crypto API support, and React Native

## Installation

1. Clone this repository:
   ```bash
   git clone https://github.com/your-username/firebase-push-utility.git
   cd firebase-push-utility
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile TypeScript code:
   ```bash
   npm run build
   ```

Alternatively, you can simply copy the files from the `src` folder to your project:
- For JavaScript projects: `dist/firebaseMessaging.js`
- For TypeScript projects: `src/firebaseMessaging.ts`

## Prerequisites

1. A Firebase project with FCM enabled
2. A Firebase service account (JSON file)
   - Go to the Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key" to download the JSON file
3. Keep the service account file secure and never include it in version control

## Basic Usage

### JavaScript

```javascript
const { createFCMService, createServiceAccountFromJson } = require('firebase-push-utility');

// Create service account from JSON string (e.g., environment variable)
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
const serviceAccount = createServiceAccountFromJson(serviceAccountJson);

// Or load directly from a file (not recommended for production)
// const serviceAccount = require('./firebase-service-account.json');

// Initialize FCM service
const fcmService = createFCMService(serviceAccount);

// Send a notification to a single device
async function sendNotification() {
  try {
    const result = await fcmService.sendNotification(
      'DEVICE_FCM_TOKEN',
      {
        title: 'Hello World',
        body: 'This is a test notification'
      },
      {
        // Optional data payload
        type: 'test',
        screen: 'home'
      }
    );
    
    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
```

### TypeScript

```typescript
import { 
  createFCMService, 
  createServiceAccountFromJson,
  FirebaseServiceAccount,
  FCMNotification 
} from 'firebase-push-utility';

// Create service account from JSON string
const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
if (!serviceAccountJson) {
  throw new Error('Firebase service account not configured');
}

const serviceAccount = createServiceAccountFromJson(serviceAccountJson);
const fcmService = createFCMService(serviceAccount);

// Send a notification
async function sendNotification() {
  try {
    const notification: FCMNotification = {
      title: 'Hello World',
      body: 'This is a test notification'
    };
    
    const data: Record<string, string> = {
      type: 'test',
      screen: 'home'
    };
    
    const result = await fcmService.sendNotification(
      'DEVICE_FCM_TOKEN',
      notification,
      data
    );
    
    console.log('Notification sent:', result);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}
```

## Advanced Usage

### Sending to Multiple Devices

```javascript
// Send to multiple devices (FCM tokens)
const tokens = [
  'DEVICE_TOKEN_1',
  'DEVICE_TOKEN_2',
  'DEVICE_TOKEN_3'
];

const results = await fcmService.sendMulticastNotification(
  tokens,
  {
    title: 'Bulk Notification',
    body: 'This message was sent to multiple devices'
  }
);

// Results contains an array of Promise.allSettled() results
const successes = results.filter(r => r.status === 'fulfilled').length;
console.log(`Sent to ${successes} out of ${tokens.length} devices`);
```

### Sending to a Topic

```javascript
// Send to a topic (users must be subscribed to the topic)
const result = await fcmService.sendTopicNotification(
  'news',  // Topic name
  {
    title: 'Latest News',
    body: 'Check out our latest update!'
  },
  {
    articleId: '123',
    category: 'technology'
  }
);
```

### Using with Multiple Firebase Projects

```javascript
// Initialize services for two different Firebase projects
const serviceAccountA = createServiceAccountFromJson(process.env.FIREBASE_SERVICE_ACCOUNT_A);
const fcmServiceA = createFCMService(serviceAccountA);

const serviceAccountB = createServiceAccountFromJson(process.env.FIREBASE_SERVICE_ACCOUNT_B);
const fcmServiceB = createFCMService(serviceAccountB);

// Send notifications to both projects
await fcmServiceA.sendNotification('TOKEN_FOR_PROJECT_A', { title: 'Project A Notification' });
await fcmServiceB.sendNotification('TOKEN_FOR_PROJECT_B', { title: 'Project B Notification' });
```

## API Reference

### `createFCMService(serviceAccount)`

Creates a new instance of the FCM service.

- **Parameters**:
  - `serviceAccount` (Object): Firebase service account object

- **Returns**: FCM service object with the following methods:
  - `getAccessToken()`: Gets a valid access token
  - `sendNotification(token, notification, data)`: Sends notification to a single device
  - `sendMulticastNotification(tokens, notification, data)`: Sends to multiple devices
  - `sendTopicNotification(topic, notification, data)`: Sends to a topic

### `createServiceAccountFromJson(serviceAccountJson)`

Helper function to create a service account object from a JSON string.

- **Parameters**:
  - `serviceAccountJson` (string): Firebase service account as JSON string

- **Returns**: Parsed service account object

## Security Considerations

1. **Never expose** your Firebase service account credentials in client-side code
2. For web/mobile applications, create a secure backend service to manage FCM authentication and message sending
3. Store Firebase service account securely:
   - In environment variables for server-side applications
   - In secure, encrypted storage for sensitive environments
   - Consider using a secrets management service in production environments

## Implementation Examples

### Server-Side Implementation (Node.js)

```javascript
// server.js
require('dotenv').config(); // Load environment variables
const express = require('express');
const { createFCMService, createServiceAccountFromJson } = require('firebase-push-utility');

const app = express();
app.use(express.json());

// Initialize FCM service
const serviceAccount = createServiceAccountFromJson(process.env.FIREBASE_SERVICE_ACCOUNT);
const fcmService = createFCMService(serviceAccount);

// API endpoint to send notifications
app.post('/api/notifications', async (req, res) => {
  try {
    const { token, title, body, data } = req.body;
    
    if (!token || !title) {
      return res.status(400).json({ error: 'Required parameters missing' });
    }
    
    const result = await fcmService.sendNotification(token, { title, body }, data);
    res.json({ success: true, result });
  } catch (error) {
    console.error('Failed to send notification:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Using with Deep Link Data for Mobile Apps

```javascript
// Sending a notification with deep link data
await fcmService.sendNotification(
  'DEVICE_FCM_TOKEN',
  {
    title: 'View Your Order',
    body: 'Your order #1234 has been shipped!'
  },
  {
    // Deep link data for the app to process
    action: 'OPEN_ORDER_DETAILS',
    orderId: '1234',
    screen: 'orderDetails'
  }
);
```

## Setting Up for Testing

1. Create a `.env` file in the project root based on the `.env.example`:
   ```
   FIREBASE_SERVICE_ACCOUNT={"type":"service_account","project_id":"your-project-id",...}
   TEST_DEVICE_TOKEN=your_device_token_here
   ```

2. Run the test example:
   ```bash
   npx ts-node examples/test.ts
   ```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Firebase team for providing FCM
- Contributors to this project 