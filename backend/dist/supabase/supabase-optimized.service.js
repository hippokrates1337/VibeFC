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
var SupabaseOptimizedService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupabaseOptimizedService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
const crypto_1 = require("crypto");
let SupabaseOptimizedService = SupabaseOptimizedService_1 = class SupabaseOptimizedService {
    constructor(configService) {
        this.configService = configService;
        this.clientPool = new Map();
        this.logger = new common_1.Logger(SupabaseOptimizedService_1.name);
        this.isTestEnvironment = process.env.IS_TEST_ENVIRONMENT === 'true';
        this.isAdminMode = process.env.SUPABASE_ADMIN_MODE === 'true';
        this.supabaseUrl = this.configService.get('SUPABASE_URL') || '';
        this.serviceRoleKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY') || '';
        this.anonKey = this.configService.get('SUPABASE_ANON_KEY') || '';
        if (!this.supabaseUrl || (!this.anonKey && !this.serviceRoleKey)) {
            throw new Error('Supabase credentials are not properly configured.');
        }
        this.cleanupInterval = setInterval(() => this.cleanupExpiredClients(), 5 * 60 * 1000);
        this.logger.log(`SupabaseOptimizedService initialized in ${this.isTestEnvironment ? 'TEST' : 'PRODUCTION'} mode, Admin Mode: ${this.isAdminMode}`);
    }
    onModuleDestroy() {
        clearInterval(this.cleanupInterval);
        this.clientPool.clear();
        this.logger.log('SupabaseOptimizedService destroyed, cleared client pool');
    }
    getClientForRequest(request) {
        const authHeader = request.headers.authorization;
        const user = request.user;
        if (!authHeader || !user?.userId) {
            throw new common_1.UnauthorizedException('Authentication required');
        }
        const tokenHash = (0, crypto_1.createHash)('sha256').update(authHeader).digest('hex').substring(0, 16);
        const cacheKey = `${user.userId}-${tokenHash}`;
        const cached = this.clientPool.get(cacheKey);
        const now = Date.now();
        if (cached && cached.expiry > now) {
            if (this.isTestEnvironment) {
                this.logger.debug(`Using cached client for user ${user.userId}`);
            }
            return cached.client;
        }
        const client = this.createAuthenticatedClient(authHeader, user);
        this.clientPool.set(cacheKey, {
            client,
            expiry: now + (10 * 60 * 1000)
        });
        if (this.isTestEnvironment) {
            this.logger.debug(`Created new cached client for user ${user.userId}`);
        }
        return client;
    }
    get client() {
        throw new Error('Direct client access not supported in optimized service. Use getClientForRequest() instead.');
    }
    createAuthenticatedClient(authHeader, user) {
        const keyToUse = (this.isTestEnvironment || this.isAdminMode) && this.serviceRoleKey
            ? this.serviceRoleKey
            : this.anonKey;
        const token = authHeader.split(' ')[1];
        try {
            if (this.isAdminMode) {
                this.logger.debug(`Creating admin client for user ${user.userId}`);
                const client = (0, supabase_js_1.createClient)(this.supabaseUrl, keyToUse, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                });
                this.setAuthContext(client, user.userId);
                return client;
            }
            if (this.isTestEnvironment) {
                this.logger.debug(`Creating test client for user ${user.userId}`);
                const client = (0, supabase_js_1.createClient)(this.supabaseUrl, keyToUse, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                    global: {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    },
                });
                if (!token && user.userId) {
                    this.setAuthContext(client, user.userId);
                }
                return client;
            }
            return (0, supabase_js_1.createClient)(this.supabaseUrl, keyToUse, {
                global: {
                    headers: { Authorization: `Bearer ${token}` },
                },
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                }
            });
        }
        catch (error) {
            this.logger.error(`Error creating Supabase client: ${error.message}`);
            throw error;
        }
    }
    setAuthContext(client, userId) {
        try {
            client.rpc('set_auth_user_id', { user_id: userId })
                .then(() => {
                this.logger.debug(`Auth context set for user ${userId}`);
            }, (err) => {
                this.logger.error(`Failed to set auth context: ${err.message}`);
            });
        }
        catch (error) {
            this.logger.error(`Error setting auth context: ${error.message}`);
        }
    }
    cleanupExpiredClients() {
        const now = Date.now();
        const expiredKeys = [];
        for (const [key, value] of this.clientPool.entries()) {
            if (value.expiry <= now) {
                expiredKeys.push(key);
            }
        }
        expiredKeys.forEach(key => this.clientPool.delete(key));
        if (expiredKeys.length > 0) {
            this.logger.debug(`Cleaned up ${expiredKeys.length} expired Supabase clients`);
        }
    }
    getPoolStats() {
        const now = Date.now();
        let expiredCount = 0;
        for (const [, value] of this.clientPool.entries()) {
            if (value.expiry <= now) {
                expiredCount++;
            }
        }
        return {
            totalClients: this.clientPool.size,
            expiredClients: expiredCount
        };
    }
};
exports.SupabaseOptimizedService = SupabaseOptimizedService;
exports.SupabaseOptimizedService = SupabaseOptimizedService = SupabaseOptimizedService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], SupabaseOptimizedService);
//# sourceMappingURL=supabase-optimized.service.js.map