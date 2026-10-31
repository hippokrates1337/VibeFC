import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DataIntakeService } from './data-intake.service';
import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { VariableType } from './dto/variable.dto';
import { AddVariablesDto } from './dto/add-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';

type MockQueryBuilder = {
  select: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
};

describe('DataIntakeService', () => {
  let service: DataIntakeService;

  const mockRequest = {
    headers: { authorization: 'Bearer test-token' },
    user: { userId: 'user-123' },
  } as any;

  let tableBuilders: Record<string, MockQueryBuilder>;
  let rpc: jest.Mock;

  const createBuilder = (): MockQueryBuilder => ({
    select: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockResolvedValue({ data: [], error: null }),
  });

  const mockSupabaseClient = {
    from: jest.fn((table: string) => tableBuilders[table]),
    rpc: jest.fn((...args: unknown[]) => rpc(...args)),
  };

  const mockSupabaseService = {
    getClientForRequest: jest.fn(() => mockSupabaseClient),
  };

  const variable = (values: Array<{ date: string; value: unknown }>, overrides = {}) => ({
    id: 'id-1',
    name: 'Revenue',
    type: VariableType.INPUT,
    values: values as any,
    user_id: 'user-123',
    organization_id: 'org-1',
    ...overrides,
  });

  /** Points sent to the create_variables RPC for one variable. */
  const savedPoints = async (values: Array<{ date: string; value: unknown }>) => {
    await service.addVariables({ variables: [variable(values)] }, mockRequest);
    const [, args] = rpc.mock.calls[rpc.mock.calls.length - 1];
    return args.p_variables[0].values as Array<{ month: string; value: number | null }>;
  };

  beforeEach(async () => {
    tableBuilders = {
      variables: createBuilder(),
      organization_members: createBuilder(),
    };
    rpc = jest.fn().mockResolvedValue({ data: null, error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [DataIntakeService, { provide: SupabaseOptimizedService, useValue: mockSupabaseService }],
    }).compile();

    service = module.get<DataIntakeService>(DataIntakeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addVariables', () => {
    it('creates variables with their values in one RPC call and returns them as saved', async () => {
      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [
          {
            id: 'id-1',
            name: 'Revenue',
            organization_id: 'org-1',
            variable_values: [
              { month: '2024-02-01', value: 20 },
              { month: '2024-01-01', value: 10 },
            ],
          },
        ],
        error: null,
      });

      const dto: AddVariablesDto = {
        variables: [variable([{ date: '2024-01-15', value: 10 }, { date: '2024-02-01', value: 20 }])],
      };
      const result = await service.addVariables(dto, mockRequest);

      expect(rpc).toHaveBeenCalledTimes(1);
      expect(rpc).toHaveBeenCalledWith('create_variables', {
        p_variables: [
          {
            id: 'id-1',
            name: 'Revenue',
            type: VariableType.INPUT,
            user_id: 'user-123',
            organization_id: 'org-1',
            values: [
              { month: '2024-01-01', value: 10 },
              { month: '2024-02-01', value: 20 },
            ],
          },
        ],
      });
      expect(tableBuilders.variables.in).toHaveBeenCalledWith('id', ['id-1']);
      expect(result.count).toBe(1);
      expect(result.variables[0]).toEqual({
        id: 'id-1',
        name: 'Revenue',
        organization_id: 'org-1',
        values: [
          { date: '2024-01-01', value: 10 },
          { date: '2024-02-01', value: 20 },
        ],
      });
    });

    it('throws when required ownership fields are missing', async () => {
      const dto = { variables: [variable([], { user_id: undefined, organization_id: undefined })] } as any;

      await expect(service.addVariables(dto, mockRequest)).rejects.toThrow(/User ID and Organization ID are required/);
      expect(rpc).not.toHaveBeenCalled();
    });

    it('maps a row-level security violation to 403', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { code: '42501', message: 'new row violates row-level security policy' } });

      await expect(service.addVariables({ variables: [variable([])] }, mockRequest)).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('value validation', () => {
    it('keeps null as "no value" instead of turning it into 0', async () => {
      await expect(savedPoints([{ date: '2024-01-01', value: null }, { date: '2024-02-01', value: 0 }])).resolves.toEqual([
        { month: '2024-01-01', value: null },
        { month: '2024-02-01', value: 0 },
      ]);
    });

    it.each([
      ['an unreadable date', [{ date: 'not-a-date', value: 1 }], /date "not-a-date" is not YYYY-MM/],
      ['a month outside 1-12', [{ date: '2024-13-01', value: 1 }], /date "2024-13-01"/],
      ['a numeric string', [{ date: '2024-01-01', value: '42' }], /value "42" is not a finite number/],
      ['NaN', [{ date: '2024-01-01', value: NaN }], /value null is not a finite number|is not a finite number/],
      ['the same month twice', [{ date: '2024-01-01', value: 1 }, { date: '2024-01-31', value: 2 }], /01-2024 appears more than once/],
    ])('rejects %s with 400 and stores nothing', async (_label, values, message) => {
      const attempt = service.addVariables({ variables: [variable(values)] }, mockRequest);

      await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
      await expect(service.addVariables({ variables: [variable(values)] }, mockRequest)).rejects.toThrow(message);
      expect(rpc).not.toHaveBeenCalled();
    });
  });

  // Dates are stored as the first of their calendar month, identically in every server
  // time zone. East of UTC, local-time Date methods used to store March as '2024-02-29',
  // and every later save moved the series another month back. The time zone can only be
  // chosen when the process starts (jest sandboxes process.env), so CI runs this suite
  // under several TZ values.
  describe(`date normalization (TZ=${process.env.TZ ?? 'system default'})`, () => {
    const storedMonths = async (dates: string[]) =>
      (await savedPoints(dates.map((date, i) => ({ date, value: i })))).map((p) => p.month);

    it('runs in the time zone requested via TZ', () => {
      if (process.env.TZ) {
        expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe(process.env.TZ);
      }
    });

    it('stores the first of the calendar month as written', async () => {
      await expect(
        storedMonths([
          '2024-01-01',
          '2024-02-29',
          '2024-03-15',
          '2024-07',
          '2024-10-27',
          '2024-12-31',
          '2025-03-01T00:00:00+01:00',
          '2025-04-30T23:30:00Z',
        ])
      ).resolves.toEqual([
        '2024-01-01',
        '2024-02-01',
        '2024-03-01',
        '2024-07-01',
        '2024-10-01',
        '2024-12-01',
        '2025-03-01',
        '2025-04-01',
      ]);
    });

    it('leaves already normalized dates unchanged when saved again', async () => {
      const first = await storedMonths(['2025-01-01', '2025-06-01', '2025-12-01']);
      const second = await storedMonths(first);
      const third = await storedMonths(second);

      expect(first).toEqual(['2025-01-01', '2025-06-01', '2025-12-01']);
      expect(third).toEqual(first);
    });
  });

  describe('getVariablesByUser', () => {
    it('returns variables of the user organizations with values sorted by month', async () => {
      tableBuilders.organization_members.eq.mockResolvedValueOnce({ data: [{ organization_id: 'org-1' }], error: null });
      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [
          {
            id: 'id-1',
            organization_id: 'org-1',
            variable_values: [
              { month: '2025-03-01', value: 3 },
              { month: '2025-01-01', value: null },
            ],
          },
        ],
        error: null,
      });

      const result = await service.getVariablesByUser('user-123', mockRequest);

      expect(tableBuilders.variables.in).toHaveBeenCalledWith('organization_id', ['org-1']);
      expect(result.count).toBe(1);
      expect(result.variables[0].values).toEqual([
        { date: '2025-01-01', value: null },
        { date: '2025-03-01', value: 3 },
      ]);
      expect(result.variables[0]).not.toHaveProperty('variable_values');
    });
  });

  describe('updateVariables', () => {
    it('merges values by month unless replaceValues is set, and leaves values alone when omitted', async () => {
      await service.updateVariables(
        {
          variables: [
            { id: 'id-1', values: [{ date: '2025-02-01', value: 5 }] },
            { id: 'id-2', values: [{ date: '2025-02-01', value: 6 }], replaceValues: true },
            { id: 'id-3', name: 'Renamed' },
          ],
        },
        mockRequest
      );

      expect(rpc).toHaveBeenCalledWith('update_variables', {
        p_variables: [
          { id: 'id-1', values: [{ month: '2025-02-01', value: 5 }], replace_values: false },
          { id: 'id-2', values: [{ month: '2025-02-01', value: 6 }], replace_values: true },
          { id: 'id-3', name: 'Renamed' },
        ],
      });
      expect(tableBuilders.variables.in).toHaveBeenCalledWith('id', ['id-1', 'id-2', 'id-3']);
    });

    it('answers 404 when a variable does not exist or is not editable', async () => {
      rpc.mockResolvedValueOnce({ data: null, error: { code: 'P0002', message: 'Variable missing-id not found' } });

      await expect(service.updateVariables({ variables: [{ id: 'missing-id', name: 'Nope' }] }, mockRequest)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe('deleteVariables', () => {
    it('deletes variables in a single set-based mutation', async () => {
      const dto: DeleteVariablesDto = { ids: ['id-1', 'id-2'] };
      tableBuilders.variables.in
        .mockResolvedValueOnce({
          data: [
            { id: 'id-1', organization_id: 'org-1', name: 'A' },
            { id: 'id-2', organization_id: 'org-1', name: 'B' },
          ],
          error: null,
        })
        .mockResolvedValueOnce({ data: null, error: null });

      const result = await service.deleteVariables(dto, 'user-123', 'org-1', mockRequest);

      expect(tableBuilders.variables.delete).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ message: 'Variables deleted successfully', count: 2, deletedIds: ['id-1', 'id-2'] });
    });

    it('answers 403 when a variable belongs to another organization', async () => {
      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [{ id: 'id-1', organization_id: 'org-other', name: 'A' }],
        error: null,
      });

      await expect(service.deleteVariables({ ids: ['id-1'] }, 'user-123', 'org-1', mockRequest)).rejects.toBeInstanceOf(
        ForbiddenException
      );
      expect(tableBuilders.variables.delete).not.toHaveBeenCalled();
    });

    it('answers 404 when a variable does not exist', async () => {
      await expect(service.deleteVariables({ ids: ['missing'] }, 'user-123', 'org-1', mockRequest)).rejects.toBeInstanceOf(
        NotFoundException
      );
    });
  });

  describe('getVariableUsage', () => {
    const usageBuilder = (rows: unknown[]) => {
      const builder = { select: jest.fn().mockReturnThis(), or: jest.fn().mockResolvedValue({ data: rows, error: null }) };
      tableBuilders.forecast_nodes = builder as any;
      return builder;
    };

    it('lists each forecast once, by name, whose nodes read the variable', async () => {
      const builder = usageBuilder([
        { forecasts: { id: 'f-2', name: 'Plan 2027' } },
        { forecasts: { id: 'f-1', name: 'Budget 2026' } },
        { forecasts: { id: 'f-2', name: 'Plan 2027' } },
      ]);

      const usage = await service.getVariableUsage('var-1', mockRequest);

      expect(usage.forecasts).toEqual([
        { id: 'f-1', name: 'Budget 2026' },
        { id: 'f-2', name: 'Plan 2027' },
      ]);
      expect(builder.or).toHaveBeenCalledWith(
        'attributes->>variableId.eq.var-1,attributes->>historicalVariableId.eq.var-1,attributes->>budgetVariableId.eq.var-1'
      );
    });

    it('returns no forecasts for an unused variable', async () => {
      usageBuilder([]);
      expect(await service.getVariableUsage('var-1', mockRequest)).toEqual({ forecasts: [] });
    });
  });
});
