import { DataIntakeService } from './data-intake.service';
import { Request } from 'express';
interface RequestWithUser extends Request {
    user: {
        userId: string;
        organizationId?: string;
        [key: string]: any;
    };
}
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
export declare class DataIntakeController {
    private readonly dataIntakeService;
    private readonly logger;
    constructor(dataIntakeService: DataIntakeService);
    addVariables(req: RequestWithUser, addVariablesDto: AddVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    getVariablesByUser(req: RequestWithUser, userId: string): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    updateVariables(req: RequestWithUser, updateVariablesDto: UpdateVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    deleteVariables(req: RequestWithUser, deleteVariablesDto: DeleteVariablesDto): Promise<{
        message: string;
        count: number;
        deletedIds: string[];
    }>;
}
export {};
