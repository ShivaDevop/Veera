import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomBytes } from 'crypto';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../database/prisma.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { LoginResponseDto } from './dto/login-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {}

  async validateUser(email: string, password: string): Promise<any> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const { passwordHash, ...result } = user;
    return result;
  }

  async login(
    loginDto: LoginDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    const tokens = await this.generateTokenPair(user.id, user.email);
    const refreshToken = await this.createRefreshToken(
      user.id,
      tokens.refreshToken,
      tokens.refreshTokenExpiresAt,
      ipAddress,
      userAgent,
    );

    await this.logLoginAttempt(user.id, 'login', true, ipAddress, userAgent);

    return {
      accessToken: tokens.accessToken,
      refreshToken: refreshToken.token,
      expiresIn: this.getAccessTokenExpiration(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
    };
  }

  async refreshToken(
    refreshTokenDto: RefreshTokenDto,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<LoginResponseDto> {
    const { refreshToken } = refreshTokenDto;

    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true },
    });

    if (!tokenRecord) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (tokenRecord.isRevoked) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (tokenRecord.expiresAt < new Date()) {
      await this.revokeRefreshToken(tokenRecord.id);
      throw new UnauthorizedException('Refresh token has expired');
    }

    if (!tokenRecord.user.isActive) {
      throw new UnauthorizedException('User account is inactive');
    }

    const user = tokenRecord.user;

    const newTokens = await this.generateTokenPair(user.id, user.email);
    const newRefreshToken = await this.createRefreshToken(
      user.id,
      newTokens.refreshToken,
      newTokens.refreshTokenExpiresAt,
      ipAddress,
      userAgent,
    );

    await this.revokeRefreshToken(tokenRecord.id, newRefreshToken.id);

    await this.logLoginAttempt(user.id, 'token_refresh', true, ipAddress, userAgent);

    return {
      accessToken: newTokens.accessToken,
      refreshToken: newRefreshToken.token,
      expiresIn: this.getAccessTokenExpiration(),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isActive: user.isActive,
      },
    };
  }

  async logout(refreshToken: string): Promise<void> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (tokenRecord && !tokenRecord.isRevoked) {
      await this.revokeRefreshToken(tokenRecord.id);
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        isRevoked: false,
      },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
      },
    });
  }

  private async generateTokenPair(userId: string, email: string) {
    const payload = { email, sub: userId };

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get<string>('jwt.expiration'),
    });

    const refreshToken = this.generateRefreshToken();
    const refreshTokenExpiresAt = new Date();
    refreshTokenExpiresAt.setDate(
      refreshTokenExpiresAt.getDate() + this.getRefreshTokenExpirationDays(),
    );

    return {
      accessToken,
      refreshToken,
      refreshTokenExpiresAt,
    };
  }

  private generateRefreshToken(): string {
    return randomBytes(64).toString('hex');
  }

  private async createRefreshToken(
    userId: string,
    token: string,
    expiresAt: Date,
    ipAddress?: string,
    userAgent?: string,
  ) {
    return this.prisma.refreshToken.create({
      data: {
        userId,
        token,
        expiresAt,
        ipAddress,
        userAgent,
      },
    });
  }

  private async revokeRefreshToken(
    tokenId: string,
    replacedById?: string,
  ): Promise<void> {
    await this.prisma.refreshToken.update({
      where: { id: tokenId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        replacedBy: replacedById || null,
      },
    });
  }

  private async logLoginAttempt(
    userId: string,
    action: string,
    success: boolean,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: success ? `${action}_success` : `${action}_failed`,
        entity: 'User',
        entityId: userId,
        changes: {
          success,
          timestamp: new Date().toISOString(),
        },
        ipAddress,
        userAgent,
      },
    });
  }

  async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return bcrypt.hash(password, saltRounds);
  }

  async validatePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  private getAccessTokenExpiration(): number {
    const expiration = this.configService.get<string>('jwt.expiration');
    return this.parseExpirationToSeconds(expiration);
  }

  private getRefreshTokenExpirationDays(): number {
    const expiration = this.configService.get<string>('jwt.refreshExpiration');
    return this.parseExpirationToDays(expiration);
  }

  private parseExpirationToSeconds(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 's':
        return value;
      case 'm':
        return value * 60;
      case 'h':
        return value * 3600;
      case 'd':
        return value * 86400;
      default:
        return 900;
    }
  }

  private parseExpirationToDays(expiration: string): number {
    const unit = expiration.slice(-1);
    const value = parseInt(expiration.slice(0, -1), 10);

    switch (unit) {
      case 'd':
        return value;
      case 'h':
        return Math.ceil(value / 24);
      case 'm':
        return Math.ceil(value / (24 * 60));
      case 's':
        return Math.ceil(value / (24 * 3600));
      default:
        return 7;
    }
  }

  async cleanupExpiredTokens(): Promise<number> {
    const result = await this.prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { expiresAt: { lt: new Date() } },
          {
            isRevoked: true,
            revokedAt: {
              lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        ],
      },
    });

    return result.count;
  }

  async getUserRoles(userId: string, activeRole?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const roles = user.roles
      .filter((ur) => ur.role.isActive && !ur.role.deletedAt)
      .map((ur) => ur.role.name);

    return {
      roles,
      activeRole: activeRole && roles.includes(activeRole) ? activeRole : undefined,
    };
  }

  async validateUserRole(userId: string, role: string): Promise<void> {
    const userRoles = await this.getUserRoles(userId);

    if (!userRoles.roles.includes(role as any)) {
      throw new ForbiddenException(
        `User does not have the role: ${role}. Available roles: ${userRoles.roles.join(', ')}`,
      );
    }
  }
}
