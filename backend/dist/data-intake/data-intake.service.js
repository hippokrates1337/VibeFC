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
                    const userId = variable.userId || 'anonymous';
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
        }
        catch (error) {
            this.logger.error(`Error fetching variables for user ${userId}: ${error.message}`);
            throw new Error(`Error fetching variables: ${error.message}`);
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
    async deleteVariables(deleteVariablesDto) {
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
                .in('id', ids);
            if (existingError) {
                this.logger.error(`Failed to verify existing variables: ${existingError.message}`);
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
            .map(item => {
            const dateValue = item.date;
            let dateStr = null;
            if (typeof dateValue === 'string') {
                dateStr = dateValue;
            }
            else if (typeof dateValue === 'object' && dateValue !== null && 'toISOString' in dateValue) {
                try {
                    const dateObj = dateValue;
                    dateStr = dateObj.toISOString().split('T')[0];
                }
                catch (e) {
                    this.logger.warn(`Error converting date object: ${e.message}`);
                }
            }
            let numValue = null;
            if (item.value === null) {
                numValue = null;
            }
            else if (typeof item.value === 'number') {
                numValue = item.value;
            }
            else if (item.value !== undefined && !isNaN(Number(item.value))) {
                numValue = Number(item.value);
            }
            if (!dateStr) {
                this.logger.warn(`Skipping entry with invalid date format for variable ${variableName}`);
                return null;
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