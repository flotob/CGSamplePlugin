import { UserInfoResponsePayload, CommunityInfoResponsePayload, AnyResponsePayload, MAX_REQUESTS_PER_MINUTE, AnyRequestPayload, AnyRequestType, ActionResponsePayload } from './types';

class CgPluginLib {
  static instance: CgPluginLib | null = null;

  private static requestTimestampHistory: number[] = [];
  private static iframeUid: string;
  private static targetOrigin: string;
  private static parentWindow: Window;
  private static listeners: Record<string, (payload: AnyResponsePayload) => void>;

  constructor(iframeUid: string) {
    if (CgPluginLib.instance && CgPluginLib.iframeUid === iframeUid) {
      return CgPluginLib.instance;
    }

    if (CgPluginLib.instance && CgPluginLib.iframeUid !== iframeUid) {
      CgPluginLib.instance.__destroy();
    }

    CgPluginLib.iframeUid = iframeUid;
    CgPluginLib.targetOrigin = '*'; // Restrict communication to specific origins for security.
    CgPluginLib.parentWindow = window.parent; // Reference to the parent window.
    CgPluginLib.listeners = {}; // Store custom message listeners.

    // Listen for messages from the parent.
    window.addEventListener('message', this.__handleMessage.bind(this));

    CgPluginLib.instance = this;
  }

  private __destroy() {
    window.removeEventListener('message', this.__handleMessage.bind(this));
  }

  /**
   * Send a message to the parent window.
   * @param {string} type - The type of message.
   * @param {object} payload - The data to send.
   */
  private __sendMessage(type: AnyRequestType, payload: AnyRequestPayload | undefined = undefined) {
    if (!CgPluginLib.parentWindow) {
      console.error('No parent window available to send messages.');
      return;
    }

    const now = Date.now();
    const history = CgPluginLib.requestTimestampHistory.filter((timestamp) => timestamp > now - 60000);
    history.push(now);
    CgPluginLib.requestTimestampHistory = history;

    if (history.length >= MAX_REQUESTS_PER_MINUTE) {
      throw new Error('Max requests per minute reached for iframe: ' + CgPluginLib.iframeUid);
    }

    CgPluginLib.parentWindow.postMessage(
      { type, payload }, CgPluginLib.targetOrigin);
  }

  /**
   * Handle incoming messages from the parent.
   * @param {MessageEvent} event - The incoming message event.
   */
  private __handleMessage(event: MessageEvent) {
    // Validate the origin of the message.
    console.log('iframe got message');
    if (CgPluginLib.targetOrigin !== '*' && event.origin !== CgPluginLib.targetOrigin) {
      console.warn('Message origin mismatch:', event.origin);
      return;
    }

    const { type, payload } = event.data;

    if (type && CgPluginLib.listeners[type]) {
      CgPluginLib.listeners[type](payload);
    }
  }

  /**
   * Register a listener for a specific message type.
   * @param {string} type - The type of message to listen for.
   * @param {function} callback - The callback to invoke when the message is received.
   */
  private __on(type: string, callback: (payload: AnyResponsePayload) => void) {
    CgPluginLib.listeners[type] = callback;
  }

  /**
   * Remove a listener for a specific message type.
   * @param {string} type - The type of message to remove.
   */
  private __off(type: string) {
    delete CgPluginLib.listeners[type];
  }

  private __request(type: AnyRequestType, payload: Omit<AnyRequestPayload, 'requestId' | 'iframeUid'> = {}, timeout: number = 2000, maxAttempts: number = 3): Promise<AnyResponsePayload> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${type}_${Date.now()}`; // Unique ID for the request.
      let timeoutId: NodeJS.Timeout | undefined;

      // Listener for the response.
      const responseListener = (payload: AnyResponsePayload) => {
        resolve(payload);
        clearTimeout(timeoutId);
        this.__off(requestId);
      };

      // Set up the listener for the response.
      this.__on(requestId, responseListener);

      let attempts = 0;
      const attemptSend = () => {
        attempts++;

        // Send the request to the parent.
        this.__sendMessage(type, {
          requestId,
          iframeUid: CgPluginLib.iframeUid,
          ...payload,
        });

        timeoutId = setTimeout(() => {
          if (attempts < maxAttempts) {
            attemptSend();
          } else {
            reject(new Error('Request timed out'));
          }
        }, timeout);
      };

      attemptSend();
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

  /**
   * Give a role to a user in the community.
   * @param {string} roleId - The ID of the role to give.
   * @param {string} userId - The ID of the user to give the role to.
   * @returns {Promise<ActionResponsePayload>} A promise that resolves to the action response.
   */
  public async giveRole(roleId: string, userId: string): Promise<ActionResponsePayload> {
    return this.__request('action', {
      action: 'giveRole',
      payload: { roleId, userId },
    }) as Promise<ActionResponsePayload>;
  }
}

// Export the library as a global variable or as a module.
export default CgPluginLib;
