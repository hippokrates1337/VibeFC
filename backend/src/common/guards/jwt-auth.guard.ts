import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private supabaseService: SupabaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      // Extract the JWT token from the Authorization header
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing or invalid authorization token');
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verify the JWT token with Supabase
      const { data, error } = await this.supabaseService.client.auth.getUser(token);
      
      if (error || !data.user) {
        throw new UnauthorizedException('Invalid token or user not found');
      }
      
      // Add the user data to the request object
      request.user = data.user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }
} 