/**
 * Example of using the Firebase Cloud Messaging utility in TypeScript
 */

import dotenv from 'dotenv';
import { 
  createFCMService, 
  createServiceAccountFromJson,
  FCMNotification,
  FCMResponse
} from '../src';

// Load environment variables from .env file
dotenv.config();

// Declare types for environment variables
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      FIREBASE_SERVICE_ACCOUNT?: string;
      TEST_DEVICE_TOKEN?: string;
    }
  }
}

// Main test function
async function main(): Promise<void> {
  try {
    console.log('Starting Firebase Cloud Messaging test...');

    // Get Firebase service account JSON from environment variables
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) {
      throw new Error('Environment variable FIREBASE_SERVICE_ACCOUNT not configured');
    }
    
    // Create service account object from JSON
    const serviceAccount = createServiceAccountFromJson(serviceAccountJson);
    
    // Initialize FCM service
    const fcmService = createFCMService(serviceAccount);
    
    // Get access token (just as a test)
    const accessToken = await fcmService.getAccessToken();
    console.log(`Access token obtained: ${accessToken.substring(0, 10)}...`);
    
    // FCM token of the device or user you want to send the notification to
    // This should be a valid FCM token for a registered device
    const deviceToken = process.env.TEST_DEVICE_TOKEN;
    if (!deviceToken) {
      console.log('TEST_DEVICE_TOKEN variable not configured. Skipping notification sending.');
      return;
    }

    // Prepare the notification with type safety
    const notification: FCMNotification = {
      title: 'Notification title',
      body: 'Notification body'
    };

    // Optional additional data
    const data: Record<string, string> = {
      type: 'test',
      timestamp: Date.now().toString(),
      claimId: 'a0QD700000aHjIfMAK', // Claim ID for deep linking in the app
      action: 'OPEN_CLAIM_DETAILS' // Action for the app to know how to process the deep link
    };

    // Send a test notification
    console.log(`Sending notification to token: ${deviceToken.substring(0, 10)}...`);
    const result = await fcmService.sendNotification(
      deviceToken,
      notification,
      data
    );
    
    console.log('Notification sent successfully!');
    console.log('FCM API Response:', result);
    
    // Example of sending to multiple devices
    if (process.env.TEST_MULTIPLE_TOKENS) {
      const tokens = process.env.TEST_MULTIPLE_TOKENS.split(',');
      console.log(`Sending notification to ${tokens.length} devices...`);
      
      const results = await fcmService.sendMulticastNotification(
        tokens,
        notification,
        data
      );
      
      // Count successes and failures
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      console.log(`Notifications sent: ${successful} success, ${failed} failures`);
    }
    
  } catch (error) {
    console.error('Test error:', error instanceof Error ? error.message : String(error));
  }
}

// Execute the main function
main(); 