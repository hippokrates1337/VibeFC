import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { InvitesClaimService } from './invites-claim.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@Module({
  imports: [SupabaseModule],
  controllers: [UsersController],
  providers: [InvitesClaimService, JwtAuthGuard],
})
export class UsersModule {}
