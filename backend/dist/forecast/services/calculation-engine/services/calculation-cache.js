"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CalculationCacheService = void 0;
const common_1 = require("@nestjs/common");
let CalculationCacheService = class CalculationCacheService {
    constructor() {
        this.cache = new Map();
    }
    get(key) {
        return this.cache.get(key);
    }
    set(key, value) {
        this.cache.set(key, value);
    }
    clear() {
        this.cache.clear();
    }
    generateKey(nodeId, month, calculationType) {
        return `${nodeId}:${month}:${calculationType}`;
    }
    has(key) {
        return this.cache.has(key);
    }
    delete(key) {
        return this.cache.delete(key);
    }
    size() {
        return this.cache.size;
    }
    clearNode(nodeId) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(`${nodeId}:`)) {
                this.cache.delete(key);
            }
        }
    }
    clearMonth(month) {
        for (const key of this.cache.keys()) {
            if (key.includes(`:${month}:`)) {
                this.cache.delete(key);
            }
        }
    }
    getStats() {
        return {
            size: this.cache.size,
        };
    }
};
exports.CalculationCacheService = CalculationCacheService;
exports.CalculationCacheService = CalculationCacheService = __decorate([
    (0, common_1.Injectable)()
], CalculationCacheService);
//# sourceMappingURL=calculation-cache.js.map