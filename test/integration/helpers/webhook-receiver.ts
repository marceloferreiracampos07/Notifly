import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export interface WebhookBody {
  event?: string;
  timestamp?: string;
  data?: Record<string, any>;
}

export interface ReceivedWebhook {
  path: string;
  headers: IncomingHttpHeaders;
  rawBody: string;
  body: WebhookBody;
}

export type Responder = (path: string) => number;

/** Receptor HTTP local que registra os webhooks recebidos e permite controlar o status devolvido. */
export class WebhookReceiver {
  private server?: Server;
  private responder: Responder = () => 200;
  private readonly received: ReceivedWebhook[] = [];

  setResponder(responder: Responder): void {
    this.responder = responder;
  }

  get requests(): ReceivedWebhook[] {
    return this.received;
  }

  countFor(pathSuffix: string): number {
    return this.received.filter((entry) => entry.path.endsWith(pathSuffix)).length;
  }

  async start(): Promise<string> {
    const server = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        const rawBody = Buffer.concat(chunks).toString('utf-8');
        const path = req.url ?? '';
        const body = this.parse(rawBody);
        this.received.push({ path, headers: req.headers, rawBody, body });
        res.writeHead(this.responder(path), { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });

    this.server = server;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));

    const address = server.address() as AddressInfo;
    return `http://127.0.0.1:${address.port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve) => this.server?.close(() => resolve()));
  }

  private parse(rawBody: string): WebhookBody {
    try {
      return JSON.parse(rawBody) as WebhookBody;
    } catch {
      return {};
    }
  }
}
