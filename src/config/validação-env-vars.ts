import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // 1. Configurações Gerais da Aplicação
  PORT: Joi.number().default(3000),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),

  // 2. Banco de Dados 
  POSTGRES_USER: Joi.string().required(),
  POSTGRES_PASSWORD: Joi.string().required(),
  POSTGRES_DB: Joi.string().required(),
  DATABASE_URL: Joi.string().required(),

  // 3. Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),

  // 4. Segurança e Autenticação (JWT)
  JWT_SECRET: Joi.string().required(),
  JWT_EXPIRES_IN: Joi.string().required(),

  // 5. Segurança e Autenticação (API Key)
  API_KEY: Joi.string().required(),
});