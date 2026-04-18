import { Controller, Post, HttpCode, HttpStatus, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { InvitesClaimService } from './invites-claim.service';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly invitesClaimService: InvitesClaimService) {}

  /**
   * Consumes pending organization_invitations for the JWT user’s email.
   */
  @Post('me/claim-invites')
  @HttpCode(HttpStatus.OK)
  async claimInvites(@Req() req: Request): Promise<{ claimed: number }> {
    return this.invitesClaimService.claimPendingInvitesForUser(req);
  }
}
