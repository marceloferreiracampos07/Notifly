import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validação-env-vars.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './Module/auth/auth.module.js';
import { UsersModule } from './Module/users/users.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
  ],
})
export class AppModule {}