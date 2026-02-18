import { GOOGLE_SCOPES } from '@/constants';

// Google Identity Services configuration
// Users must set their own Client ID in Settings page
const DISCOVERY_DOCS = [
  'https://sheets.googleapis.com/$discovery/rest?version=v4',
  'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
];

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let gapiInited = false;
let gisInited = false;
let currentClientId = '';
// Mutable reference for error_callback delegation (error_callback cannot be
// overridden on the tokenClient instance, so we delegate to this variable)
let tokenErrorCallback: ((error: google.accounts.oauth2.ClientConfigError) => void) | null = null;

/**
 * Load the GAPI client library
 */
export function loadGapiClient(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gapiInited) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.onload = () => {
      gapi.load('client', async () => {
        try {
          await gapi.client.init({
            discoveryDocs: DISCOVERY_DOCS,
          });
          gapiInited = true;
          resolve();
        } catch (err) {
          reject(err);
        }
      });
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Load Google Identity Services
 */
/**
 * Initialize the token client. Re-initializes if the clientId changes.
 */
function initializeTokenClient(clientId: string): void {
  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: GOOGLE_SCOPES,
    callback: () => {
      // will be overridden per request
    },
    error_callback: (error) => {
      // Delegate to the mutable reference so requestAccessToken can handle it
      if (tokenErrorCallback) {
        tokenErrorCallback(error);
      }
    },
  });
  currentClientId = clientId;
}

export function loadGisClient(clientId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (gisInited) {
      // Re-initialize token client if clientId changed
      if (currentClientId !== clientId) {
        initializeTokenClient(clientId);
      }
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      initializeTokenClient(clientId);
      gisInited = true;
      resolve();
    };
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

/**
 * Request an access token (triggers Google sign-in popup)
 */
export function requestAccessToken(): Promise<google.accounts.oauth2.TokenResponse> {
  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('GIS not initialized. Set Google Client ID in settings.'));
      return;
    }
    tokenClient.callback = (response: google.accounts.oauth2.TokenResponse) => {
      if (response.error) {
        reject(new Error(response.error_description || response.error));
        return;
      }
      // Set the token on the GAPI client so subsequent API calls work
      gapi.client.setToken({ access_token: response.access_token });
      resolve(response);
    };
    tokenErrorCallback = (error) => {
      reject(new Error(
        error.message || `認証ポップアップエラー: ${error.type}`
      ));
    };
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

/**
 * Revoke the current access token
 */
export function revokeAccessToken(token: string): void {
  google.accounts.oauth2.revoke(token, () => {
    console.log('Token revoked');
  });
}

/**
 * Get user info from Google
 */
export async function getUserInfo(accessToken: string): Promise<{
  email: string;
  name: string;
  picture: string;
}> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error('Failed to get user info');
  return res.json();
}
