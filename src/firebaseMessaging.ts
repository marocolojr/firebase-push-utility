/**
 * Firebase Cloud Messaging (FCM) Utility
 * 
 * This utility provides functions to authenticate with Firebase and send FCM notifications
 * using a service account. It can be used in any project that needs to send
 * push notifications via Firebase.
 */

/**
 * Firebase service account interface
 */
export interface FirebaseServiceAccount {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
  universe_domain?: string;
}

/**
 * FCM notification interface
 */
export interface FCMNotification {
  title: string;
  body?: string;
}

/**
 * FCM API response
 */
export interface FCMResponse {
  name: string;
}

/**
 * FCM service interface
 */
export interface FCMService {
  getAccessToken(): Promise<string>;
  sendNotification(token: string, notification: FCMNotification, data?: Record<string, string>): Promise<FCMResponse>;
  sendMulticastNotification(tokens: string[], notification: FCMNotification, data?: Record<string, string>): Promise<PromiseSettledResult<FCMResponse>[]>;
  sendTopicNotification(topic: string, notification: FCMNotification, data?: Record<string, string>): Promise<FCMResponse>;
}

/**
 * Creates and returns a Firebase Cloud Messaging utility
 * @param serviceAccount - Firebase service account object
 * @returns FCM utility with authentication and message sending functions
 */
export function createFCMService(serviceAccount: FirebaseServiceAccount): FCMService {
  // Validate service account
  if (!serviceAccount || !serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
    throw new Error('Invalid Firebase service account. Must include private_key, client_email and project_id');
  }

  // Store the service account securely
  const _serviceAccount = serviceAccount;
  
  // Token cache and expiration
  let _accessToken: string | null = null;
  let _tokenExpiry = 0;

  /**
   * Get an OAuth2 access token for FCM
   * @returns Access token
   */
  async function getAccessToken(): Promise<string> {
    try {
      // Check if we have a valid token in cache
      const now = Math.floor(Date.now() / 1000);
      if (_accessToken && _tokenExpiry > now + 300) { // 5 minutes buffer
        return _accessToken;
      }

      // Create JWT assertion for token exchange
      const expiry = now + 3600; // 1 hour validity
      const jwtHeader = {
        alg: 'RS256',
        typ: 'JWT'
      };
      const jwtClaimSet = {
        iss: _serviceAccount.client_email,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: expiry,
        iat: now
      };

      // Encode JWT header and claims in base64
      const encoder = new TextEncoder();
      const base64UrlEncode = (buffer: Uint8Array): string => {
        return btoa(String.fromCharCode(...buffer))
          .replace(/\+/g, '-')
          .replace(/\//g, '_')
          .replace(/=+$/, '');
      };
      const header = base64UrlEncode(encoder.encode(JSON.stringify(jwtHeader)));
      const payload = base64UrlEncode(encoder.encode(JSON.stringify(jwtClaimSet)));
      const toSign = `${header}.${payload}`;

      // Import the private key in the format expected by WebCrypto API
      const privateKey = _serviceAccount.private_key.replace(/\\n/g, '\n');
      const pemHeader = '-----BEGIN PRIVATE KEY-----';
      const pemFooter = '-----END PRIVATE KEY-----';
      const pemContents = privateKey.substring(
        privateKey.indexOf(pemHeader) + pemHeader.length,
        privateKey.indexOf(pemFooter)
      ).replace(/\s/g, '');
      const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
      
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer,
        {
          name: 'RSASSA-PKCS1-v1_5',
          hash: 'SHA-256'
        },
        false,
        ['sign']
      );

      // Sign the JWT
      const signature = await crypto.subtle.sign(
        { name: 'RSASSA-PKCS1-v1_5' },
        cryptoKey,
        encoder.encode(toSign)
      );
      const jwt = `${toSign}.${base64UrlEncode(new Uint8Array(signature))}`;

      // Exchange JWT for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt
        })
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Failed to obtain access token: ${errorText}`);
      }

      const tokenData = await tokenResponse.json();
      
      // Cache token and expiration time
      _accessToken = tokenData.access_token;
      _tokenExpiry = now + tokenData.expires_in;
      
      // We can assert it's a string now because we just set it
      return _accessToken as string;
    } catch (error) {
      console.error('Error obtaining access token:', error);
      throw error;
    }
  }

  /**
   * Send a notification to a single device using FCM
   * @param token - FCM token of the target device
   * @param notification - Notification content (title, body)
   * @param data - Additional data payload (optional)
   * @returns FCM response
   */
  async function sendNotification(
    token: string, 
    notification: FCMNotification, 
    data: Record<string, string> = {}
  ): Promise<FCMResponse> {
    try {
      if (!token) {
        throw new Error('Device token is required');
      }
      
      if (!notification || !notification.title) {
        throw new Error('Notification title is required');
      }

      // Get access token
      const accessToken = await getAccessToken();
      
      // Send notification via FCM API
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${_serviceAccount.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              token,
              notification: {
                title: notification.title,
                body: notification.body || ''
              },
              data: data || {}
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FCM API error: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
  }

  /**
   * Send a notification to multiple devices using FCM (in batches)
   * @param tokens - Array of FCM tokens
   * @param notification - Notification content (title, body)
   * @param data - Additional data payload (optional)
   * @returns Array of FCM responses
   */
  async function sendMulticastNotification(
    tokens: string[], 
    notification: FCMNotification, 
    data: Record<string, string> = {}
  ): Promise<PromiseSettledResult<FCMResponse>[]> {
    if (!tokens || !tokens.length) {
      throw new Error('At least one device token is required');
    }

    // Send notifications in batches (FCM doesn't have a true multicast API in v1)
    const results: PromiseSettledResult<FCMResponse>[] = [];
    
    // Process in batches of 500 to avoid overloading the API
    const batchSize = 500;
    for (let i = 0; i < tokens.length; i += batchSize) {
      const batch = tokens.slice(i, i + batchSize);
      const promises = batch.map(token => 
        sendNotification(token, notification, data)
      );
      
      // Wait for all notifications in this batch to complete
      const batchResults = await Promise.allSettled(promises);
      results.push(...batchResults);
    }

    return results;
  }

  /**
   * Send a notification to a topic using FCM
   * @param topic - FCM topic name
   * @param notification - Notification content (title, body)
   * @param data - Additional data payload (optional)
   * @returns FCM response
   */
  async function sendTopicNotification(
    topic: string, 
    notification: FCMNotification, 
    data: Record<string, string> = {}
  ): Promise<FCMResponse> {
    try {
      if (!topic) {
        throw new Error('Topic name is required');
      }
      
      if (!notification || !notification.title) {
        throw new Error('Notification title is required');
      }

      // Get access token
      const accessToken = await getAccessToken();
      
      // Format topic correctly
      const formattedTopic = topic.startsWith('/topics/') ? topic : `/topics/${topic}`;
      
      // Send notification via FCM API
      const response = await fetch(
        `https://fcm.googleapis.com/v1/projects/${_serviceAccount.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: {
              topic: formattedTopic.replace('/topics/', ''), // FCM v1 API doesn't use '/topics/' prefix
              notification: {
                title: notification.title,
                body: notification.body || ''
              },
              data: data || {}
            }
          })
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`FCM API error: ${errorText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error sending topic notification:', error);
      throw error;
    }
  }

  // Return the FCM service interface
  return {
    getAccessToken,
    sendNotification,
    sendMulticastNotification,
    sendTopicNotification
  };
}

/**
 * Creates a service account object from a JSON string
 * @param serviceAccountJson - JSON string of the Firebase service account
 * @returns Parsed service account object
 */
export function createServiceAccountFromJson(serviceAccountJson: string): FirebaseServiceAccount {
  try {
    // Parse the JSON string into an object
    const serviceAccount: FirebaseServiceAccount = JSON.parse(serviceAccountJson);
    
    // Validate required fields
    if (!serviceAccount.private_key || !serviceAccount.client_email || !serviceAccount.project_id) {
      throw new Error('Invalid service account JSON. Must include private_key, client_email, and project_id');
    }
    
    return serviceAccount;
  } catch (error) {
    throw new Error(`Invalid service account JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
} 