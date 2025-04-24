import { DataIntakeService } from 'src/data-intake/data-intake.service';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
export declare class DataIntakeController {
    private readonly dataIntakeService;
    private readonly logger;
    constructor(dataIntakeService: DataIntakeService);
    addVariables(addVariablesDto: AddVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    getVariablesByUser(userId: string): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    updateVariables(updateVariablesDto: UpdateVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
    deleteVariables(deleteVariablesDto: DeleteVariablesDto): Promise<{
        message: string;
        count: number;
    }>;
}
