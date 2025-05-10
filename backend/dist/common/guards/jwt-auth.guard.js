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
var JwtAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.JwtAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const supabase_js_1 = require("@supabase/supabase-js");
let JwtAuthGuard = JwtAuthGuard_1 = class JwtAuthGuard {
    constructor(configService) {
        this.configService = configService;
        this.logger = new common_1.Logger(JwtAuthGuard_1.name);
        const supabaseUrl = this.configService.get('SUPABASE_URL');
        const supabaseAnonKey = this.configService.get('SUPABASE_ANON_KEY');
        if (!supabaseUrl || !supabaseAnonKey) {
            this.logger.error('Supabase URL or Anon Key not configured for JWT Guard');
            throw new Error('Supabase credentials for JWT Guard are not configured.');
        }
        this.supabaseAdminClient = (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey, {
            auth: {
                autoRefreshToken: false,
                persistSession: false
            }
        });
        this.logger.log('JWT Guard initialized with Supabase client (anon key) for auth checks.');
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        try {
            const authHeader = request.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                throw new common_1.UnauthorizedException('Missing or invalid authorization token');
            }
            const token = authHeader.split(' ')[1];
            const { data: { user }, error } = await this.supabaseAdminClient.auth.getUser(token);
            if (error) {
                this.logger.warn(`JWT validation error: ${error.message}`);
                throw new common_1.UnauthorizedException('Invalid token');
            }
            if (!user) {
                this.logger.warn('JWT valid but no user found');
                throw new common_1.UnauthorizedException('User not found for token');
            }
            request.user = {
                id: user.id,
                userId: user.id,
                email: user.email,
            };
            this.logger.log(`User ${user.id} authenticated successfully.`);
            return true;
        }
        catch (error) {
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            this.logger.error(`Unexpected error during authentication: ${error.message}`, error.stack);
            throw new common_1.UnauthorizedException('Authentication failed due to an unexpected error');
        }
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = JwtAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], JwtAuthGuard);
//# sourceMappingURL=jwt-auth.guard.js.map