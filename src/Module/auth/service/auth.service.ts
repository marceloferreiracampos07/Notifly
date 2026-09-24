import { ConflictException, Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { CreateAuthDto } from "../../DTO/register.dto.js";
import { JwtService } from "@nestjs/jwt";
import bcrypt from 'bcrypt';
import { ConfigService } from "@nestjs/config";

@Injectable()
export class AuthService {
    constructor(
        private readonly prismaService: PrismaService,
        private readonly jwtService: JwtService,
        private readonly configService: ConfigService
    ) {}

    private readonly saltRounds = 10;

    private async verifyEmailExists(email: string): Promise<void> {
        const existingUser = await this.prismaService.user.findUnique({
            where: { email },
        });

        if (existingUser) {
            throw new ConflictException("Este e-mail já está em uso. Por favor, utilize outro.");
        }
    }

    private async hashPassword(password: string): Promise<string> {
        return bcrypt.hash(password, this.saltRounds);
    }

    async registerUser(data: CreateAuthDto) {
        await this.verifyEmailExists(data.email);

        const hashedPassword = await this.hashPassword(data.password);

        const newUser = await this.prismaService.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
            },
        });

        const { password, ...userWithoutPassword } = newUser;
        return userWithoutPassword;
    }


    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.prismaService.user.findUnique({
            where: { email },
        });

        if (!user) {
            return null;
        }

        const isPasswordValid = await bcrypt.compare(pass, user.password);

        if (!isPasswordValid) {
            return null;
        }

        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }

    async generateJwtToken(user: any) {
        const payload = { 
            sub: user.id, 
            email: user.email 
        };

        return {
            access_token: await this.jwtService.signAsync(payload),
        };
    }
    getApiKey() {
    const apiKey = this.configService.get<string>('API_KEY');
    
    return {
      apiKey,
      message: 'API Key obtida com sucesso.',
    };
  }
}