"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationEngineCoreModule = void 0;
const common_1 = require("@nestjs/common");
const calculation_engine_core_1 = require("./calculation-engine-core");
const node_evaluator_1 = require("./services/node-evaluator");
const tree_processor_1 = require("./services/tree-processor");
const result_builder_1 = require("./services/result-builder");
const calculation_validator_1 = require("./services/calculation-validator");
const period_service_1 = require("./services/period-service");
const calculation_cache_1 = require("./services/calculation-cache");
const data_node_strategy_1 = require("./strategies/data-node-strategy");
const constant_node_strategy_1 = require("./strategies/constant-node-strategy");
const operator_node_strategy_1 = require("./strategies/operator-node-strategy");
const metric_node_strategy_1 = require("./strategies/metric-node-strategy");
const seed_node_strategy_1 = require("./strategies/seed-node-strategy");
const variable_data_service_1 = require("./variable-data-service");
const debug_collector_module_1 = require("../../debug-collector.module");
let CalculationEngineCoreModule = class CalculationEngineCoreModule {
};
exports.CalculationEngineCoreModule = CalculationEngineCoreModule;
exports.CalculationEngineCoreModule = CalculationEngineCoreModule = __decorate([
    (0, common_1.Module)({
        imports: [debug_collector_module_1.DebugCollectorModule],
        providers: [
            calculation_engine_core_1.CalculationEngineCore,
            node_evaluator_1.NodeEvaluator,
            tree_processor_1.TreeProcessor,
            result_builder_1.ResultBuilder,
            calculation_validator_1.CalculationValidator,
            period_service_1.PeriodService,
            calculation_cache_1.CalculationCacheService,
            data_node_strategy_1.DataNodeStrategy,
            constant_node_strategy_1.ConstantNodeStrategy,
            operator_node_strategy_1.OperatorNodeStrategy,
            metric_node_strategy_1.MetricNodeStrategy,
            seed_node_strategy_1.SeedNodeStrategy,
            variable_data_service_1.VariableDataService,
            {
                provide: 'Logger',
                useValue: {
                    log: (message, ...args) => console.log(message, ...args),
                    error: (message, ...args) => console.error(message, ...args),
                    warn: (message, ...args) => console.warn(message, ...args),
                }
            },
        ],
        exports: [
            calculation_engine_core_1.CalculationEngineCore,
            node_evaluator_1.NodeEvaluator,
            tree_processor_1.TreeProcessor,
            result_builder_1.ResultBuilder,
            calculation_validator_1.CalculationValidator,
            period_service_1.PeriodService,
            calculation_cache_1.CalculationCacheService,
        ],
    })
], CalculationEngineCoreModule);
//# sourceMappingURL=calculation-engine-core.module.js.map