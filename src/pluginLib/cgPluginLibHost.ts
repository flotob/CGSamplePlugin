import { PluginRequestInner } from "./types";
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

  public async signRequest(preRequest: Omit<PluginRequestInner, 'requestId'>): Promise<{request: string, signature: string}> {
    const requestId = `requestId-${new Date().getTime()}-${crypto.randomUUID()}`;
    const sign = crypto.createSign('SHA256');
    const request = JSON.stringify({
      ...preRequest,
      requestId,
    });
    sign.update(request);
    sign.end();
    
    const signature = sign.sign(CgPluginLibHost.privateKey, 'base64');
    return { request, signature };
  }
}

export default CgPluginLibHost;