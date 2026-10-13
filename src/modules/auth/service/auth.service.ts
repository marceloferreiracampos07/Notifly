import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateAuthDto } from '../DTO/register.dto.js';
import { UsersService } from '../../users/users.service.js';
import { PasswordHasher } from '../../../common/security/password-hasher.service.js';
import type { UserSession } from '../../interface_user/user-session.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async registerUser(data: CreateAuthDto) {
    return this.usersService.create(data);
  }

  async validateUser(email: string, pass: string): Promise<UserSession> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    const isPasswordValid = await this.passwordHasher.compare(pass, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas.');
    }

    return {
      id: user.id,
      email: user.email,
    };
  }
}
