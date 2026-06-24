import { Controller, Post, Get, Patch, Body, Param, UseGuards, Request, HttpCode } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './local-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @UseGuards(LocalAuthGuard)
  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Login with email and password' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  async register(@Body() dto: { email: string; name: string; password: string; role?: string }) {
    return this.authService.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async profile(@Request() req) {
    return this.authService.getProfile(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get('users')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all users (admin)' })
  async listUsers() {
    return this.authService.listUsers();
  }

  @UseGuards(JwtAuthGuard)
  @Patch('users/:id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update user' })
  async updateUser(@Param('id') id: string, @Body() dto: any) {
    return this.authService.updateUser(id, dto);
  }
}
