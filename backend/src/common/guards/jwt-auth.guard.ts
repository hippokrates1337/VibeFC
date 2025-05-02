import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { CanActivate } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly logger = new Logger(JwtAuthGuard.name);
  private supabaseAdminClient: SupabaseClient; // Keep an admin client for auth checks if needed

  constructor(private configService: ConfigService) {
    // Initialize a basic client (using anon key) specifically for auth checks
    // This avoids injecting the request-scoped SupabaseService into the guard
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      this.logger.error('Supabase URL or Anon Key not configured for JWT Guard');
      // Throwing here might prevent app startup, consider logging and letting requests fail?
      throw new Error('Supabase credentials for JWT Guard are not configured.');
    }
    
    this.supabaseAdminClient = createClient(supabaseUrl, supabaseAnonKey, {
       auth: {
         autoRefreshToken: false,
         persistSession: false
       }
     });
     this.logger.log('JWT Guard initialized with Supabase client (anon key) for auth checks.');
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    try {
      const authHeader = request.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new UnauthorizedException('Missing or invalid authorization token');
      }
      
      const token = authHeader.split(' ')[1];
      
      // Verify the JWT token using the guard's dedicated client
      const { data: { user }, error } = await this.supabaseAdminClient.auth.getUser(token);
      
      if (error) {
         this.logger.warn(`JWT validation error: ${error.message}`);
         throw new UnauthorizedException('Invalid token');
      }
      
      if (!user) {
        this.logger.warn('JWT valid but no user found');
        throw new UnauthorizedException('User not found for token');
      }
      
      // Add the user data to the request object for use in subsequent handlers/services
      // IMPORTANT: Ensure the structure matches what controllers/services expect (e.g., userId)
      request.user = { 
        id: user.id, // Standard Supabase user object has `id`
        userId: user.id, // Add userId if other code expects it specifically
        email: user.email,
        // Include other relevant fields from `user` if necessary
        // organizationId might need to be fetched separately later if not in JWT
       };
      
      this.logger.log(`User ${user.id} authenticated successfully.`);
      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error; // Re-throw known auth errors
      }
      this.logger.error(`Unexpected error during authentication: ${error.message}`, error.stack);
      throw new UnauthorizedException('Authentication failed due to an unexpected error');
    }
  }
} 