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
  HttpStatus,
  UseGuards,
  Req,
  HttpCode
} from '@nestjs/common';
import { DataIntakeService } from './data-intake.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { Request } from 'express';

// Extend Express Request type to include user property
interface RequestWithUser extends Request {
  user: {
    userId: string;
    organizationId?: string;
    [key: string]: any;
  };
}

// DTOs
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';

@Controller('data-intake')
@UseGuards(JwtAuthGuard)
export class DataIntakeController {
  private readonly logger = new Logger(DataIntakeController.name);
  
  constructor(private readonly dataIntakeService: DataIntakeService) {}

  // CREATE - Add new variables
  @Post('variables')
  @HttpCode(201) // Set HTTP status code to 201 Created
  async addVariables(@Req() req: RequestWithUser, @Body() addVariablesDto: AddVariablesDto) {
    try {
      this.logger.log(`Received add variables request with ${addVariablesDto?.variables?.length || 0} variables`);
      
      // Validate request
      if (!addVariablesDto.variables || addVariablesDto.variables.length === 0) {
        this.logger.warn('Empty variables array in request');
        throw new HttpException('No variables provided in request', HttpStatus.BAD_REQUEST);
      }

      // Add user ID and potentially organization ID to each variable if missing
      if (req.user) {
        addVariablesDto.variables.forEach(variable => {
          if (!variable.user_id) {
            variable.user_id = req.user.userId;
          }
          if (!variable.organization_id && req.user.organizationId) {
            variable.organization_id = req.user.organizationId;
          }
        });
      }
      
      // Process the request
      const result = await this.dataIntakeService.addVariables(addVariablesDto, req);
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
  async getVariablesByUser(@Req() req: RequestWithUser, @Param('userId') userId: string) {
    try {
      this.logger.log(`Fetching variables for user: ${userId}`);
      
      if (!userId) {
        this.logger.warn('No user ID provided in request');
        throw new HttpException('User ID is required', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.dataIntakeService.getVariablesByUser(userId, req);
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
  async updateVariables(@Req() req: RequestWithUser, @Body() updateVariablesDto: UpdateVariablesDto) {
    try {
      this.logger.log(`Received update variables request with ${updateVariablesDto?.variables?.length || 0} variables`);
      
      if (!updateVariablesDto.variables || updateVariablesDto.variables.length === 0) {
        this.logger.warn('Empty variables array in update request');
        throw new HttpException('No variables provided for update', HttpStatus.BAD_REQUEST);
      }
      
      const result = await this.dataIntakeService.updateVariables(updateVariablesDto, req);
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
  async deleteVariables(@Req() req: RequestWithUser, @Body() deleteVariablesDto: DeleteVariablesDto) {
    try {
      this.logger.log(`Received delete variables request with ${deleteVariablesDto?.ids?.length || 0} variables from user ${req.user?.userId}`);
      
      // Destructure DTO
      const { ids, organizationId } = deleteVariablesDto;

      if (!ids || ids.length === 0) {
        this.logger.warn('Empty IDs array in delete request');
        throw new HttpException('No variable IDs provided for deletion', HttpStatus.BAD_REQUEST);
      }

      // Validate organizationId from DTO
      if (!organizationId) {
        this.logger.warn('Organization ID missing in delete request body');
        throw new HttpException('Organization ID must be provided in the request body', HttpStatus.BAD_REQUEST);
      }

      // Ensure user context exists (userId)
      if (!req.user || !req.user.userId) { 
        this.logger.error('User ID missing in request context for deletion'); 
        throw new HttpException('Authentication context is missing', HttpStatus.UNAUTHORIZED);
      }
      
      // Pass userId and organizationId from DTO to the service
      const result = await this.dataIntakeService.deleteVariables(
        { ids }, // Pass only {ids} if service only needs that from DTO
        req.user.userId,
        organizationId, // Use organizationId from DTO
        req
      );
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