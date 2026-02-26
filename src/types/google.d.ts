// Minimal type declarations for Google Identity Services and GAPI
// These are loaded via script tags at runtime

declare namespace google.accounts.oauth2 {
  interface TokenClient {
    callback: (response: TokenResponse) => void;
    requestAccessToken(overrideConfig?: { prompt?: string }): void;
  }

  interface TokenResponse {
    access_token: string;
    error?: string;
    error_description?: string;
    error_uri?: string;
    expires_in: number;
    scope: string;
    token_type: string;
  }

  interface ClientConfigError {
    type: string;
    message?: string;
  }

  function initTokenClient(config: {
    client_id: string;
    scope: string;
    callback: (response: TokenResponse) => void;
    error_callback?: (error: ClientConfigError) => void;
  }): TokenClient;

  function revoke(token: string, callback: () => void): void;
}

declare namespace gapi {
  function load(api: string, callback: () => void): void;

  namespace client {
    function init(config: {
      discoveryDocs?: string[];
      apiKey?: string;
    }): Promise<void>;

    function getToken(): { access_token: string } | null;
    function setToken(token: { access_token: string } | null): void;

    namespace sheets.spreadsheets {
      namespace values {
        function get(params: {
          spreadsheetId: string;
          range: string;
        }): Promise<{ result: { values?: string[][] } }>;

        function append(params: {
          spreadsheetId: string;
          range: string;
          valueInputOption: string;
          insertDataOption?: string;
          resource: { values: string[][] };
        }): Promise<unknown>;

        function update(params: {
          spreadsheetId: string;
          range: string;
          valueInputOption: string;
          resource: { values: string[][] };
        }): Promise<unknown>;

        function clear(params: {
          spreadsheetId: string;
          range: string;
        }): Promise<unknown>;
      }

      function batchUpdate(params: {
        spreadsheetId: string;
        resource: {
          requests: Array<{
            addSheet?: { properties: { title: string } };
          }>;
        };
      }): Promise<unknown>;

      function get(params: {
        spreadsheetId: string;
      }): Promise<{
        result: {
          sheets?: Array<{ properties: { title: string } }>;
        };
      }>;
    }
  }
}
