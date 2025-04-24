import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

// DTOs
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
import { VariableDto, VariableType, TimeSeriesPoint, VariableEntity } from './dto/variable.dto';

@Injectable()
export class DataIntakeService {
  private readonly logger = new Logger(DataIntakeService.name);
  
  constructor(
    private supabase: SupabaseService
  ) {}

  // CREATE - Add new variables
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
          const id = variable.id; // Use the provided ID from the client
          const name = variable.name || 'Unnamed Variable';
          const type = variable.type || VariableType.UNKNOWN;
          const userId = variable.userId || 'anonymous';
          
          // Validate type
          const validType = Object.values(VariableType).includes(type as VariableType) 
            ? type 
            : VariableType.UNKNOWN;
          
          // Validate and normalize values array
          const normalizedValues = this.normalizeTimeSeriesValues(variable.values, name);
          
          // Create variable using Supabase
          const { data, error } = await this.supabase.client
            .from('variables')
            .insert({
              id, // Use the client-provided ID
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

  // READ - Get variables by user ID
  async getVariablesByUser(userId: string) {
    try {
      this.logger.log(`Fetching variables for user: ${userId}`);
      
      const { data, error } = await this.supabase.client
        .from('variables')
        .select('*')
        .eq('user_id', userId);
      
      if (error) {
        this.logger.error(`Failed to fetch variables for user ${userId}: ${error.message}`);
        throw new Error(`Failed to fetch variables: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        this.logger.warn(`No variables found for user ${userId}`);
        return {
          message: 'No variables found',
          count: 0,
          variables: [],
        };
      }
      
      this.logger.log(`Found ${data.length} variables for user ${userId}`);
      
      return {
        message: 'Variables retrieved successfully',
        count: data.length,
        variables: data,
      };
    } catch (error) {
      this.logger.error(`Error fetching variables for user ${userId}: ${error.message}`);
      throw new Error(`Error fetching variables: ${error.message}`);
    }
  }

  // UPDATE - Update variables
  async updateVariables(updateVariablesDto: UpdateVariablesDto) {
    const { variables } = updateVariablesDto;
    
    if (!variables || variables.length === 0) {
      this.logger.warn('No variables received for update');
      return {
        message: 'No variables to update',
        count: 0,
        variables: [],
      };
    }
    
    try {
      this.logger.log(`Updating ${variables.length} variables`);
      
      const updatedVariables = [];
      
      for (const variable of variables) {
        try {
          // First check if the variable exists
          const { data: existingData, error: existingError } = await this.supabase.client
            .from('variables')
            .select('*')
            .eq('id', variable.id)
            .single();
          
          if (existingError || !existingData) {
            this.logger.warn(`Variable with ID ${variable.id} not found`);
            throw new NotFoundException(`Variable with ID ${variable.id} not found`);
          }
          
          // Prepare update object with only the fields that are provided
          const updateObj: Partial<VariableEntity> = {
            updated_at: new Date().toISOString(),
          };
          
          if (variable.name !== undefined) {
            updateObj.name = variable.name;
          }
          
          if (variable.type !== undefined) {
            updateObj.type = variable.type;
          }
          
          // Handle values array update if provided
          if (variable.values && Array.isArray(variable.values)) {
            // Normalize values array the same way as in addVariables
            const normalizedValues = this.normalizeTimeSeriesValues(variable.values, existingData.name);
            updateObj.values = normalizedValues;
          }
          
          // Update the variable
          const { data, error } = await this.supabase.client
            .from('variables')
            .update(updateObj)
            .eq('id', variable.id)
            .select()
            .single();
          
          if (error) {
            this.logger.error(`Failed to update variable ${variable.id}: ${error.message}`);
            throw new Error(`Failed to update variable: ${error.message}`);
          }
          
          updatedVariables.push(data);
        } catch (varError) {
          this.logger.error(`Error updating variable ${variable.id}: ${varError.message}`);
          throw varError;
        }
      }
      
      this.logger.log(`Successfully updated ${updatedVariables.length} variables`);
      
      return {
        message: 'Variables updated successfully',
        count: updatedVariables.length,
        variables: updatedVariables,
      };
    } catch (error) {
      this.logger.error(`Error updating variables: ${error.message}`);
      throw error;
    }
  }

  // DELETE - Delete variables
  async deleteVariables(deleteVariablesDto: DeleteVariablesDto) {
    const { ids } = deleteVariablesDto;
    
    if (!ids || ids.length === 0) {
      this.logger.warn('No variable IDs received for deletion');
      return {
        message: 'No variables to delete',
        count: 0,
      };
    }
    
    try {
      this.logger.log(`Deleting ${ids.length} variables`);
      
      // First verify which variables exist
      const { data: existingData, error: existingError } = await this.supabase.client
        .from('variables')
        .select('id')
        .in('id', ids);
      
      if (existingError) {
        this.logger.error(`Failed to verify existing variables: ${existingError.message}`);
        throw new Error(`Failed to verify existing variables: ${existingError.message}`);
      }
      
      const existingIds = existingData.map(item => item.id);
      const nonExistingIds = ids.filter(id => !existingIds.includes(id));
      
      if (nonExistingIds.length > 0) {
        this.logger.warn(`Some variables not found: ${nonExistingIds.join(', ')}`);
        // We'll continue with deletion of existing ones
      }
      
      if (existingIds.length === 0) {
        this.logger.warn('None of the specified variables were found');
        return {
          message: 'No variables found to delete',
          count: 0,
        };
      }
      
      // Delete the existing variables
      const { error: deleteError } = await this.supabase.client
        .from('variables')
        .delete()
        .in('id', existingIds);
      
      if (deleteError) {
        this.logger.error(`Failed to delete variables: ${deleteError.message}`);
        throw new Error(`Failed to delete variables: ${deleteError.message}`);
      }
      
      this.logger.log(`Successfully deleted ${existingIds.length} variables`);
      
      return {
        message: 'Variables deleted successfully',
        count: existingIds.length,
      };
    } catch (error) {
      this.logger.error(`Error deleting variables: ${error.message}`);
      throw error;
    }
  }

  // Helper method to normalize time series values
  private normalizeTimeSeriesValues(values: TimeSeriesPoint[], variableName: string): TimeSeriesPoint[] {
    if (!Array.isArray(values)) {
      return [];
    }
    
    return values
      .filter(item => item && typeof item === 'object')
      .map(item => {
        // Ensure date is a string
        const dateValue = item.date;
        let dateStr: string | null = null;
        
        if (typeof dateValue === 'string') {
          dateStr = dateValue;
        } else if (typeof dateValue === 'object' && dateValue !== null && 'toISOString' in dateValue) {
          try {
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
          this.logger.warn(`Skipping entry with invalid date format for variable ${variableName}`);
          return null;
        }
        
        return { date: dateStr, value: numValue };
      })
      .filter((item): item is TimeSeriesPoint => item !== null);
  }
} 