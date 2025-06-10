import type { Variable } from './types';
interface IVariableDataService {
    getVariableValueForMonth(variableId: string, targetDate: Date, variables: readonly Variable[]): number | null;
    getVariableValueWithOffset(variableId: string, targetDate: Date, offsetMonths: number, variables: readonly Variable[]): number | null;
}
export declare class VariableDataService implements IVariableDataService {
    getVariableValueForMonth(variableId: string, targetDate: Date, variables: readonly Variable[]): number | null;
    getVariableValueWithOffset(variableId: string, targetDate: Date, offsetMonths: number, variables: readonly Variable[]): number | null;
    private normalizeToFirstOfMonth;
    private addMonths;
}
export {};
