import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebhooksController } from '../../src/modules/webhooks/controller/webhooks.controller.js';

describe('WebhooksController', () => {
  let controller: WebhooksController;
  let webhooksServiceMock: any;

  beforeEach(() => {
    webhooksServiceMock = {
      createSubscription: vi.fn(),
      getDeliveries: vi.fn(),
    };

    controller = new WebhooksController(webhooksServiceMock);
  });

  it('deve criar a subscription usando o id do usuario logado', async () => {
    const user = { id: 'user-1', email: 'cliente@teste.com' };
    const dto = { url: 'https://cliente.com/hook' };
    webhooksServiceMock.createSubscription.mockResolvedValue({ id: 'sub-1' });

    const result = await controller.createSubscription(dto, user);

    expect(result).toEqual({ id: 'sub-1' });
    expect(webhooksServiceMock.createSubscription).toHaveBeenCalledWith(
      'user-1',
      dto.url,
    );
  });

  it('deve listar as entregas do usuario logado', async () => {
    const user = { id: 'user-1', email: 'cliente@teste.com' };
    webhooksServiceMock.getDeliveries.mockResolvedValue([{ id: 'd1' }]);

    const result = await controller.getDeliveries(user);

    expect(result).toEqual([{ id: 'd1' }]);
    expect(webhooksServiceMock.getDeliveries).toHaveBeenCalledWith('user-1');
  });
});
