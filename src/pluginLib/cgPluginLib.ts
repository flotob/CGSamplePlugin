import { RequestType, RequestPayload, UserInfoResponsePayload, CommunityInfoResponsePayload, AnyResponsePayload } from './types';

class CgPluginLib {
  private targetOrigin: string;
  private parentWindow: Window;
  private listeners: Record<string, (payload: AnyResponsePayload) => void>;

  constructor(targetOrigin = '*') {
    this.targetOrigin = targetOrigin; // Restrict communication to specific origins for security.
    this.parentWindow = window.parent; // Reference to the parent window.
    this.listeners = {}; // Store custom message listeners.

    // Listen for messages from the parent.
    window.addEventListener('message', this.__handleMessage.bind(this));
  }

  /**
   * Send a message to the parent window.
   * @param {string} type - The type of message.
   * @param {object} payload - The data to send.
   */
  private __sendMessage(type: RequestType, payload: RequestPayload | undefined = undefined) {
    if (!this.parentWindow) {
      console.error('No parent window available to send messages.');
      return;
    }

    this.parentWindow.postMessage(
      { type, payload },
      this.targetOrigin
    );
  }

  /**
   * Handle incoming messages from the parent.
   * @param {MessageEvent} event - The incoming message event.
   */
  private __handleMessage(event: MessageEvent) {
    // Validate the origin of the message.
    console.log('New message received');
    console.log('event.origin', event.origin);

    if (this.targetOrigin !== '*' && event.origin !== this.targetOrigin) {
      console.warn('Message origin mismatch:', event.origin);
      return;
    }

    const { type, payload } = event.data;
    console.log('event.data', event.data);

    console.log('type', type);
    console.log('payload', payload);
    console.log('this.listeners', this.listeners);

    if (type && this.listeners[type]) {
      console.log('found listener for type', type);
      this.listeners[type](payload);
    }
  }

  /**
   * Register a listener for a specific message type.
   * @param {string} type - The type of message to listen for.
   * @param {function} callback - The callback to invoke when the message is received.
   */
  private __on(type: string, callback: (payload: AnyResponsePayload) => void) {
    this.listeners[type] = callback;
  }

  /**
   * Remove a listener for a specific message type.
   * @param {string} type - The type of message to remove.
   */
  private __off(type: string) {
    delete this.listeners[type];
  }

  private __request(type: RequestType): Promise<AnyResponsePayload> {
    return new Promise((resolve) => {
      const requestId = `req_${type}_${Date.now()}`; // Unique ID for the request.

      // Listener for the response.
      const responseListener = (payload: AnyResponsePayload) => {
        resolve(payload);
        this.__off(requestId);
      };

      // Set up the listener for the response.
      this.__on(requestId, responseListener);

      // Send the request to the parent.
      this.__sendMessage(type, { requestId });
    });
  }
  /**
   * Get the user info from the parent.
   * @returns {Promise<CgPluginLib.Response.UserInfo>} A promise that resolves to the user info.
   */
  public async getUserInfo(): Promise<UserInfoResponsePayload> {
    return this.__request('userInfo') as Promise<UserInfoResponsePayload>;
  }

  /**
   * Get the community info from the parent.
   * @returns {Promise<CgPluginLib.Response.CommunityInfo>} A promise that resolves to the community info.
   */
  public async getCommunityInfo(): Promise<CommunityInfoResponsePayload> {
    return this.__request('communityInfo') as Promise<CommunityInfoResponsePayload>;
  }
}

// Export the library as a global variable or as a module.
export default CgPluginLib;

// Usage Example:
// const messenger = new IFrameMessenger('https://parent-site.com');
// messenger.sendMessage('init', { hello: 'world' });
// messenger.on('response', (data) => console.log('Received:', data));
