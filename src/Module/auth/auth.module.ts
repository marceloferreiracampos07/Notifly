import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Authcontroller } from './controller/auth.controller.js';
import { AuthService } from './service/auth.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { jwtConstant } from './constants.js';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: jwtConstant.secret,
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '1d') as any,
        },
      }),
    }),
  ],
  controllers: [Authcontroller],
  providers: [AuthService],
})
export class AuthModule {}