import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

interface ContainerState {
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
}

const integrationDir = dirname(fileURLToPath(import.meta.url));
const state = JSON.parse(
  readFileSync(join(integrationDir, '.containers.json'), 'utf-8'),
) as ContainerState;

Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: state.databaseUrl,
  POSTGRES_USER: 'notifly',
  POSTGRES_PASSWORD: 'notifly',
  POSTGRES_DB: 'notifly_test',
  REDIS_HOST: state.redisHost,
  REDIS_PORT: String(state.redisPort),
  JWT_SECRET: 'integration-jwt-secret',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_SECRET: 'integration-refresh-secret',
  JWT_REFRESH_EXPIRES_IN: '7d',
  API_KEY: 'integration-system-api-key',
  DISABLE_CRON: 'true',
});
