import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class WebhookSigner {
  sign(payload: string, secret: string): string {
    return crypto.createHmac('sha256', secret).update(payload).digest('hex');
  }

  buildHeaders(payload: string, secret: string): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-Hub-Signature-256': `sha256=${this.sign(payload, secret)}`,
    };
  }
}
