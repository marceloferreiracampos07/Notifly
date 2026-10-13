import { Module } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';
import { PasswordHasher } from '../../common/security/password-hasher.service.js';
import { AdminGuard } from '../../common/guards/AdminGuard.js';
import { OwnershipGuard } from '../../common/guards/OwnershipGuard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [UsersController],
  providers: [UsersService, PasswordHasher, AdminGuard, OwnershipGuard],
  exports: [UsersService],
})
export class UsersModule {}
