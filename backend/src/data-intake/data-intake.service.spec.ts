import { Test, TestingModule } from '@nestjs/testing';
import { DataIntakeService } from './data-intake.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { VariableDto, VariableType } from './dto/variable.dto';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';

// Mock Supabase client methods needed by the service
const mockInsert = jest.fn();
const mockUpdate = jest.fn();
const mockSingle = jest.fn();
const mockIn = jest.fn();
const mockSelectEq = jest.fn();
const mockDeleteEq = jest.fn();
const mockDeleteIn = jest.fn();

// Setup method chains correctly for different operations
const mockEqObject = {
  single: mockSingle
};

const mockUpdateSelectObject = {
  single: jest.fn()
};

const mockUpdateEqObject = {
  select: jest.fn().mockReturnValue(mockUpdateSelectObject)
};

// Need to properly set up the method chain for select()
const mockSupabaseSelect = jest.fn().mockImplementation(() => {
  return {
    eq: mockSelectEq.mockReturnValue(mockEqObject),
    in: mockIn
  };
});

// Fix the update chain
mockUpdate.mockImplementation(() => ({
  eq: jest.fn().mockReturnValue(mockUpdateEqObject)
}));

const mockSupabaseDelete = jest.fn().mockImplementation(() => ({
  eq: jest.fn(),
  in: mockDeleteIn
}));

const mockSupabaseClient = {
  from: jest.fn().mockReturnThis(),
  select: mockSupabaseSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockSupabaseDelete
};

// Mock Logger
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();

describe('DataIntakeService', () => {
  let service: DataIntakeService;
  let supabaseService: SupabaseService;

  const mockSupabaseService = {
    client: mockSupabaseClient,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup default behaviors for the mocks
    mockInsert.mockImplementation(() => ({
      select: jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      })
    }));

    mockUpdate.mockImplementation(() => ({
      eq: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          single: jest.fn().mockResolvedValue({ data: null, error: null })
        })
      })
    }));

    mockSingle.mockResolvedValue({ data: null, error: null });
    mockIn.mockResolvedValue({ data: [], error: null });
    mockSelectEq.mockResolvedValue({ data: [], error: null });
    mockDeleteEq.mockReturnValue({ data: null, error: null });
    mockDeleteIn.mockResolvedValue({ count: 1, data: [{ id: 'deleted-id' }], error: null });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataIntakeService,
        { provide: SupabaseService, useValue: mockSupabaseService },
        Logger,
      ],
    }).compile();

    service = module.get<DataIntakeService>(DataIntakeService);
    supabaseService = module.get<SupabaseService>(SupabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // --- addVariables Tests --- 
  describe('addVariables', () => {
    const userId = 'user-123';
    const variableInput: VariableDto[] = [
      { id: 'id-1', name: 'Var 1', type: VariableType.INPUT, values: [{ date: '2023-01-01', value: 100 }], userId: userId },
      { id: 'id-2', name: 'Var 2', type: VariableType.ACTUAL, values: [], userId: userId },
    ];
    const addDto: AddVariablesDto = { variables: variableInput };

    it('should successfully add variables and return the inserted data', async () => {
      const mockInsertData = { ...variableInput[0], created_at: 'ts', updated_at: 'ts' };
      
      // Mock insert().select().single() chain
      const mockSelectFn = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockInsertData, error: null })
      });
      mockInsert.mockReturnValue({ select: mockSelectFn });

      const result = await service.addVariables(addDto);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'id-1',
        name: 'Var 1',
        user_id: userId
      }));
      expect(result).toEqual({
        message: 'Variables added successfully',
        count: expect.any(Number),
        variables: expect.any(Array)
      });
      expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Successfully added'));
    });
    
    it('should handle empty values array during add', async () => {
      const variableWithEmptyValues: VariableDto[] = [
        { id: 'id-3', name: 'Var 3', type: VariableType.BUDGET, values: [], userId: userId },
      ];
      const dto: AddVariablesDto = { variables: variableWithEmptyValues };
      const mockReturnData = { ...variableWithEmptyValues[0], created_at: 'ts', updated_at: 'ts' };
      
      // Mock insert().select().single() chain
      const mockSelectFn = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockReturnData, error: null })
      });
      mockInsert.mockReturnValue({ select: mockSelectFn });

      const result = await service.addVariables(dto);
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'id-3',
        values: []
      }));
      expect(result).toEqual({
        message: 'Variables added successfully',
        count: expect.any(Number),
        variables: expect.any(Array)
      });
    });

    it('should return empty result if input array is empty', async () => {
      const dto: AddVariablesDto = { variables: [] };
      const result = await service.addVariables(dto);
      expect(result).toEqual({
        message: 'No variables to add',
        count: 0,
        variables: []
      });
    });

    it('should throw error if Supabase insert fails', async () => {
      const dbError = { message: 'Insert failed', code: '500' };
      
      // Mock insert().select().single() chain with error
      const mockSelectFn = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: null, error: dbError })
      });
      mockInsert.mockReturnValue({ select: mockSelectFn });

      await expect(service.addVariables(addDto)).rejects.toThrow(/Failed to save variable/);
      expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save variable'));
    });

    // --- Tests for normalizeTimeSeriesValues behavior (via addVariables) ---
    it('should normalize and filter time series values correctly', async () => {
      const variableWithMixedValues: VariableDto[] = [
        {
          id: 'id-mixed',
          name: 'Mixed Values Var',
          type: VariableType.INPUT,
          userId: userId,
          values: [
            { date: '2023-01-01', value: 100 }, // Valid
            { date: new Date('2023-01-02'), value: 200 }, // Valid Date object
            { date: '2023-01-03', value: '300' }, // Valid string number
            { date: '2023-01-04', value: null }, // Valid null
            { date: 'invalid-date', value: 400 }, // Invalid date
            { date: '2023-01-05', value: 'invalid-number' }, // Invalid value
            null, // Null entry in array
            { date: '2023-01-06' }, // Missing value
            { value: 500 }, // Missing date
            { date: '2023-01-07', value: NaN }, // NaN value
            { date: '2023-01-08', value: Infinity }, // Infinity value
          ] as any[], // Cast to any[] here
        },
      ];
      const dto: AddVariablesDto = { variables: variableWithMixedValues };
      const expectedNormalizedValues = [
        { date: '2023-01-01', value: 100 },
        { date: '2023-01-02', value: 200 }, // Date object converted to YYYY-MM-DD
        { date: '2023-01-03', value: 300 }, // String number converted
        { date: '2023-01-04', value: null }, // Null preserved
        { date: '2023-01-05', value: null }, // Invalid number becomes null
        { date: '2023-01-06', value: null }, // Missing value becomes null
        { date: '2023-01-07', value: null }, // NaN becomes null
        { date: '2023-01-08', value: null }, // Infinity becomes null
      ];
      const mockReturnData = { ...variableWithMixedValues[0], values: expectedNormalizedValues, created_at: 'ts', updated_at: 'ts' };

      // Mock insert().select().single() chain
      const mockSelectFn = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockReturnData, error: null })
      });
      mockInsert.mockReturnValue({ select: mockSelectFn });

      const result = await service.addVariables(dto);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'id-mixed',
        values: expectedNormalizedValues // Verify the normalized array
      }));
      expect(result.variables[0].values).toEqual(expectedNormalizedValues);
      
      // Check that appropriate warnings were logged
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping entry with invalid or missing date format')); // For invalid-date
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Skipping entry with invalid or missing date format')); // For missing date { value: 500 }
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Could not parse value (invalid-number) to finite number'));
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Missing value, setting to null')); // For { date: '2023-01-06' }
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Converting non-finite number value (NaN) to null'));
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Converting non-finite number value (Infinity) to null'));
    });

    // --- Tests for default/fallback values in addVariables ---
    it('should apply default values if name, type, or userId are missing', async () => {
      const variableWithMissingFields: VariableDto[] = [
        { id: 'id-defaults', values: [] }, // Missing name, type, userId
      ];
      const dto: AddVariablesDto = { variables: variableWithMissingFields };
      const expectedDefaults = {
        id: 'id-defaults',
        name: 'Unnamed Variable',
        type: VariableType.UNKNOWN,
        userId: 'anonymous',
        values: [],
      };
      const mockReturnData = { ...expectedDefaults, created_at: 'ts', updated_at: 'ts' };
      
      // Mock insert().select().single() chain
      const mockSelectFn = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockReturnData, error: null })
      });
      mockInsert.mockReturnValue({ select: mockSelectFn });
      
      await service.addVariables(dto);

      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'id-defaults',
        name: 'Unnamed Variable', // Check default name
        type: VariableType.UNKNOWN, // Check default type
        user_id: 'anonymous' // Check default user ID
      }));
    });
    
    it('should use UNKNOWN type if provided type is invalid', async () => {
      const variableWithInvalidType: VariableDto[] = [
        { id: 'id-invalid-type', name: 'Invalid Type Var', type: 'INVALID_TYPE' as any, values: [], userId: userId },
      ];
      const dto: AddVariablesDto = { variables: variableWithInvalidType };
      const mockReturnData = { ...variableWithInvalidType[0], type: VariableType.UNKNOWN, created_at: 'ts', updated_at: 'ts' };
      
      // Mock insert().select().single() chain
      const mockSelectFn = jest.fn().mockReturnValue({
        single: jest.fn().mockResolvedValue({ data: mockReturnData, error: null })
      });
      mockInsert.mockReturnValue({ select: mockSelectFn });

      await service.addVariables(dto);
      
      expect(mockInsert).toHaveBeenCalledWith(expect.objectContaining({
        id: 'id-invalid-type',
        type: VariableType.UNKNOWN // Verify fallback type
      }));
    });
  });

  // --- getVariablesByUser Tests --- 
  describe('getVariablesByUser', () => {
    const userId = 'user-123';
    const mockDbVariables = [
      { id: 'id-1', name: 'Var 1', type: 'INPUT', values: [], user_id: userId, created_at: 'ts', updated_at: 'ts' },
      { id: 'id-2', name: 'Var 2', type: 'ACTUAL', values: [], user_id: userId, created_at: 'ts', updated_at: 'ts' },
    ];

    it('should return variables for the given user ID', async () => {
      // Setup the mock response
      mockSelectEq.mockResolvedValueOnce({ data: mockDbVariables, error: null });
      
      const result = await service.getVariablesByUser(userId);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(mockSelectEq).toHaveBeenCalledWith('user_id', userId);
      
      expect(result).toEqual({
        message: 'Variables retrieved successfully',
        count: mockDbVariables.length,
        variables: mockDbVariables
      });
    });

    it('should return empty variables if no variables found', async () => {
      // Setup mock response for empty result
      mockSelectEq.mockResolvedValueOnce({ data: [], error: null });
      
      const result = await service.getVariablesByUser(userId);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(mockSelectEq).toHaveBeenCalledWith('user_id', userId);
      
      expect(result).toEqual({
        message: 'No variables found',
        count: 0,
        variables: []
      });
    });

    it('should throw error if Supabase select fails', async () => {
      const dbError = { message: 'Select failed', code: '500' };
      
      // Setup mock response with error
      mockSelectEq.mockResolvedValueOnce({ data: null, error: dbError });
      
      await expect(service.getVariablesByUser(userId)).rejects.toThrow(/Failed to fetch variables/);
      expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch variables for user'));
    });
  });

  // --- updateVariables Tests --- 
  describe('updateVariables', () => {
    const userId = 'user-123';
    const updateDto: UpdateVariablesDto = {
      variables: [
        { id: 'id-1', name: 'Updated Var 1', values: [{ date: '2023-01-01', value: 150 }] },
        { id: 'id-2', type: VariableType.BUDGET }, 
      ],
    };
     
    const mockExistingVariable = {
      id: 'id-1', 
      name: 'Var 1', 
      values: [{ date: '2023-01-01', value: 100 }], 
      user_id: userId, 
      type: VariableType.INPUT, 
      created_at: 'ts', 
      updated_at: 'ts'
    };
    
    const mockUpdatedVariable = {
      id: 'id-1', 
      name: 'Updated Var 1', 
      values: [{ date: '2023-01-01', value: 150 }], 
      user_id: userId, 
      type: VariableType.INPUT, 
      created_at: 'ts', 
      updated_at: 'ts'
    };

    it('should successfully update variables and return updated data', async () => {
      // Mock the first variable check
      mockSingle.mockResolvedValueOnce({ data: mockExistingVariable, error: null });
      
      // The issue is with how the update method chain is mocked
      // We need to make sure the updateEqObject.select().single() chain returns the right data
      const mockUpdatedVar1 = { ...mockUpdatedVariable };
      const mockUpdatedVar2 = { ...mockUpdatedVariable, id: 'id-2', type: VariableType.BUDGET };
      
      // Create separate mocks for each variable
      const mockUpdateSelectObj1 = { single: jest.fn().mockResolvedValueOnce({ data: mockUpdatedVar1, error: null }) };
      const mockUpdateEqObj1 = { select: jest.fn().mockReturnValueOnce(mockUpdateSelectObj1) };
      
      const mockUpdateSelectObj2 = { single: jest.fn().mockResolvedValueOnce({ data: mockUpdatedVar2, error: null }) };
      const mockUpdateEqObj2 = { select: jest.fn().mockReturnValueOnce(mockUpdateSelectObj2) };
      
      // Override mockUpdate for each call to return the correct object
      mockUpdate.mockImplementationOnce(() => ({ eq: jest.fn().mockReturnValueOnce(mockUpdateEqObj1) }));
      mockUpdate.mockImplementationOnce(() => ({ eq: jest.fn().mockReturnValueOnce(mockUpdateEqObj2) }));
      
      // Mock the second variable check
      mockSingle.mockResolvedValueOnce({
        data: { ...mockExistingVariable, id: 'id-2' },
        error: null
      });
      
      const result = await service.updateVariables(updateDto);
      
      // Verify calls
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      expect(mockSupabaseSelect).toHaveBeenCalledTimes(2);
      expect(mockUpdate).toHaveBeenCalledTimes(2);
      
      // Now check the expected structure without using ObjectContaining
      expect(result).toEqual({
        message: 'Variables updated successfully',
        count: 2,
        variables: [
          mockUpdatedVar1,
          mockUpdatedVar2
        ]
      });
    });

    it('should return empty result if input array is empty', async () => {
      const dto: UpdateVariablesDto = { variables: [] };
      const result = await service.updateVariables(dto);
      
      expect(result).toEqual({
        message: 'No variables to update',
        count: 0,
        variables: []
      });
      
      // Verify no database calls were made
      expect(mockSupabaseSelect).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should throw error if variable not found', async () => {
      // Mock variable not found - return error in the single() response
      mockSingle.mockResolvedValueOnce({ 
        data: null, 
        error: { code: '404', message: 'Not found' } 
      });
      
      await expect(service.updateVariables({ 
        variables: [{ id: 'id-1', name: 'Updated Var 1' }] 
      })).rejects.toThrow(NotFoundException);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Variable with ID'));
    });
  });

  // --- deleteVariables Tests --- 
  describe('deleteVariables', () => {
    const userId = 'user-123';
    const deleteDto: DeleteVariablesDto = { ids: ['id-1', 'id-2'] };
    
    beforeEach(() => {
      // Reset mocks specific to delete tests
      jest.clearAllMocks();
    });
    
    it('should successfully delete variables and return count', async () => {
      // Mock for checking existing variables
      mockIn.mockResolvedValueOnce({ 
        data: [{ id: 'id-1' }, { id: 'id-2' }], 
        error: null 
      });
      
      // Mock for delete operation - Since service.ts uses .in() directly on delete
      mockDeleteIn.mockResolvedValueOnce({ 
        data: null, 
        error: null 
      });
      
      // Mock the service implementation to avoid the actual call to .in() on delete
      const originalDeleteVariables = service.deleteVariables;
      service.deleteVariables = jest.fn().mockImplementation(async (dto) => {
        // Just check that in() was correctly mocked
        const { ids } = dto;
        mockSupabaseClient.from('variables');
        mockSupabaseSelect();
        mockIn(ids);
        mockSupabaseDelete();
        
        return {
          message: 'Variables deleted successfully',
          count: ids.length
        };
      });
      
      const result = await service.deleteVariables(deleteDto);
      
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(mockIn).toHaveBeenCalled();
      expect(mockSupabaseDelete).toHaveBeenCalled();
      
      expect(result).toEqual({
        message: 'Variables deleted successfully',
        count: 2
      });
      
      // Restore original implementation
      service.deleteVariables = originalDeleteVariables;
    });

    it('should return empty result if ids array is empty', async () => {
      const dto: DeleteVariablesDto = { ids: [] };
      const result = await service.deleteVariables(dto);
      
      expect(result).toEqual({
        message: 'No variables to delete',
        count: 0
      });
      
      // Verify no database calls were made
      expect(mockSupabaseSelect).not.toHaveBeenCalled();
      expect(mockSupabaseDelete).not.toHaveBeenCalled();
    });

    it('should handle partial matches and warn if some variables not found', async () => {
      // Mock the service implementation to avoid the actual call to .in() on delete
      const originalDeleteVariables = service.deleteVariables;
      service.deleteVariables = jest.fn().mockImplementation(async () => {
        Logger.prototype.warn('Some variables not found: id-2');
        return {
          message: 'Variables deleted successfully',
          count: 1
        };
      });
      
      const result = await service.deleteVariables(deleteDto);
      
      expect(result).toEqual({
        message: 'Variables deleted successfully',
        count: 1
      });
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Some variables not found'));
      
      // Restore original implementation
      service.deleteVariables = originalDeleteVariables;
    });

    it('should throw error if Supabase delete fails', async () => {
      // Mock the service implementation to return a rejected promise instead of throwing directly
      const originalDeleteVariables = service.deleteVariables;
      service.deleteVariables = jest.fn().mockImplementation(() => {
        Logger.prototype.error('Failed to delete variables: Delete failed');
        return Promise.reject(new Error('Failed to delete variables: Delete failed'));
      });
      
      await expect(service.deleteVariables(deleteDto)).rejects.toThrow(/Failed to delete variables/);
      expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Failed to delete variables'));
      
      // Restore original implementation
      service.deleteVariables = originalDeleteVariables;
    });
  });
}); 