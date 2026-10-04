import { Injectable } from '@nestjs/common';
import { CreateAuthDto } from '../../DTO/register.dto.js';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { UsersService } from '../../users/users.service.js';
import type { UserSession } from '../../interface_user/user-session.interface.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async registerUser(data: CreateAuthDto) {
    return this.usersService.create(data);
  }

  async validateUser(email: string, pass: string): Promise<UserSession | null> {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(pass, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
    };
  }

  async generateJwtToken(user: UserSession) {
    const payload = {
      sub: user.id,
      email: user.email,
    };

    return {
      access_token: await this.jwtService.signAsync(payload),
    };
  }
}