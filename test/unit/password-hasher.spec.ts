import { describe, it, expect, beforeEach } from 'vitest';
import { PasswordHasher } from '../../src/common/security/password-hasher.service.js';

describe('PasswordHasher', () => {
  let passwordHasher: PasswordHasher;

  beforeEach(() => {
    passwordHasher = new PasswordHasher();
  });

  it('deve gerar um hash diferente da senha em texto puro', async () => {
    const hash = await passwordHasher.hash('senha-secreta');

    expect(hash).not.toBe('senha-secreta');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('deve validar a senha correta e rejeitar a incorreta', async () => {
    const hash = await passwordHasher.hash('senha-secreta');

    await expect(passwordHasher.compare('senha-secreta', hash)).resolves.toBe(true);
    await expect(passwordHasher.compare('senha-errada', hash)).resolves.toBe(false);
  });
});
