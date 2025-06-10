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
      const savedVariables = [];
      
      for (const variable of variables) {
        try {
          // Extract required fields
          const id = variable.id; // Use the provided ID from the client
          const name = variable.name || 'Unnamed Variable';
          const type = variable.type || VariableType.UNKNOWN;
          const userId = variable.user_id; // Read user_id from DTO
          const organizationId = variable.organization_id; // Read organization_id from DTO
          
          // Validate required fields
          if (!userId || !organizationId) {
            this.logger.error(`Missing userId (${userId}) or organizationId (${organizationId}) for variable ${name}`);
            throw new Error(`User ID and Organization ID are required for variable ${name}`);
          }
          
          // Validate type
          const validType = Object.values(VariableType).includes(type as VariableType) 
            ? type 
            : VariableType.UNKNOWN;
          
          // Validate and normalize values array
          const normalizedValues = this.normalizeTimeSeriesValues(variable.values, name);
          
          // Create variable using Supabase
          const { data, error } = await client
            .from('variables')
            .insert({
              id, // Use the client-provided ID
              name,
              type: validType,
              values: normalizedValues,
              user_id: userId,
              organization_id: organizationId, // Add organization_id to insert
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
      
      const updatedVariables = [];
      
      for (const variable of variables) {
        try {
          // First check if the variable exists
          const { data: existingData, error: existingError } = await client
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
          
          if (variable.values !== undefined) {
            updateObj.values = this.normalizeTimeSeriesValues(variable.values, variable.name || existingData.name);
          }
          
          // Update the variable
          const { data: updatedData, error: updateError } = await client
            .from('variables')
            .update(updateObj)
            .eq('id', variable.id)
            .select()
            .single();
          
          if (updateError) {
            this.logger.error(`Failed to update variable ${variable.id}: ${updateError.message}`);
            throw new Error(`Failed to update variable: ${updateError.message}`);
          }
          
          updatedVariables.push(updatedData);
          this.logger.log(`Successfully updated variable ${variable.id}`);
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
      
      const deletedIds = [];
      
      for (const variableId of ids) {
        try {
          // First verify the variable exists and belongs to the user's organization
          const { data: existingData, error: existingError } = await client
            .from('variables')
            .select('id, organization_id, name')
            .eq('id', variableId)
            .single();
          
          if (existingError || !existingData) {
            this.logger.warn(`Variable with ID ${variableId} not found`);
            throw new NotFoundException(`Variable with ID ${variableId} not found`);
          }
          
          // Check if the variable belongs to the requesting user's organization
          if (existingData.organization_id !== requestingOrgId) {
            this.logger.warn(`User ${requestingUserId} attempted to delete variable ${variableId} from different organization`);
            throw new Error(`Access denied: Variable does not belong to your organization`);
          }
          
          // Delete the variable
          const { error: deleteError } = await client
            .from('variables')
            .delete()
            .eq('id', variableId);
          
          if (deleteError) {
            this.logger.error(`Failed to delete variable ${variableId}: ${deleteError.message}`);
            throw new Error(`Failed to delete variable: ${deleteError.message}`);
          }
          
          deletedIds.push(variableId);
          this.logger.log(`Successfully deleted variable ${variableId} (${existingData.name})`);
          
        } catch (varError) {
          this.logger.error(`Error deleting variable ${variableId}: ${varError.message}`);
          throw varError;
        }
      }
      
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
        // Normalize the value structure
        const normalizedValue: TimeSeriesPoint = {
          date: value.date,
          value: typeof value.value === 'number' ? value.value : 0,
        };
        
        // Validate date format
        const dateObj = new Date(value.date);
        if (isNaN(dateObj.getTime())) {
          this.logger.warn(`Invalid date format for variable ${variableName}: ${value.date}. Using current date.`);
          normalizedValue.date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD format
        }
        
        return normalizedValue;
      })
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); // Sort by date ascending
  }
} 