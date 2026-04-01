export type { CoreForecastState } from './core-state';
export type { GraphState } from './graph-state';
export type { CalculationState } from './calculation-state';
export type { UIState } from './ui-state';
export type { DebugState } from './debug-state';

import type { CoreForecastState } from './core-state';
import type { GraphState } from './graph-state';
import type { CalculationState } from './calculation-state';
import type { UIState } from './ui-state';
import type { DebugState } from './debug-state';

export interface ForecastGraphState extends 
  CoreForecastState, 
  GraphState, 
  CalculationState, 
  UIState,
  DebugState {}
