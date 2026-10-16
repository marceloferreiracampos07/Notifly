import { execSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { RedisContainer, type StartedRedisContainer } from '@testcontainers/redis';

interface ContainerState {
  databaseUrl: string;
  redisHost: string;
  redisPort: number;
}

const integrationDir = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(integrationDir, '..', '..');
const statePath = join(integrationDir, '.containers.json');

let postgres: StartedPostgreSqlContainer | undefined;
let redis: StartedRedisContainer | undefined;

export async function setup(): Promise<void> {
  postgres = await new PostgreSqlContainer('postgres:15-alpine')
    .withDatabase('notifly_test')
    .withUsername('notifly')
    .withPassword('notifly')
    .start();

  redis = await new RedisContainer('redis:7-alpine').start();

  const state: ContainerState = {
    databaseUrl: postgres.getConnectionUri(),
    redisHost: redis.getHost(),
    redisPort: redis.getPort(),
  };

  writeFileSync(statePath, JSON.stringify(state, null, 2));

  execSync('npx prisma migrate deploy', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: state.databaseUrl },
  });
}

export async function teardown(): Promise<void> {
  await redis?.stop();
  await postgres?.stop();
  rmSync(statePath, { force: true });
}
