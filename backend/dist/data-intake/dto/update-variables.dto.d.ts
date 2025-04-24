import { VariableType, TimeSeriesPoint } from './variable.dto';
export declare class UpdateVariableDto {
    id: string;
    name?: string;
    type?: VariableType;
    values?: TimeSeriesPoint[];
}
export declare class UpdateVariablesDto {
    variables: UpdateVariableDto[];
}
