import { describe, it, expect, beforeEach } from 'vitest';
import * as crypto from 'crypto';
import { WebhookSigner } from '../../src/modules/webhooks/service/webhook-signer.service.js';

describe('WebhookSigner', () => {
  let signer: WebhookSigner;

  beforeEach(() => {
    signer = new WebhookSigner();
  });

  it('deve assinar o payload com HMAC SHA256 usando o secret', () => {
    const payload = JSON.stringify({ event: 'notification.sent' });
    const secret = 'chave-secreta-webhook';

    const expected = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    expect(signer.sign(payload, secret)).toBe(expected);
  });

  it('deve montar os headers com content-type e a assinatura formatada', () => {
    const headers = signer.buildHeaders('payload', 'secret');

    expect(headers['Content-Type']).toBe('application/json');
    expect(headers['X-Hub-Signature-256']).toMatch(/^sha256=[a-f0-9]{64}$/);
  });
});
