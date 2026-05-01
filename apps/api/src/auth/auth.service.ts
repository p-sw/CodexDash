import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthResponse, UserProfile } from '@codexdash/shared-types';
import { hashPassword, verifyPassword } from './password-hasher';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthResponse> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name.trim(),
        passwordHash: await hashPassword(dto.password),
      },
    });

    return this.toAuthResponse(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || !(await verifyPassword(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.toAuthResponse(user);
  }

  async me(userId: string): Promise<UserProfile> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private async toAuthResponse(user: {
    id: string;
    email: string;
    name: string;
    createdAt: Date;
  }): Promise<AuthResponse> {
    return {
      token: await this.jwtService.signAsync({
        sub: user.id,
        email: user.email,
      }),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt.toISOString(),
      },
    };
  }
}
