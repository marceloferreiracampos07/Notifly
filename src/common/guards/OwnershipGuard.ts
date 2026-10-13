import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SYSTEM_ADMIN_ID } from '../constants/auth.constants.js';

@Injectable()
export class OwnershipGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const currentUser = request.user;
    const targetId = request.params?.id;

    const isAdmin = currentUser?.id === SYSTEM_ADMIN_ID;

    if (!isAdmin && currentUser?.id !== targetId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar ou manipular os dados deste usuário.',
      );
    }

    return true;
  }
}
