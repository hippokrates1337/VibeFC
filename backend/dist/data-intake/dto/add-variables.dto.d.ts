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
    name?: string;
    type?: VariableType;
    userId?: string;
    values: TimeSeriesPoint[];
}
export declare class AddVariablesDto {
    variables: VariableDto[];
}
