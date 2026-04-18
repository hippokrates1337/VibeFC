import { Request } from 'express';
import { InvitesClaimService } from './invites-claim.service';
export declare class UsersController {
    private readonly invitesClaimService;
    constructor(invitesClaimService: InvitesClaimService);
    claimInvites(req: Request): Promise<{
        claimed: number;
    }>;
}
