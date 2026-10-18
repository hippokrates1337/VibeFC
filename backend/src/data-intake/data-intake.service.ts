import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { Request } from 'express';

// DTOs
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
import { VariableDto, VariableType, TimeSeriesPoint, VariableEntity } from './dto/variable.dto';

@Injectable()
export class DataIntakeService {
  private readonly logger = new Logger(DataIntakeService.name);
  
  constructor(
    private supabase: SupabaseOptimizedService
  ) {}

  // CREATE - Add new variables
  async addVariables(addVariablesDto: AddVariablesDto, request: Request) {
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
      const client = this.supabase.getClientForRequest(request);
      const now = new Date().toISOString();
      const payload = variables.map((variable) => {
        const name = variable.name || 'Unnamed Variable';
        const userId = variable.user_id;
        const organizationId = variable.organization_id;
        if (!userId || !organizationId) {
          throw new Error(`User ID and Organization ID are required for variable ${name}`);
        }

        const validType = Object.values(VariableType).includes(variable.type as VariableType)
          ? variable.type
          : VariableType.UNKNOWN;

        return {
          id: variable.id,
          name,
          type: validType,
          values: this.normalizeTimeSeriesValues(variable.values, name),
          user_id: userId,
          organization_id: organizationId,
          created_at: now,
          updated_at: now,
        };
      });

      const { data: savedVariables, error } = await client
        .from('variables')
        .insert(payload)
        .select();

      if (error) {
        this.logger.error(`Failed to save variables batch: ${error.message}`);
        throw new Error(`Failed to save variables: ${error.message}`);
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
  async getVariablesByUser(userId: string, request: Request) {
    try {
      const client = this.supabase.getClientForRequest(request);
      this.logger.log(`Fetching organizations for user: ${userId}`);
      
      // Step 1: Get organization IDs for the user
      const { data: orgMembers, error: orgError } = await client
        .from('organization_members') // ASSUMPTION: Table linking users and orgs
        .select('organization_id')
        .eq('user_id', userId);

      if (orgError) {
        this.logger.error(`Failed to fetch organizations for user ${userId}: ${orgError.message}`);
        throw new Error(`Failed to fetch organizations: ${orgError.message}`);
      }

      if (!orgMembers || orgMembers.length === 0) {
        this.logger.warn(`User ${userId} is not a member of any organization.`);
        return {
          message: 'User not found in any organization or no variables available for their organizations',
          count: 0,
          variables: [],
        };
      }

      const organizationIds = orgMembers.map(member => member.organization_id);
      this.logger.log(`User ${userId} belongs to organizations: ${organizationIds.join(', ')}`);

      // Step 2: Fetch variables belonging to those organizations
      this.logger.log(`Fetching variables for organizations: ${organizationIds.join(', ')}`);
      const { data, error } = await client
        .from('variables')
        .select('*')
        .in('organization_id', organizationIds); // ASSUMPTION: 'variables' table has 'organization_id'

      if (error) {
        this.logger.error(`Failed to fetch variables for organizations ${organizationIds.join(', ')}: ${error.message}`);
        throw new Error(`Failed to fetch variables: ${error.message}`);
      }

      if (!data || data.length === 0) {
        this.logger.warn(`No variables found for organizations ${organizationIds.join(', ')}`);
        // It's possible the user is in orgs, but those orgs have no variables
        return {
          message: 'No variables found for the user\'s organizations',
          count: 0,
          variables: [],
        };
      }

      this.logger.log(`Found ${data.length} variables for organizations associated with user ${userId}`);

      return {
        message: 'Variables retrieved successfully',
        count: data.length,
        variables: data,
      };
    } catch (error) {
      // Catch potential errors from the revised logic or re-thrown errors
      this.logger.error(`Error in getVariablesByUser for user ${userId}: ${error.message}`);
      // Ensure a consistent error response structure if desired, or rethrow
      throw new Error(`Error fetching variables by user's organizations: ${error.message}`);
    }
  }

  // UPDATE - Update variables
  async updateVariables(updateVariablesDto: UpdateVariablesDto, request: Request) {
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
      const client = this.supabase.getClientForRequest(request);
      this.logger.log(`Updating ${variables.length} variables`);
      
      const variableIds = variables.map((variable) => variable.id);
      const { data: existingRows, error: existingError } = await client
        .from('variables')
        .select('*')
        .in('id', variableIds);

      if (existingError) {
        throw new Error(`Failed to verify existing variables: ${existingError.message}`);
      }

      const existingById = new Map((existingRows || []).map((row) => [row.id, row]));
      for (const variable of variables) {
        if (!existingById.has(variable.id)) {
          this.logger.warn(`Variable with ID ${variable.id} not found`);
          throw new NotFoundException(`Variable with ID ${variable.id} not found`);
        }
      }

      const updateResults = await Promise.all(
        variables.map(async (variable) => {
          const existingData = existingById.get(variable.id);
          const updateObj: Partial<VariableEntity> = {
            updated_at: new Date().toISOString(),
          };

          if (variable.name !== undefined) {
            updateObj.name = variable.name;
          }
          if (variable.type !== undefined) {
            updateObj.type = variable.type;
          }
          if (variable.values !== undefined) {
            updateObj.values = this.normalizeTimeSeriesValues(variable.values, variable.name || existingData.name);
          }

          const { data: updatedData, error: updateError } = await client
            .from('variables')
            .update(updateObj)
            .eq('id', variable.id)
            .select()
            .single();

          if (updateError) {
            throw new Error(`Failed to update variable ${variable.id}: ${updateError.message}`);
          }
          return updatedData;
        })
      );
      
      this.logger.log(`Successfully updated ${updateResults.length} variables`);
      
      return {
        message: 'Variables updated successfully',
        count: updateResults.length,
        variables: updateResults,
      };
    } catch (error) {
      this.logger.error(`Error updating variables: ${error.message}`);
      throw new Error(`Error updating variables: ${error.message}`);
    }
  }

  // DELETE - Delete variables
  async deleteVariables(
    deleteVariablesDto: DeleteVariablesDto, 
    requestingUserId: string, // Added user ID from controller
    requestingOrgId: string, // Added organization ID from controller
    request: Request
  ) {
    const { ids } = deleteVariablesDto;
    
    if (!ids || ids.length === 0) {
      this.logger.warn('No variable IDs received for deletion');
      return {
        message: 'No variables to delete',
        count: 0,
        deletedIds: [],
      };
    }
    
    try {
      const client = this.supabase.getClientForRequest(request);
      this.logger.log(`Deleting ${ids.length} variables for user ${requestingUserId} in org ${requestingOrgId}`);

      const { data: existingRows, error: existingError } = await client
        .from('variables')
        .select('id, organization_id, name')
        .in('id', ids);

      if (existingError) {
        throw new Error(`Failed to verify variables before deletion: ${existingError.message}`);
      }

      const existingById = new Map((existingRows || []).map((row) => [row.id, row]));
      for (const variableId of ids) {
        const existingData = existingById.get(variableId);
        if (!existingData) {
          throw new NotFoundException(`Variable with ID ${variableId} not found`);
        }
        if (existingData.organization_id !== requestingOrgId) {
          throw new Error(`Access denied: Variable does not belong to your organization`);
        }
      }

      const { error: deleteError } = await client
        .from('variables')
        .delete()
        .in('id', ids);

      if (deleteError) {
        throw new Error(`Failed to delete variables: ${deleteError.message}`);
      }

      const deletedIds = ids;
      
      this.logger.log(`Successfully deleted ${deletedIds.length} variables`);
      
      return {
        message: 'Variables deleted successfully',
        count: deletedIds.length,
        deletedIds: deletedIds,
      };
    } catch (error) {
      this.logger.error(`Error deleting variables: ${error.message}`);
      throw new Error(`Error deleting variables: ${error.message}`);
    }
  }

  /**
   * Helper method to convert date to first of month in YYYY-MM-DD format
   * This ensures consistency with MM-YYYY period calculations
   */
  private normalizeToFirstOfMonth(dateInput: string): string {
    try {
      const date = new Date(dateInput);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().slice(0, 7) + '-01'; // Current month, first day
      }
      
      // Set to first day of the month
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      
      return date.toISOString().slice(0, 10); // YYYY-MM-DD format
    } catch (error) {
      this.logger.warn(`Error normalizing date ${dateInput}, using current month first day`);
      return new Date().toISOString().slice(0, 7) + '-01';
    }
  }

  /**
   * Convert YYYY-MM-DD date to MM-YYYY format for period comparisons
   */
  private dateToMMYYYY(dateString: string): string {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return new Date().toISOString().slice(5, 7) + '-' + new Date().getFullYear();
      }
      
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${month}-${year}`;
    } catch (error) {
      const now = new Date();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      return `${month}-${now.getFullYear()}`;
    }
  }

  private normalizeTimeSeriesValues(values: TimeSeriesPoint[], variableName: string): TimeSeriesPoint[] {
    if (!values || !Array.isArray(values)) {
      this.logger.warn(`Invalid values array for variable ${variableName}. Using empty array.`);
      return [];
    }

    return values
      .filter(value => {
        // Filter out invalid entries
        if (!value || typeof value !== 'object') {
          this.logger.warn(`Invalid value entry for variable ${variableName}:`, value);
          return false;
        }
        
        if (!value.date) {
          this.logger.warn(`Missing date for value entry in variable ${variableName}:`, value);
          return false;
        }
        
        return true;
      })
      .map(value => {
        // Normalize the value structure with consistent first-of-month dates
        const normalizedValue: TimeSeriesPoint = {
          date: this.normalizeToFirstOfMonth(value.date), // Ensure first of month
          value: typeof value.value === 'number' ? value.value : 0,
        };
        
        // Log the normalization for debugging MM-YYYY period consistency
        if (value.date !== normalizedValue.date) {
          this.logger.debug(`Date normalized for variable ${variableName}: ${value.date} -> ${normalizedValue.date} (MM-YYYY: ${this.dateToMMYYYY(normalizedValue.date)})`);
        }
        
        return normalizedValue;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending
  }
} 