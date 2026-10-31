import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { Request } from 'express';
import { formatMonth, monthIndex } from '@vibefc/forecast-engine';

// DTOs
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';
import { VariableType, TimeSeriesPoint } from './dto/variable.dto';

/** A point as the save functions expect it: first of the month and a finite number or null. */
interface MonthPoint {
  month: string; // 'YYYY-MM-01'
  value: number | null;
}

/** Variable row with its values, as returned by the API: values are `{date: 'YYYY-MM-01', value}`. */
const VARIABLE_COLUMNS = 'id, name, type, user_id, organization_id, created_at, updated_at, variable_values(month, value)';

// 'YYYY-MM' or 'YYYY-MM-DD', optionally followed by a time: read as written, no time zone.
const ISO_MONTH_PREFIX = /^(\d{4})-(\d{2})(?:-(\d{2}))?(?:$|T)/;

@Injectable()
export class DataIntakeService {
  private readonly logger = new Logger(DataIntakeService.name);

  constructor(private supabase: SupabaseOptimizedService) {}

  // CREATE - Add new variables (each with its values, in one transaction)
  async addVariables(addVariablesDto: AddVariablesDto, request: Request) {
    const { variables } = addVariablesDto;
    if (!variables || variables.length === 0) {
      return { message: 'No variables to add', count: 0, variables: [] };
    }

    const payload = variables.map((variable) => {
      const name = variable.name || 'Unnamed Variable';
      if (!variable.user_id || !variable.organization_id) {
        throw new BadRequestException(`User ID and Organization ID are required for variable ${name}`);
      }
      return {
        id: variable.id,
        name,
        type: Object.values(VariableType).includes(variable.type as VariableType) ? variable.type : VariableType.UNKNOWN,
        user_id: variable.user_id,
        organization_id: variable.organization_id,
        values: this.toMonthPoints(variable.values, name),
      };
    });

    const client = this.supabase.getClientForRequest(request);
    const { error } = await client.rpc('create_variables', { p_variables: payload });
    if (error) {
      throw this.toHttpException(error, 'add variables');
    }

    const saved = await this.findByIds(payload.map((v) => v.id), request);
    this.logger.log(`Added ${saved.length} variables`);
    return { message: 'Variables added successfully', count: saved.length, variables: saved };
  }

  // READ - Variables of all organizations the user belongs to
  async getVariablesByUser(userId: string, request: Request) {
    const client = this.supabase.getClientForRequest(request);

    const { data: orgMembers, error: orgError } = await client
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);
    if (orgError) {
      throw this.toHttpException(orgError, 'fetch organizations');
    }
    if (!orgMembers || orgMembers.length === 0) {
      return {
        message: 'User not found in any organization or no variables available for their organizations',
        count: 0,
        variables: [],
      };
    }

    const organizationIds = orgMembers.map((member) => member.organization_id);
    const { data, error } = await client
      .from('variables')
      .select(VARIABLE_COLUMNS)
      .in('organization_id', organizationIds);
    if (error) {
      throw this.toHttpException(error, 'fetch variables');
    }

    const variables = (data || []).map((row) => this.toApiVariable(row));
    return {
      message: variables.length > 0 ? 'Variables retrieved successfully' : "No variables found for the user's organizations",
      count: variables.length,
      variables,
    };
  }

  // UPDATE - Name, type and/or values. Values are merged by month unless replaceValues is set.
  async updateVariables(updateVariablesDto: UpdateVariablesDto, request: Request) {
    const { variables } = updateVariablesDto;
    if (!variables || variables.length === 0) {
      return { message: 'No variables to update', count: 0, variables: [] };
    }

    const payload = variables.map((variable) => ({
      id: variable.id,
      ...(variable.name !== undefined ? { name: variable.name } : {}),
      ...(variable.type !== undefined ? { type: variable.type } : {}),
      ...(variable.values !== undefined
        ? { values: this.toMonthPoints(variable.values, variable.name || variable.id), replace_values: variable.replaceValues === true }
        : {}),
    }));

    const client = this.supabase.getClientForRequest(request);
    const { error } = await client.rpc('update_variables', { p_variables: payload });
    if (error) {
      throw this.toHttpException(error, 'update variables');
    }

    const updated = await this.findByIds(payload.map((v) => v.id), request);
    this.logger.log(`Updated ${updated.length} variables`);
    return { message: 'Variables updated successfully', count: updated.length, variables: updated };
  }

  // DELETE - Variables of one organization; their values go with them (ON DELETE CASCADE)
  async deleteVariables(
    deleteVariablesDto: DeleteVariablesDto,
    requestingUserId: string,
    requestingOrgId: string,
    request: Request
  ) {
    const { ids } = deleteVariablesDto;
    if (!ids || ids.length === 0) {
      return { message: 'No variables to delete', count: 0, deletedIds: [] };
    }

    const client = this.supabase.getClientForRequest(request);
    this.logger.log(`Deleting ${ids.length} variables for user ${requestingUserId} in org ${requestingOrgId}`);

    const { data: existingRows, error: existingError } = await client
      .from('variables')
      .select('id, organization_id, name')
      .in('id', ids);
    if (existingError) {
      throw this.toHttpException(existingError, 'verify variables before deletion');
    }

    const existingById = new Map((existingRows || []).map((row) => [row.id, row]));
    for (const variableId of ids) {
      const existing = existingById.get(variableId);
      if (!existing) {
        throw new NotFoundException(`Variable with ID ${variableId} not found`);
      }
      if (existing.organization_id !== requestingOrgId) {
        throw new ForbiddenException('Access denied: Variable does not belong to your organization');
      }
    }

    const { error: deleteError } = await client.from('variables').delete().in('id', ids);
    if (deleteError) {
      throw this.toHttpException(deleteError, 'delete variables');
    }

    this.logger.log(`Deleted ${ids.length} variables`);
    return { message: 'Variables deleted successfully', count: ids.length, deletedIds: ids };
  }

  /**
   * Forecasts with a node that reads this variable: a DATA node's variable or a METRIC
   * node's historical or budget variable. Only forecasts the caller can read are listed.
   */
  async getVariableUsage(variableId: string, request: Request): Promise<{ forecasts: Array<{ id: string; name: string }> }> {
    const client = this.supabase.getClientForRequest(request);
    const { data, error } = await client
      .from('forecast_nodes')
      .select('forecasts(id, name)')
      .or(
        ['variableId', 'historicalVariableId', 'budgetVariableId']
          .map((attribute) => `attributes->>${attribute}.eq.${variableId}`)
          .join(',')
      );
    if (error) {
      throw this.toHttpException(error, 'find forecasts that use the variable');
    }

    const forecasts = new Map<string, string>();
    // Without generated types supabase-js types the many-to-one embed as an array; it is an object
    for (const row of (data || []) as unknown as Array<{ forecasts: { id: string; name: string } | null }>) {
      if (row.forecasts) {
        forecasts.set(row.forecasts.id, row.forecasts.name);
      }
    }
    return {
      forecasts: [...forecasts]
        .map(([id, name]) => ({ id, name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  private async findByIds(ids: string[], request: Request) {
    const client = this.supabase.getClientForRequest(request);
    const { data, error } = await client.from('variables').select(VARIABLE_COLUMNS).in('id', ids);
    if (error) {
      throw this.toHttpException(error, 'read saved variables');
    }
    return (data || []).map((row) => this.toApiVariable(row));
  }

  private toApiVariable(row: any) {
    const { variable_values: points, ...variable } = row;
    const values = ((points as Array<{ month: string; value: number | null }>) || [])
      .map((point) => ({ date: point.month, value: point.value }))
      .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { ...variable, values };
  }

  /**
   * Validates incoming points and converts them to first-of-month rows. Dates are read as
   * written ('2024-03-15', '2024-03', '2024-03-01T00:00:00+01:00' are all March 2024), so the
   * server's time zone never matters. Values must be finite numbers or null (= no value).
   * Rejects the whole request rather than storing guesses.
   */
  private toMonthPoints(values: TimeSeriesPoint[] | undefined, variableName: string): MonthPoint[] {
    if (values === undefined || values === null) {
      return [];
    }
    if (!Array.isArray(values)) {
      throw new BadRequestException(`Values of variable "${variableName}" must be an array`);
    }

    const problems: string[] = [];
    const seen = new Set<string>();
    const points: MonthPoint[] = [];

    values.forEach((point, index) => {
      const where = `variable "${variableName}", value ${index + 1}`;
      if (!point || typeof point !== 'object') {
        problems.push(`${where}: expected {date, value}`);
        return;
      }

      const match = typeof point.date === 'string' ? ISO_MONTH_PREFIX.exec(point.date) : null;
      const month = match ? Number(match[2]) : NaN;
      if (!match || month < 1 || month > 12) {
        problems.push(`${where}: date "${point.date}" is not YYYY-MM or YYYY-MM-DD`);
        return;
      }

      const raw = point.value as unknown;
      if (raw !== null && raw !== undefined && (typeof raw !== 'number' || !Number.isFinite(raw))) {
        problems.push(`${where}: value ${JSON.stringify(raw)} is not a finite number or null`);
        return;
      }

      const monthStart = `${match[1]}-${match[2]}-01`;
      if (seen.has(monthStart)) {
        problems.push(`${where}: month ${formatMonth(monthIndex(Number(match[1]), month))} appears more than once`);
        return;
      }
      seen.add(monthStart);
      points.push({ month: monthStart, value: (raw as number | null | undefined) ?? null });
    });

    if (problems.length > 0) {
      const shown = problems.slice(0, 10);
      const more = problems.length > shown.length ? ` (and ${problems.length - shown.length} more)` : '';
      throw new BadRequestException(`Invalid values: ${shown.join('; ')}${more}`);
    }
    return points.sort((a, b) => (a.month < b.month ? -1 : a.month > b.month ? 1 : 0));
  }

  /** Maps a Supabase/PostgREST error to an HTTP status without echoing database internals. */
  private toHttpException(error: { code?: string; message?: string }, action: string): HttpException {
    this.logger.error(`Failed to ${action}: [${error.code}] ${error.message}`);
    switch (error.code) {
      case 'P0002':
        return new NotFoundException(error.message);
      case '23505':
        return new ConflictException('A variable with this ID already exists');
      case '42501':
        return new ForbiddenException('You do not have permission to change variables in this organization');
      case '22P02':
      case '22007':
      case '22008':
      case '23514':
        return new BadRequestException(`Invalid variable data (${action})`);
      default:
        if (error.message?.toLowerCase().includes('row-level security')) {
          return new ForbiddenException('You do not have permission to change variables in this organization');
        }
        return new InternalServerErrorException(`Failed to ${action}`);
    }
  }
}
