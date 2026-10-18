import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DataIntakeService } from './data-intake.service';
import { SupabaseOptimizedService } from '../supabase/supabase-optimized.service';
import { VariableType } from './dto/variable.dto';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';

type MockQueryBuilder = {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  single: jest.Mock;
};

describe('DataIntakeService', () => {
  let service: DataIntakeService;

  const mockRequest = {
    headers: { authorization: 'Bearer test-token' },
    user: { userId: 'user-123' },
  } as any;

  let tableBuilders: Record<string, MockQueryBuilder>;

  const createBuilder = (): MockQueryBuilder => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    single: jest.fn(),
  });

  const mockSupabaseClient = {
    from: jest.fn((table: string) => tableBuilders[table] || createBuilder()),
  };

  const mockSupabaseService = {
    getClientForRequest: jest.fn(() => mockSupabaseClient),
  };

  beforeEach(async () => {
    tableBuilders = {
      variables: createBuilder(),
      organization_members: createBuilder(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataIntakeService,
        { provide: SupabaseOptimizedService, useValue: mockSupabaseService },
      ],
    }).compile();

    service = module.get<DataIntakeService>(DataIntakeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addVariables', () => {
    it('adds variables in a single batched insert', async () => {
      const dto: AddVariablesDto = {
        variables: [
          {
            id: 'id-1',
            name: 'Revenue',
            type: VariableType.INPUT,
            values: [{ date: '2024-01-15', value: 100 }],
            user_id: 'user-123',
            organization_id: 'org-1',
          },
          {
            id: 'id-2',
            name: 'Actuals',
            type: VariableType.ACTUAL,
            values: [],
            user_id: 'user-123',
            organization_id: 'org-1',
          },
        ],
      };

      tableBuilders.variables.select.mockResolvedValueOnce({
        data: [
          { id: 'id-1', name: 'Revenue' },
          { id: 'id-2', name: 'Actuals' },
        ],
        error: null,
      });

      const result = await service.addVariables(dto, mockRequest);

      expect(tableBuilders.variables.insert).toHaveBeenCalledTimes(1);
      const insertedPayload = tableBuilders.variables.insert.mock.calls[0][0];
      expect(insertedPayload).toHaveLength(2);
      expect(insertedPayload[0]).toMatchObject({
        id: 'id-1',
        user_id: 'user-123',
        organization_id: 'org-1',
      });
      expect(result.count).toBe(2);
    });

    it('throws when required ownership fields are missing', async () => {
      const dto: AddVariablesDto = {
        variables: [
          {
            id: 'id-1',
            name: 'Invalid',
            type: VariableType.INPUT,
            values: [],
          } as any,
        ],
      };

      await expect(service.addVariables(dto, mockRequest)).rejects.toThrow(
        /User ID and Organization ID are required/
      );
      expect(tableBuilders.variables.insert).not.toHaveBeenCalled();
    });
  });

  describe('getVariablesByUser', () => {
    it('returns variables for organizations the user belongs to', async () => {
      tableBuilders.organization_members.eq.mockResolvedValueOnce({
        data: [{ organization_id: 'org-1' }],
        error: null,
      });
      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [{ id: 'id-1', organization_id: 'org-1' }],
        error: null,
      });

      const result = await service.getVariablesByUser('user-123', mockRequest);

      expect(result.count).toBe(1);
      expect(tableBuilders.variables.in).toHaveBeenCalledWith('organization_id', ['org-1']);
    });
  });

  describe('updateVariables', () => {
    it('updates all requested variables after one batched existence lookup', async () => {
      const dto: UpdateVariablesDto = {
        variables: [
          { id: 'id-1', name: 'Renamed' },
          { id: 'id-2', type: VariableType.BUDGET },
        ],
      };

      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [
          { id: 'id-1', name: 'Old Name' },
          { id: 'id-2', name: 'Other Name' },
        ],
        error: null,
      });

      tableBuilders.variables.single
        .mockResolvedValueOnce({ data: { id: 'id-1', name: 'Renamed' }, error: null })
        .mockResolvedValueOnce({ data: { id: 'id-2', type: VariableType.BUDGET }, error: null });

      const result = await service.updateVariables(dto, mockRequest);

      expect(tableBuilders.variables.in).toHaveBeenCalledWith('id', ['id-1', 'id-2']);
      expect(tableBuilders.variables.update).toHaveBeenCalledTimes(2);
      expect(result.count).toBe(2);
    });

    it('throws NotFoundException when one variable does not exist', async () => {
      const dto: UpdateVariablesDto = {
        variables: [{ id: 'missing-id', name: 'Nope' }],
      };

      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      await expect(service.updateVariables(dto, mockRequest)).rejects.toThrow(
        /Variable with ID missing-id not found/
      );
      expect(tableBuilders.variables.update).not.toHaveBeenCalled();
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
      expect(result).toEqual({
        message: 'Variables deleted successfully',
        count: 2,
        deletedIds: ['id-1', 'id-2'],
      });
    });

    it('throws when variable belongs to another organization', async () => {
      const dto: DeleteVariablesDto = { ids: ['id-1'] };

      tableBuilders.variables.in.mockResolvedValueOnce({
        data: [{ id: 'id-1', organization_id: 'org-other', name: 'A' }],
        error: null,
      });

      await expect(service.deleteVariables(dto, 'user-123', 'org-1', mockRequest)).rejects.toThrow(
        /Access denied/
      );
      expect(tableBuilders.variables.delete).not.toHaveBeenCalled();
    });
  });
});
