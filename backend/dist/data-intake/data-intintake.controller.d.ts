import { Request } from 'express';
import { DataIntakeService } from './data-intake.service';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
export declare class DataIntakeController {
    private readonly dataIntakeService;
    constructor(dataIntakeService: DataIntakeService);
    addVariables(req: Request, addVariablesDto: AddVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    getVariablesByUser(req: Request, userId: string): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    updateVariables(req: Request, updateVariablesDto: UpdateVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    deleteVariables(req: Request, deleteVariablesDto: DeleteVariablesDto): Promise<{
        message: string;
        count: number;
    }>;
}
