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
const add_variables_dto_1 = require("./dto/add-variables.dto");
const supabase_service_1 = require("../supabase/supabase.service");
const uuid_1 = require("uuid");
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
                    const name = variable.name || 'Unnamed Variable';
                    const type = variable.type || add_variables_dto_1.VariableType.UNKNOWN;
                    const userId = variable.userId || 'anonymous';
                    const validType = Object.values(add_variables_dto_1.VariableType).includes(type)
                        ? type
                        : add_variables_dto_1.VariableType.UNKNOWN;
                    let normalizedValues = [];
                    if (Array.isArray(variable.values)) {
                        normalizedValues = variable.values
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
                                this.logger.warn(`Skipping entry with invalid date format for variable ${name}`);
                                return null;
                            }
                            return { date: dateStr, value: numValue };
                        })
                            .filter((item) => item !== null);
                    }
                    const { data, error } = await this.supabase.client
                        .from('variables')
                        .insert({
                        id: (0, uuid_1.v4)(),
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
};
exports.DataIntakeService = DataIntakeService;
exports.DataIntakeService = DataIntakeService = DataIntakeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_service_1.SupabaseService])
], DataIntakeService);
//# sourceMappingURL=data-intake.service.js.map