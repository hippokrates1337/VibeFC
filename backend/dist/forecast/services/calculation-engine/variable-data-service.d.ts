import type { Variable } from './types';
interface IVariableDataService {
    getVariableValueForMonth(variableId: string, targetDate: Date, variables: readonly Variable[]): number | null;
    getVariableValueWithOffset(variableId: string, targetDate: Date, offsetMonths: number, variables: readonly Variable[]): number | null;
    getVariableValue(variableId: string, targetDate: Date, variables: readonly Variable[], offsetMonths?: number): Promise<number | null>;
}
export declare class VariableDataService implements IVariableDataService {
    getVariableValueForMonth(variableId: string, targetDate: Date, variables: readonly Variable[]): number | null;
    getVariableValueWithOffset(variableId: string, targetDate: Date, offsetMonths: number, variables: readonly Variable[]): number | null;
    private normalizeToFirstOfMonth;
    getVariableValue(variableId: string, targetDate: Date, variables: readonly Variable[], offsetMonths?: number): Promise<number | null>;
    private addMonths;
}
export {};
