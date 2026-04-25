import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { Request } from 'express';

interface RequestWithUser extends Request {
  user: {
    id: string;
    userId: string;
    email?: string;
  };
}

/**
 * Promotes pending organization_invitations into organization_members
 * when the authenticated user's email matches an invitation (case-insensitive).
 * Uses the service role client so RLS does not block new members.
 */
@Injectable()
export class InvitesClaimService {
  private readonly logger = new Logger(InvitesClaimService.name);

  constructor(private readonly supabaseService: SupabaseOptimizedService) {}

  async claimPendingInvitesForUser(request: Request): Promise<{ claimed: number }> {
    if (!this.supabaseService.hasServiceRoleKey()) {
      this.logger.warn('claim-invites skipped: SUPABASE_SERVICE_ROLE_KEY not set');
      return { claimed: 0 };
    }

    const req = request as RequestWithUser;
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
      throw new InternalServerErrorException(
        `Failed to list invitations: ${listError.message}`,
      );
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
        const duplicateKey =
          (insErr as { code?: string }).code === '23505' ||
          insErr.message.includes('organization_members_organization_id_user_id_key');

        if (duplicateKey) {
          this.logger.debug(
            `claim-invites membership already exists (race-safe): org=${inv.organization_id} user=${userId}`,
          );
          const { error: delDupInviteErr } = await admin
            .from('organization_invitations')
            .delete()
            .eq('id', inv.id);
          if (delDupInviteErr) {
            this.logger.warn(
              `claim-invites duplicate member but invite delete failed: ${delDupInviteErr.message}`,
            );
          }
          continue;
        }

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
}
