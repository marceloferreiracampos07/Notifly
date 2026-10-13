export interface PersistWebhookDelivery {
  subscriptionId: string;
  status: 'SUCCESS' | 'FAILED';
  payload: string;
  deliveryId?: string;
  attempts?: number;
  errorMessage?: string;
}
