import { DataIntakeService } from './data-intake.service';
import { AddVariablesDto } from './dto/add-variables.dto';
export declare class DataIntakeController {
    private readonly dataIntakeService;
    private readonly logger;
    constructor(dataIntakeService: DataIntakeService);
    addVariables(addVariablesDto: AddVariablesDto): Promise<{
        message: string;
        count: number;
        variables: any[];
    }>;
}
