import { 
  Controller, 
  Post, 
  Get, 
  Put, 
  Delete, 
  Body, 
  Query, 
  Param, 
  Logger, 
  HttpException, 
  HttpStatus 
} from '@nestjs/common';
import { DataIntakeService } from 'src/data-intake/data-intake.service';

// DTOs
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';

@Controller('data-intake')
export class DataIntakeController {
  private readonly logger = new Logger(DataIntakeController.name);
  
  constructor(private readonly dataIntakeService: DataIntakeService) {}

  // CREATE - Add new variables
  @Post('variables')
  async addVariables(@Body() addVariablesDto: AddVariablesDto) {
    try {
      // Validate request
      if (!addVariablesDto.variables || addVariablesDto.variables.length === 0) {
        this.logger.warn('Empty variables array in request');
        throw new HttpException('No variables provided in request', HttpStatus.BAD_REQUEST);
      }
      
      // Process the request
      const result = await this.dataIntakeService.addVariables(addVariablesDto);
      return result;
    } catch (error) {
      // Determine if this is already an HTTP exception
      if (error instanceof HttpException) {
        throw error;
      }
      
      // Log the error
      this.logger.error(`Error processing variables creation request: ${error.message}`);
      
      // Return a properly formatted error response
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to add variables: ${error.message}`,
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // READ - Get variables by user ID
  @Get('variables/:userId')
  async getVariablesByUser(@Param('userId') userId: string) {
    try {
      if (!userId) {
        this.logger.warn('No user ID provided in request');
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.dataIntakeService.getVariablesByUser(userId);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Error retrieving variables for user ${userId}: ${error.message}`);
      
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to retrieve variables: ${error.message}`,
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // UPDATE - Update variables
  @Put('variables')
  async updateVariables(@Body() updateVariablesDto: UpdateVariablesDto) {
    try {
      if (!updateVariablesDto.variables || updateVariablesDto.variables.length === 0) {
        this.logger.warn('Empty variables array in update request');
        throw new HttpException('No variables provided for update', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.dataIntakeService.updateVariables(updateVariablesDto);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Error processing update-variables request: ${error.message}`);
      
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to update variables: ${error.message}`,
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  // DELETE - Delete variables
  @Delete('variables')
  async deleteVariables(@Body() deleteVariablesDto: DeleteVariablesDto) {
    try {
      if (!deleteVariablesDto.ids || deleteVariablesDto.ids.length === 0) {
        this.logger.warn('Empty IDs array in delete request');
        throw new HttpException('No variable IDs provided for deletion', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.dataIntakeService.deleteVariables(deleteVariablesDto);
      return result;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      this.logger.error(`Error processing delete-variables request: ${error.message}`);
      
      throw new HttpException(
        {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: `Failed to delete variables: ${error.message}`,
          error: 'Internal Server Error',
        },
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}