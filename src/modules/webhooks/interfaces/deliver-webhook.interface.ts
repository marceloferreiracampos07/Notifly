export interface DeliverWebhook {
  subscription: {
    id: string;
    url: string;
    secret?: string | null;
  };
  eventPayload: Record<string, unknown>;
  deliveryId?: string;
  currentAttempts?: number;
}
