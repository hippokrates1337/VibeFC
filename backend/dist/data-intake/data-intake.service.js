"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var DataIntakeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataIntakeService = void 0;
const common_1 = require("@nestjs/common");
const supabase_service_1 = require("../supabase/supabase.service");
const variable_dto_1 = require("./dto/variable.dto");
let DataIntakeService = DataIntakeService_1 = class DataIntakeService {
    constructor(supabase) {
        this.supabase = supabase;
        this.logger = new common_1.Logger(DataIntakeService_1.name);
    }
    async addVariables(addVariablesDto) {
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
                    const id = variable.id;
                    const name = variable.name || 'Unnamed Variable';
                    const type = variable.type || variable_dto_1.VariableType.UNKNOWN;
                    const userId = variable.user_id;
                    const organizationId = variable.organization_id;
                    if (!userId || !organizationId) {
                        this.logger.error(`Missing userId (${userId}) or organizationId (${organizationId}) for variable ${name}`);
                        throw new Error(`User ID and Organization ID are required for variable ${name}`);
                    }
                    const validType = Object.values(variable_dto_1.VariableType).includes(type)
                        ? type
                        : variable_dto_1.VariableType.UNKNOWN;
                    const normalizedValues = this.normalizeTimeSeriesValues(variable.values, name);
                    const { data, error } = await this.supabase.client
                        .from('variables')
                        .insert({
                        id,
                        name,
                        type: validType,
                        values: normalizedValues,
                        user_id: userId,
                        organization_id: organizationId,
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
                }
                catch (varError) {
                    this.logger.error(`Error processing variable: ${varError.message}`);
                    throw varError;
                }
            }
            this.logger.log(`Successfully added ${savedVariables.length} variables`);
            return {
                message: 'Variables added successfully',
                count: savedVariables.length,
                variables: savedVariables,
            };
        }
        catch (error) {
            this.logger.error(`Error adding variables: ${error.message}`);
            throw new Error(`Error adding variables: ${error.message}`);
        }
    }
    async getVariablesByUser(userId) {
        try {
            this.logger.log(`Fetching organizations for user: ${userId}`);
            const { data: orgMembers, error: orgError } = await this.supabase.client
                .from('organization_members')
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
            this.logger.log(`Fetching variables for organizations: ${organizationIds.join(', ')}`);
            const { data, error } = await this.supabase.client
                .from('variables')
                .select('*')
                .in('organization_id', organizationIds);
            if (error) {
                this.logger.error(`Failed to fetch variables for organizations ${organizationIds.join(', ')}: ${error.message}`);
                throw new Error(`Failed to fetch variables: ${error.message}`);
            }
            if (!data || data.length === 0) {
                this.logger.warn(`No variables found for organizations ${organizationIds.join(', ')}`);
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
        }
        catch (error) {
            this.logger.error(`Error in getVariablesByUser for user ${userId}: ${error.message}`);
            throw new Error(`Error fetching variables by user's organizations: ${error.message}`);
        }
    }
    async updateVariables(updateVariablesDto) {
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
                    const { data: existingData, error: existingError } = await this.supabase.client
                        .from('variables')
                        .select('*')
                        .eq('id', variable.id)
                        .single();
                    if (existingError || !existingData) {
                        this.logger.warn(`Variable with ID ${variable.id} not found`);
                        throw new common_1.NotFoundException(`Variable with ID ${variable.id} not found`);
                    }
                    const updateObj = {
                        updated_at: new Date().toISOString(),
                    };
                    if (variable.name !== undefined) {
                        updateObj.name = variable.name;
                    }
                    if (variable.type !== undefined) {
                        updateObj.type = variable.type;
                    }
                    if (variable.values && Array.isArray(variable.values)) {
                        const normalizedValues = this.normalizeTimeSeriesValues(variable.values, existingData.name);
                        updateObj.values = normalizedValues;
                    }
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
                }
                catch (varError) {
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
        }
        catch (error) {
            this.logger.error(`Error updating variables: ${error.message}`);
            throw error;
        }
    }
    async deleteVariables(deleteVariablesDto, requestingUserId, requestingOrgId) {
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
            const { data: existingData, error: existingError } = await this.supabase.client
                .from('variables')
                .select('id')
                .in('id', ids)
                .eq('user_id', requestingUserId)
                .eq('organization_id', requestingOrgId);
            if (existingError) {
                this.logger.error(`Failed to verify existing variables for user ${requestingUserId} in org ${requestingOrgId}: ${existingError.message}`);
                throw new Error(`Failed to verify existing variables: ${existingError.message}`);
            }
            const existingIds = existingData.map(item => item.id);
            const nonExistingIds = ids.filter(id => !existingIds.includes(id));
            if (nonExistingIds.length > 0) {
                this.logger.warn(`Some variables not found: ${nonExistingIds.join(', ')}`);
            }
            if (existingIds.length === 0) {
                this.logger.warn('None of the specified variables were found');
                return {
                    message: 'No variables found to delete',
                    count: 0,
                };
            }
            const { error: deleteError } = await this.supabase.client
                .from('variables')
                .delete()
                .in('id', existingIds)
                .eq('user_id', requestingUserId)
                .eq('organization_id', requestingOrgId);
            if (deleteError) {
                this.logger.error(`Failed to delete variables for user ${requestingUserId} in org ${requestingOrgId}: ${deleteError.message}`);
                throw new Error(`Failed to delete variables: ${deleteError.message}`);
            }
            this.logger.log(`Successfully deleted ${existingIds.length} variables`);
            return {
                message: 'Variables deleted successfully',
                count: existingIds.length,
            };
        }
        catch (error) {
            this.logger.error(`Error deleting variables: ${error.message}`);
            throw error;
        }
    }
    normalizeTimeSeriesValues(values, variableName) {
        if (!Array.isArray(values)) {
            return [];
        }
        return values
            .filter(item => item && typeof item === 'object')
            .map((item) => {
            const dateValue = item.date;
            let dateStr = null;
            if (typeof dateValue === 'string') {
                if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
                    dateStr = dateValue;
                }
            }
            else if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
                try {
                    dateStr = dateValue.toISOString().split('T')[0];
                }
                catch (e) {
                }
            }
            if (!dateStr) {
                this.logger.warn(`Skipping entry with invalid or missing date format for variable ${variableName}: ${JSON.stringify(item)}`);
                return null;
            }
            let numValue = null;
            if (item.value === null) {
                numValue = null;
            }
            else if (typeof item.value === 'number') {
                if (isFinite(item.value)) {
                    numValue = item.value;
                }
                else {
                    this.logger.warn(`Converting non-finite number value (${item.value}) to null for variable ${variableName}`);
                }
            }
            else if (item.value !== undefined) {
                const parsed = Number(item.value);
                if (!isNaN(parsed) && isFinite(parsed)) {
                    numValue = parsed;
                }
                else {
                    this.logger.warn(`Could not parse value (${item.value}) to finite number, setting to null for variable ${variableName}`);
                }
            }
            else {
                this.logger.warn(`Missing value, setting to null for variable ${variableName}: ${JSON.stringify(item)}`);
            }
            return { date: dateStr, value: numValue };
        })
            .filter((item) => item !== null);
    }
};
exports.DataIntakeService = DataIntakeService;
exports.DataIntakeService = DataIntakeService = DataIntakeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], DataIntakeService);
//# sourceMappingURL=data-intake.service.js.map