export declare enum VariableType {
    ACTUAL = "ACTUAL",
    BUDGET = "BUDGET",
    INPUT = "INPUT",
    UNKNOWN = "UNKNOWN"
}
export declare class TimeSeriesPoint {
    date: string;
    value: number | null;
}
export declare class VariableDto {
    id: string;
    name?: string;
    type?: VariableType;
    user_id?: string;
    organization_id: string;
    values: TimeSeriesPoint[];
}
export interface VariableEntity {
    id: string;
    name: string;
    type: VariableType;
    values: TimeSeriesPoint[];
    user_id: string;
    created_at: string;
    updated_at: string;
}
