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
          const { data, error } = await this.supabase.client
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
  async getVariablesByUser(userId: string) {
    try {
      this.logger.log(`Fetching organizations for user: ${userId}`);
      
      // Step 1: Get organization IDs for the user
      const { data: orgMembers, error: orgError } = await this.supabase.client
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
      const { data, error } = await this.supabase.client
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
  async deleteVariables(
    deleteVariablesDto: DeleteVariablesDto, 
    requestingUserId: string, // Added user ID from controller
    requestingOrgId: string // Added organization ID from controller
  ) {
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
      
      // === Security Enhancement: We need user context here ===
      // The current implementation doesn't receive the user ID or organization ID.
      // To securely delete, the service method needs access to the requesting user's ID
      // and their associated organization(s).
      // This requires modifying the controller to pass the user context (e.g., req.user.userId)
      // and potentially the organization context to this service method.
      
      // First verify which variables exist AND belong to the user/org
      const { data: existingData, error: existingError } = await this.supabase.client
        .from('variables')
        .select('id')
        .in('id', ids)
        .eq('user_id', requestingUserId) // Check ownership
        .eq('organization_id', requestingOrgId); // Check organization membership
        
      if (existingError) {
        this.logger.error(`Failed to verify existing variables for user ${requestingUserId} in org ${requestingOrgId}: ${existingError.message}`);
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
        .in('id', existingIds)
        .eq('user_id', requestingUserId) // Ensure user owns the records
        .eq('organization_id', requestingOrgId); // Ensure records belong to the org
      
      if (deleteError) {
        this.logger.error(`Failed to delete variables for user ${requestingUserId} in org ${requestingOrgId}: ${deleteError.message}`);
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
      .filter(item => item && typeof item === 'object') // Keep initial filter for null/non-object entries
      .map((item: any) => { // Explicitly type item as any for flexible processing
        // Ensure date is a valid YYYY-MM-DD string
        const dateValue = item.date;
        let dateStr: string | null = null;
        
        if (typeof dateValue === 'string') {
          // Very basic check, consider a regex or date library for stricter validation
          if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) { 
            dateStr = dateValue;
          }
        } else if (dateValue instanceof Date && !isNaN(dateValue.getTime())) { // Check if it's a Date object
           try {
             dateStr = dateValue.toISOString().split('T')[0];
           } catch (e) {
             // already handled by isNaN check, but keep for safety
           }
        }

        // If date is invalid, skip this entry entirely
        if (!dateStr) {
          this.logger.warn(`Skipping entry with invalid or missing date format for variable ${variableName}: ${JSON.stringify(item)}`);
          return null;
        }
        
        // Ensure value is a finite number or null
        let numValue: number | null = null; // Default to null
        if (item.value === null) {
          numValue = null;
        } else if (typeof item.value === 'number') {
          if (isFinite(item.value)) {
            numValue = item.value;
          } else {
            this.logger.warn(`Converting non-finite number value (${item.value}) to null for variable ${variableName}`);
          } // else stays null (handles Infinity, -Infinity, NaN)
        } else if (item.value !== undefined) { // Handle strings etc.
          const parsed = Number(item.value);
          if (!isNaN(parsed) && isFinite(parsed)) {
            numValue = parsed;
          } else {
             this.logger.warn(`Could not parse value (${item.value}) to finite number, setting to null for variable ${variableName}`);
          }// else stays null
        } else {
           this.logger.warn(`Missing value, setting to null for variable ${variableName}: ${JSON.stringify(item)}`);
        }
        
        return { date: dateStr, value: numValue };
      })
      .filter((item): item is TimeSeriesPoint => item !== null); // Filter out entries that returned null
  }
} 