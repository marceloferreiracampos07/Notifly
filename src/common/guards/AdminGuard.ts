import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { SYSTEM_ADMIN_ID } from '../constants/auth.constants.js';

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();

    if (request.user?.id !== SYSTEM_ADMIN_ID) {
      throw new ForbiddenException(
        'Acesso negado: apenas administradores podem executar esta operação.',
      );
    }

    return true;
  }
}
