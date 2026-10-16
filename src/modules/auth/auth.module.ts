import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './controller/auth.controller.js';
import { AuthService } from './service/auth.service.js';
import { TokenService } from './service/token.service.js';
import { ApiKeyService } from './service/api-key.service.js';
import { PasswordHasher } from '../../common/security/password-hasher.service.js';
import { LocalStrategy } from './strategies/local.strategy.js';
import { JwtStrategy } from './strategies/jwt.strategy.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { UsersModule } from '../users/users.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    PassportModule.register({}),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d') as any,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    ApiKeyService,
    PasswordHasher,
    LocalStrategy,
    JwtStrategy,
  ],
  exports: [AuthService, TokenService, ApiKeyService],
})
export class AuthModule {}
