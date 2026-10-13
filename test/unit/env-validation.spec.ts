import { describe, it, expect } from 'vitest';
import { validationSchema } from '../../src/config/env-validation.js';

describe('validationSchema (variáveis de ambiente)', () => {
  const validEnv = {
    POSTGRES_USER: 'user',
    POSTGRES_PASSWORD: 'pass',
    POSTGRES_DB: 'db',
    DATABASE_URL: 'postgres://localhost:5432/db',
    REDIS_HOST: 'localhost',
    JWT_SECRET: 'secret',
    API_KEY: 'api-key',
  };

  it('deve validar um ambiente completo aplicando os valores padrao', () => {
    const { error, value } = validationSchema.validate(validEnv);

    expect(error).toBeUndefined();
    expect(value.PORT).toBe(3000);
    expect(value.NODE_ENV).toBe('development');
    expect(value.REDIS_PORT).toBe(6379);
    expect(value.JWT_EXPIRES_IN).toBe('15m');
  });

  it('deve falhar quando variaveis obrigatorias estiverem ausentes', () => {
    const { error } = validationSchema.validate({});

    expect(error).toBeDefined();
    expect(error?.message).toContain('is required');
  });

  it('deve rejeitar um NODE_ENV invalido', () => {
    const { error } = validationSchema.validate({
      ...validEnv,
      NODE_ENV: 'staging',
    });

    expect(error).toBeDefined();
  });
});
