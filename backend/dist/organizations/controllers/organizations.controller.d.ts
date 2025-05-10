import { OrganizationsService } from '../services/organizations.service';
import { CreateOrganizationDto, UpdateOrganizationDto, OrganizationDto } from '../dto/organization.dto';
import { Request } from 'express';
interface RequestWithUser extends Request {
    user: {
        id: string;
        [key: string]: any;
    };
}
export declare class OrganizationsController {
    private readonly organizationsService;
    constructor(organizationsService: OrganizationsService);
    create(req: RequestWithUser, createOrganizationDto: CreateOrganizationDto): Promise<OrganizationDto>;
    findAll(req: RequestWithUser): Promise<OrganizationDto[]>;
    findOne(orgId: string, req: RequestWithUser): Promise<OrganizationDto>;
    update(orgId: string, updateOrganizationDto: UpdateOrganizationDto): Promise<void>;
    remove(orgId: string): Promise<void>;
}
export {};
