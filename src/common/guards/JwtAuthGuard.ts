
import { CanActivate,ExecutionContext,Injectable, UnauthorizedException,} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()

export class JwtAuthGuard implements CanActivate{
    constructor(private readonly jwtservice:JwtService){}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest()
        const tokenjwt = this.extractTokenFromHeader(request)

    if (!tokenjwt) {
      throw new UnauthorizedException("o token jwt não foi fornecido ");
    }
    try {

      const payload = await this.jwtservice.verifyAsync(tokenjwt);
      request['user'] = payload;

    } catch {
      throw new UnauthorizedException("Token jwt invalido ");
    }
    return true;
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
}
    }
