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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var SupabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const core_1 = require("@nestjs/core");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor(configService, request) {
        this.configService = configService;
        this.request = request;
        this.supabaseClient = null;
        this.logger = new common_1.Logger(SupabaseService_1.name);
    }
    get client() {
        if (this.supabaseClient) {
            return this.supabaseClient;
        }
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) {
            this.logger.error('Supabase URL or Anon Key not configured');
            throw new Error('Supabase credentials are not properly configured.');
        }
        const authHeader = this.request.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            this.logger.warn('Attempted to create Supabase client without Authorization header.');
            throw new common_1.UnauthorizedException('Authorization token is missing or invalid.');
        }
        const token = authHeader.split(' ')[1];
        this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
            global: {
                headers: { Authorization: `Bearer ${token}` },
            },
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            }
        });
        this.logger.log('Request-scoped Supabase client initialized for user.');
        return this.supabaseClient;
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __param(1, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map