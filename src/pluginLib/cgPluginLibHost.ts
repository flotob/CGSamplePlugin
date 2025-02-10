import { ActionRequestPayload } from "./types";
import crypto from 'crypto';

class CgPluginLibHost {
  private static instance: CgPluginLibHost | null = null;
  private static privateKey: string;

  constructor(privateKey: string) {
    if (CgPluginLibHost.instance && CgPluginLibHost.privateKey === privateKey) {
      return CgPluginLibHost.instance;
    }

    CgPluginLibHost.privateKey = privateKey;
    CgPluginLibHost.instance = this;
  }

  public async signAction(action: ActionRequestPayload): Promise<string> {
    const sign = crypto.createSign('SHA256');
    sign.update(JSON.stringify(action));
    sign.end();

    const privateKey = crypto.createPrivateKey({
        key: CgPluginLibHost.privateKey,
        type: 'pkcs1',
        format: 'pem',
    });

    const signature = sign.sign(privateKey, 'base64');
    return signature;
  }
  
}

export default CgPluginLibHost;