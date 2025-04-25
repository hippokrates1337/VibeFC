import { Module } from '@nestjs/common';
import { OrganizationsController } from './controllers/organizations.controller';
import { OrganizationsService } from './services/organizations.service';
import { MembersController } from './controllers/members.controller';
import { MembersService } from './services/members.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [OrganizationsController, MembersController],
  providers: [OrganizationsService, MembersService],
  exports: [OrganizationsService, MembersService],
})
export class OrganizationsModule {} 