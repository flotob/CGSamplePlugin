import { ActionPayload } from "./types";
import crypto from 'crypto';

class CgPluginLibHost {
  private static instance: CgPluginLibHost | null = null;
  private static privateKeyString: string;
  private static privateKey: crypto.KeyLike;

  constructor(privateKey: string) {
    if (CgPluginLibHost.instance && CgPluginLibHost.privateKeyString === privateKey) {
      return CgPluginLibHost.instance;
    }

    CgPluginLibHost.privateKeyString = privateKey;
    CgPluginLibHost.privateKey = crypto.createPrivateKey({
      key: privateKey,
      type: 'pkcs1',
      format: 'pem',
    });
    CgPluginLibHost.instance = this;
  }

  public async signAction(action: ActionPayload): Promise<{requestId: string, signature: string}> {
    const requestId = `actionId-${new Date().getTime()}-${crypto.randomUUID()}`;
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify({
      requestId,
      action
    }));
    sign.end();

    const signature = sign.sign(CgPluginLibHost.privateKey, 'base64');
    return { requestId, signature };
  }

  public async signRequest(): Promise<{requestId: string, signature: string}> {
    const requestId = `requestId-${new Date().getTime()}-${crypto.randomUUID()}`;
    const sign = crypto.createSign('SHA256');
    sign.update(requestId);
    sign.end();

    const signature = sign.sign(CgPluginLibHost.privateKey, 'base64');
    return { requestId, signature };
  }
}

export default CgPluginLibHost;