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
var SupabaseService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let SupabaseService = SupabaseService_1 = class SupabaseService {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(SupabaseService_1.name);
    }
    async onModuleInit() {
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseKey = this.configService.get('SUPABASE_KEY');
        if (!supabaseUrl || !supabaseKey) {
            throw new Error('Supabase credentials are not provided in environment variables');
        }
        this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        this.logger.log('Supabase client initialized with service_role key (bypasses RLS)');
        try {
            await this.testConnection();
            this.logger.log('Successfully connected to Supabase');
        }
        catch (error) {
            this.logger.error(`Failed to connect to Supabase: ${error.message}`);
            throw error;
        }
    }
    get client() {
        return this.supabaseClient;
    }
    async testConnection() {
        try {
            const { error } = await this.supabaseClient
                .from('variables')
                .select('id')
                .limit(1);
            if (error) {
                this.logger.error(`Database connection test failed: ${error.message}`);
                throw new Error(`Database connection test failed: ${error.message}`);
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Connection test failed: ${error.message}`);
            throw error;
        }
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map