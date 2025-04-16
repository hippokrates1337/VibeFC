import { Injectable, Logger } from '@nestjs/common';
import { AddVariablesDto, VariableDto, VariableType, TimeSeriesPoint } from './dto/add-variables.dto';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class DataIntakeService {
  private readonly logger = new Logger(DataIntakeService.name);
  
  constructor(
    private supabase: SupabaseService
  ) {}

  async addVariables(addVariablesDto: AddVariablesDto) {
    const { variables } = addVariablesDto;
    
    this.logger.log(`Processing ${variables?.length || 0} variables`);
    
    if (!variables || variables.length === 0) {
      this.logger.warn('No variables received in request');
      return {
        message: 'No variables to add',
        count: 0,
        variables: [],
      };
    }
    
    try {
      const savedVariables = [];
      
      for (const variable of variables) {
        try {
          // Extract required fields
          const name = variable.name || 'Unnamed Variable';
          const type = variable.type || VariableType.UNKNOWN;
          const userId = variable.userId || 'anonymous';
          
          // Validate type
          const validType = Object.values(VariableType).includes(type as VariableType) 
            ? type 
            : VariableType.UNKNOWN;
          
          // Validate and normalize values array
          let normalizedValues: TimeSeriesPoint[] = [];
          if (Array.isArray(variable.values)) {
            // Filter out any invalid entries and ensure proper format
            normalizedValues = variable.values
              .filter(item => item && typeof item === 'object')
              .map(item => {
                // Ensure date is a string
                const dateValue = item.date;
                let dateStr: string | null = null;
                
                if (typeof dateValue === 'string') {
                  dateStr = dateValue;
                } else if (typeof dateValue === 'object' && dateValue !== null && 'toISOString' in dateValue) {
                  // Safe way to check if it's a Date-like object with toISOString method
                  try {
                    // Explicit type assertion
                    const dateObj = dateValue as { toISOString(): string };
                    dateStr = dateObj.toISOString().split('T')[0];
                  } catch (e) {
                    this.logger.warn(`Error converting date object: ${e.message}`);
                  }
                }
                
                // Ensure value is a number or null
                let numValue: number | null = null;
                if (item.value === null) {
                  numValue = null;
                } else if (typeof item.value === 'number') {
                  numValue = item.value;
                } else if (item.value !== undefined && !isNaN(Number(item.value))) {
                  numValue = Number(item.value);
                }
                
                if (!dateStr) {
                  this.logger.warn(`Skipping entry with invalid date format for variable ${name}`);
                  return null;
                }
                
                return { date: dateStr, value: numValue };
              })
              .filter((item): item is TimeSeriesPoint => item !== null);
          }
          
          // Create variable using Supabase
          const { data, error } = await this.supabase.client
            .from('variables')
            .insert({
              id: uuidv4(),
              name,
              type: validType,
              values: normalizedValues,
              user_id: userId,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();
          
          if (error) {
            this.logger.error(`Failed to save variable ${name}: ${error.message}`);
            throw new Error(`Failed to save variable: ${error.message}`);
          }
          
          savedVariables.push(data);
        } catch (varError) {
          this.logger.error(`Error processing variable: ${varError.message}`);
          throw varError; // Re-throw to be caught by the outer try/catch
        }
      }
      
      this.logger.log(`Successfully added ${savedVariables.length} variables`);
      
      return {
        message: 'Variables added successfully',
        count: savedVariables.length,
        variables: savedVariables,
      };
    } catch (error) {
      this.logger.error(`Error adding variables: ${error.message}`);
      throw new Error(`Error adding variables: ${error.message}`);
    }
  }
} 