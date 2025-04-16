import { Controller, Post, Body, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { DataIntakeService } from './data-intake.service';
import { AddVariablesDto } from './dto/add-variables.dto';

@Controller('data-intake')
export class DataIntakeController {
  private readonly logger = new Logger(DataIntakeController.name);
  
  constructor(private readonly dataIntakeService: DataIntakeService) {}

  @Post('add-variables')
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
      this.logger.error(`Error processing add-variables request: ${error.message}`);
      
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
}