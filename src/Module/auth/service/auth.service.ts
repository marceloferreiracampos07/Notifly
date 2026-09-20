import { ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service.js";
import { CreateAuthDto } from "../../DTO/register.dto.js";
import { JwtService } from "@nestjs/jwt";
import bcrypt from 'bcrypt';
import { LoginDto } from "../../DTO/login.dto.js";

@Injectable()
export class AuthService{
    constructor(private  prismaservice : PrismaService, private jwtService: JwtService){}
  private readonly saltRounds = bcrypt.genSaltSync(10);

async Verificaremail(data : CreateAuthDto){
const existeemail = await this.prismaservice.user.findUnique({where :{email: data.email}})
if(existeemail){
    throw new ConflictException("esse Email ja existe e ja está em uso , crie outro email ")
}
}
async Hashedsenha(data :CreateAuthDto){
 return bcrypt.hash(data.password ,this.saltRounds)
}
async Registeruser(data:  CreateAuthDto){
    await this.Verificaremail(data);

    const senhacriptogafada  = await this.Hashedsenha(data)

  const novo_usuario =  await this.prismaservice.user.create({data:{
    email: data.email,
    password : senhacriptogafada
  }})

  const { password, ...usuarioSemSenha } = novo_usuario;
    return usuarioSemSenha;
  
  
}
async LoginUser(data: LoginDto){
const user = await this.prismaservice.user.findUnique({where:{
    email:data.email
}})
if (!user) {
    throw new UnauthorizedException("E-mail ou senha inválidos")
}
const compararsenha = await bcrypt.compare(data.password, user.password)

if (!compararsenha) {
     throw new UnauthorizedException("E-mail ou senha inválidos");
}

const payload = { 
    sub: user.id, 
    email: user.email 
    };

    return {
        access_token: await this.jwtService.signAsync(payload)
    };
}
}