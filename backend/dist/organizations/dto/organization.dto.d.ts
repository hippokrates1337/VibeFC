export declare class CreateOrganizationDto {
    name: string;
}
export declare class UpdateOrganizationDto {
    name?: string;
}
export declare class OrganizationDto {
    id: string;
    name: string;
    owner_id: string;
    created_at: Date;
}
