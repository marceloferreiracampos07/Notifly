import { Body, Controller , Get, Post  } from "@nestjs/common";
import { LoginDto } from "../../DTO/login.dto.js";
import { Authservice } from "../auth.service.js";

@Controller('auth')

export class Authcontroller{
    constructor(private readonly authservice:Authservice){}

@Post('login')
async login(@Body() loginDto:LoginDto){

}
}