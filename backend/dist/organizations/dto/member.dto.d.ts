export declare enum OrganizationRole {
    ADMIN = "admin",
    EDITOR = "editor",
    VIEWER = "viewer"
}
export declare class InviteMemberDto {
    email: string;
    role: OrganizationRole;
}
export declare class UpdateMemberRoleDto {
    role: OrganizationRole;
}
export declare class MemberDto {
    organization_id: string;
    user_id: string;
    role: OrganizationRole;
    joined_at: Date;
}
export interface AddMemberResponseDto {
    outcome: 'member_added' | 'invite_email_sent';
}
