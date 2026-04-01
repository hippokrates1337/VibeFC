import { CalculationRequest, ValidationResult, Variable } from '../types/calculation-types';
import { TreeProcessor } from './tree-processor';
import { PeriodService } from './period-service';
export declare class CalculationValidator {
    private readonly treeProcessor;
    private readonly periodService;
    constructor(treeProcessor: TreeProcessor, periodService: PeriodService);
    validate(request: CalculationRequest): Promise<ValidationResult>;
    private validateCalculationTypes;
    private validateTrees;
    private validateVariables;
    private validateTreeVariableReferences;
    private collectVariableReferences;
    validateVariableData(variables: Variable[], periods: {
        forecast: {
            start: string;
            end: string;
        };
        actual: {
            start: string;
            end: string;
        };
    }): Promise<ValidationResult>;
    validateBasicStructure(request: CalculationRequest): ValidationResult;
}
