import { Controller, Post, UseGuards, HttpCode, HttpStatus, Body, Request } from "@nestjs/common";
import { AuthService } from "../service/auth.service.js";
import { LocalAuthGuard } from "../../../common/guards/local-auth.guard.js";
import { ApiKeyGuard } from "../../../common/guards/ApiKeyGuard.js";
import { CreateAuthDto } from "../../DTO/register.dto.js";
import { LoginDto } from "../../DTO/login.dto.js";
import { UserSession } from "../../interface_user/user-session.interface.js";

@Controller('auth')
export class AuthController {
    constructor(private readonly authservice: AuthService) {}

    @UseGuards(LocalAuthGuard)
    @HttpCode(HttpStatus.OK)
    @Post('login')
    async login(@Body() loginDto: LoginDto, @Request() req: { user: UserSession }) {
        const userValidated = req.user;
        const tokenData = await this.authservice.generateJwtToken(userValidated);
        
        return {
            ...tokenData,
            user: userValidated,
        };
    }

    @HttpCode(HttpStatus.CREATED)
    @Post('register')
    async register(@Body() createuserdto: CreateAuthDto) {
        return await this.authservice.registerUser(createuserdto);
    }

    @UseGuards(ApiKeyGuard)
    @HttpCode(HttpStatus.OK)
    @Post('api-keys')
    async getApiKey() {
        return this.authservice.getApiKey();
    }
}