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
        this.isTestEnvironment = process.env.IS_TEST_ENVIRONMENT === 'true';
        this.isAdminMode = process.env.SUPABASE_ADMIN_MODE === 'true';
        this.logger.log(`SupabaseService initialized in ${this.isTestEnvironment ? 'TEST' : 'PRODUCTION'} mode, Admin Mode: ${this.isAdminMode}`);
        if (this.isTestEnvironment) {
            this.logger.debug(`Request user in constructor: ${JSON.stringify(this.request.user)}`);
            this.logger.debug(`Request auth header: ${this.request.headers.authorization}`);
        }
    }
    get user() {
        const userInfo = this.request.user;
        if (this.isTestEnvironment && !userInfo) {
            this.logger.warn('No user found in request during test environment');
        }
        return userInfo;
    }
    get client() {
        if (this.supabaseClient) {
            return this.supabaseClient;
        }
        const supabaseUrl = this.configService.get('SUPABASE_URL') || '';
        const supabaseAnonKey = this.configService.get('SUPABASE_ANON_KEY');
        const serviceRoleKey = this.configService.get('SUPABASE_SERVICE_ROLE_KEY');
        if (!supabaseUrl || (!supabaseAnonKey && !serviceRoleKey)) {
            this.logger.error('Supabase URL or API keys not configured');
            throw new Error('Supabase credentials are not properly configured.');
        }
        const keyToUse = (this.isTestEnvironment || this.isAdminMode) && serviceRoleKey
            ? serviceRoleKey
            : supabaseAnonKey || '';
        const authHeader = this.request.headers.authorization;
        let token = authHeader?.split(' ')[1];
        try {
            if (this.isAdminMode) {
                this.logger.log('Creating admin client with service role key (bypassing JWT validation)');
                this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, keyToUse, {
                    auth: {
                        autoRefreshToken: false,
                        persistSession: false,
                    },
                });
                if (this.user?.userId) {
                    this.logger.debug(`Setting user context for RLS with user ID: ${this.user.userId}`);
                    this.setAuthContext(this.user.userId);
                }
                else {
                    this.logger.warn('Admin mode active but no user ID available for RLS context');
                }
                return this.supabaseClient;
            }
            if (this.isTestEnvironment) {
                if (this.user?.userId) {
                    this.logger.log(`Test environment with user ${this.user.userId} - creating authenticated client`);
                    this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, keyToUse, {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                        },
                        global: {
                            headers: {
                                Authorization: `Bearer ${token || 'test-token'}`,
                            },
                        },
                    });
                    if (!token && this.user.userId) {
                        this.logger.debug(`No auth token available, setting explicit RLS context for user: ${this.user.userId}`);
                        this.setAuthContext(this.user.userId);
                    }
                    this.logger.debug(`Test client created with auth header: ${authHeader}`);
                    this.logger.debug(`Test client user: ${JSON.stringify(this.user)}`);
                    return this.supabaseClient;
                }
                else {
                    this.logger.warn('Test environment but no user in request - creating anonymous client');
                    this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, keyToUse, {
                        auth: {
                            autoRefreshToken: false,
                            persistSession: false,
                        },
                    });
                    return this.supabaseClient;
                }
            }
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                this.logger.warn('Attempted to create Supabase client without Authorization header.');
                throw new common_1.UnauthorizedException('Authorization token is missing or invalid.');
            }
            this.supabaseClient = (0, supabase_js_1.createClient)(supabaseUrl, keyToUse, {
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
        catch (error) {
            this.logger.error(`Error creating Supabase client: ${error.message}`);
            throw error;
        }
    }
    setAuthContext(userId) {
        if (!this.supabaseClient) {
            this.logger.error('Cannot set auth context - no Supabase client available');
            return;
        }
        try {
            this.supabaseClient.rpc('set_auth_user_id', { user_id: userId })
                .then(() => {
                this.logger.debug(`Auth context set successfully for user ${userId}`);
            })
                .then(undefined, (err) => {
                this.logger.error(`Failed to set auth context: ${err.message}`);
            });
        }
        catch (error) {
            this.logger.error(`Error setting auth context: ${error.message}`);
        }
    }
};
exports.SupabaseService = SupabaseService;
exports.SupabaseService = SupabaseService = SupabaseService_1 = __decorate([
    (0, common_1.Injectable)({ scope: common_1.Scope.REQUEST }),
    __param(1, (0, common_1.Inject)(core_1.REQUEST)),
    __metadata("design:paramtypes", [config_1.ConfigService, Object])
], SupabaseService);
//# sourceMappingURL=supabase.service.js.map