import { Module } from '@nestjs/common';
import { DataIntakeController } from './data-intake.controller';
import { DataIntakeService } from './data-intake.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [SupabaseModule],
  controllers: [DataIntakeController],
  providers: [DataIntakeService],
  exports: [DataIntakeService],
})
export class DataIntakeModule {} 