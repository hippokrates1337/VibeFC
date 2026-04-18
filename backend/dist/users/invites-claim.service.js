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
var InvitesClaimService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvitesClaimService = void 0;
const common_1 = require("@nestjs/common");
const supabase_optimized_service_1 = require("../supabase/supabase-optimized.service");
let InvitesClaimService = InvitesClaimService_1 = class InvitesClaimService {
    constructor(supabaseService) {
        this.supabaseService = supabaseService;
        this.logger = new common_1.Logger(InvitesClaimService_1.name);
    }
    async claimPendingInvitesForUser(request) {
        if (!this.supabaseService.hasServiceRoleKey()) {
            this.logger.warn('claim-invites skipped: SUPABASE_SERVICE_ROLE_KEY not set');
            return { claimed: 0 };
        }
        const req = request;
        const userId = req.user?.userId ?? req.user?.id;
        const rawEmail = req.user?.email;
        if (!userId || !rawEmail) {
            return { claimed: 0 };
        }
        const email = rawEmail.trim().toLowerCase();
        const admin = this.supabaseService.getServiceRoleClient();
        const { data: invites, error: listError } = await admin
            .from('organization_invitations')
            .select('id, organization_id, email, role')
            .ilike('email', email);
        if (listError) {
            throw new common_1.InternalServerErrorException(`Failed to list invitations: ${listError.message}`);
        }
        if (!invites?.length) {
            return { claimed: 0 };
        }
        let claimed = 0;
        for (const inv of invites) {
            const { data: existing, error: exErr } = await admin
                .from('organization_members')
                .select('id')
                .eq('organization_id', inv.organization_id)
                .eq('user_id', userId)
                .maybeSingle();
            if (exErr) {
                this.logger.error(`claim-invites membership check failed: ${exErr.message}`);
                continue;
            }
            if (existing) {
                const { error: delErr } = await admin
                    .from('organization_invitations')
                    .delete()
                    .eq('id', inv.id);
                if (delErr) {
                    this.logger.warn(`claim-invites could not delete stale invite ${inv.id}: ${delErr.message}`);
                }
                continue;
            }
            const { error: insErr } = await admin.from('organization_members').insert({
                organization_id: inv.organization_id,
                user_id: userId,
                role: inv.role,
            });
            if (insErr) {
                this.logger.error(`claim-invites insert member failed: ${insErr.message}`);
                continue;
            }
            const { error: delInvErr } = await admin
                .from('organization_invitations')
                .delete()
                .eq('id', inv.id);
            if (delInvErr) {
                this.logger.warn(`claim-invites member inserted but invite delete failed: ${delInvErr.message}`);
            }
            claimed += 1;
        }
        if (claimed > 0) {
            this.logger.log(`claim-invites: claimed ${claimed} invitation(s) for ${email}`);
        }
        return { claimed };
    }
};
exports.InvitesClaimService = InvitesClaimService;
exports.InvitesClaimService = InvitesClaimService = InvitesClaimService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [supabase_optimized_service_1.SupabaseOptimizedService])
], InvitesClaimService);
//# sourceMappingURL=invites-claim.service.js.map