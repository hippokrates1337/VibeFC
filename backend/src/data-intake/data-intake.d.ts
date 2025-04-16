declare module './data-intake.controller' {
  import { DataIntakeService } from './data-intake.service';
  import { AddVariablesDto } from './dto/add-variables.dto';
  
  export class DataIntakeController {
    constructor(dataIntakeService: DataIntakeService);
    addVariables(addVariablesDto: AddVariablesDto): Promise<any>;
  }
}

declare module './data-intake.service' {
  import { AddVariablesDto } from './dto/add-variables.dto';
  import { SupabaseService } from '../supabase/supabase.service';
  
  export class DataIntakeService {
    constructor(supabase: SupabaseService);
    addVariables(addVariablesDto: AddVariablesDto): Promise<any>;
  }
}

declare module './dto/add-variables.dto' {
  export class VariableDto {
    metadata: Record<string, any>;
    values: number[];
  }
  
  export class AddVariablesDto {
    variables: VariableDto[];
  }
} 