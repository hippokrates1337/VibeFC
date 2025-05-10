import { Test, TestingModule } from '@nestjs/testing';
import { DataIntakeService } from './data-intake.service';
import { SupabaseService } from '../supabase/supabase.service';
import { Logger, BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { VariableDto, VariableType } from './dto/variable.dto';
import { AddVariablesDto } from './dto/add-variables.dto';
import { UpdateVariablesDto } from './dto/update-variables.dto';
import { DeleteVariablesDto } from './dto/delete-variables.dto';

// --- New Mock Strategy ---
// Mocks for the final results of Supabase chains
const mockSingleResult = jest.fn();
const mockInsertSingleResult = jest.fn();
const mockUpdateSingleResult = jest.fn();
const mockDeleteResult = jest.fn(); // Covers final result of delete chain
const mockSelectInResult = jest.fn(); // Covers direct result of select().in()
const mockDirectEqResult = jest.fn(); // For chains ending directly in .eq() like org check or delete check
const mockInsertInputData = jest.fn(); // To capture input to insert

// Base client mock - we'll override '.from' behavior in tests
const mockSupabaseClient = {
  from: jest.fn(),
};

// Mock the SupabaseService to use this client
const mockSupabaseService = {
  client: mockSupabaseClient,
};
// --- End New Mock Strategy ---


// Mock Logger
Logger.prototype.log = jest.fn();
Logger.prototype.error = jest.fn();
Logger.prototype.warn = jest.fn();

describe('DataIntakeService', () => {
  let service: DataIntakeService;
  let supabaseService: SupabaseService;

  // Define reusable mock data
  const mockOrgId = 'org-abc';
  const mockUserId = 'user-123';
  const mockOrgMembers = [{ organization_id: mockOrgId }];
  const mockDbVariables = [
    { id: 'id-1', name: 'Var 1', type: VariableType.INPUT, values: [], user_id: mockUserId, organization_id: mockOrgId, created_at: 'ts', updated_at: 'ts' },
    { id: 'id-2', name: 'Var 2', type: VariableType.ACTUAL, values: [], user_id: mockUserId, organization_id: mockOrgId, created_at: 'ts', updated_at: 'ts' },
  ];

  beforeEach(async () => {
    jest.clearAllMocks();

    // Reset the resolution/state of the final result mocks
    mockSingleResult.mockResolvedValue({ data: null, error: null });
    mockInsertSingleResult.mockResolvedValue({ data: null, error: null });
    mockUpdateSingleResult.mockResolvedValue({ data: null, error: null });
    mockDeleteResult.mockResolvedValue({ data: null, error: null }); // Default for delete
    mockSelectInResult.mockResolvedValue({ data: [], error: null });
    mockDirectEqResult.mockResolvedValue({ data: [], error: null }); // Default for direct eq results
    mockInsertInputData.mockClear(); // Clear captured data

    // Default '.from()' implementation - can be overridden in describe/test blocks
    mockSupabaseClient.from.mockImplementation((tableName: string) => ({
      select: jest.fn().mockReturnThis(),
      insert: mockInsertInputData.mockImplementation((data) => ({ // Capture input
        select: jest.fn().mockReturnValue({
          single: mockInsertSingleResult,
        }),
      })),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: mockSingleResult,
    }));


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
     beforeEach(() => {
        // Setup specific chain for addVariables: insert(data).select().single()
        mockSupabaseClient.from.mockImplementation((tableName: string) => ({
          insert: mockInsertInputData.mockImplementation((data) => ({ // Capture input
            select: jest.fn().mockReturnValue({
              single: mockInsertSingleResult,
            }),
          })),
          // Add other methods if needed by other tests in this block
        }));
     });

    const userId = 'user-123';
    const orgId = 'org-abc';
    const variableInput: VariableDto[] = [
      { id: 'id-1', name: 'Var 1', type: VariableType.INPUT, values: [{ date: '2023-01-01', value: 100 }], user_id: userId, organization_id: orgId },
      { id: 'id-2', name: 'Var 2', type: VariableType.ACTUAL, values: [], user_id: userId, organization_id: orgId },
    ];
    const addDto: AddVariablesDto = { variables: variableInput };

    it('should successfully add variables and return the inserted data', async () => {
      const mockInsertData1 = { ...variableInput[0], created_at: 'ts', updated_at: 'ts' };
      const mockInsertData2 = { ...variableInput[1], created_at: 'ts', updated_at: 'ts' };
      mockInsertSingleResult
       .mockResolvedValueOnce({ data: mockInsertData1, error: null })
       .mockResolvedValueOnce({ data: mockInsertData2, error: null });

      const result = await service.addVariables(addDto);

      expect(mockSupabaseClient.from).toHaveBeenCalledWith('variables');
      // Check the captured input data
      expect(mockInsertInputData).toHaveBeenCalledTimes(2);
      expect(mockInsertInputData).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'id-1', user_id: userId }));
      expect(mockInsertInputData).toHaveBeenNthCalledWith(2, expect.objectContaining({ id: 'id-2', user_id: userId }));
      expect(mockInsertSingleResult).toHaveBeenCalledTimes(2); // Check final step called twice

      expect(result.count).toBe(2);
      expect(result.variables.length).toBe(2);
      expect(result.variables[0]).toEqual(mockInsertData1);
      expect(result.variables[1]).toEqual(mockInsertData2);
      expect(Logger.prototype.log).toHaveBeenCalledWith(expect.stringContaining('Successfully added'));
    });
    
    it('should handle empty values array during add', async () => {
        const variableWithEmptyValues: VariableDto[] = [
          { id: 'id-3', name: 'Var 3', type: VariableType.BUDGET, values: [], user_id: userId, organization_id: orgId },
        ];
        const dto: AddVariablesDto = { variables: variableWithEmptyValues };
        const mockReturnData = { ...variableWithEmptyValues[0], created_at: 'ts', updated_at: 'ts' };
        mockInsertSingleResult.mockResolvedValueOnce({ data: mockReturnData, error: null });

        await service.addVariables(dto);

        expect(mockInsertInputData).toHaveBeenCalledTimes(1);
        expect(mockInsertInputData).toHaveBeenCalledWith(expect.objectContaining({
            id: 'id-3',
            values: [] // Check the specific field in the captured input
        }));
        expect(mockInsertSingleResult).toHaveBeenCalledTimes(1);
    });

    it('should normalize and filter time series values correctly', async () => {
       const variableWithMixedValues: VariableDto[] = [
         {
           id: 'id-mixed',
           name: 'Mixed Values Var',
           type: VariableType.INPUT,
           user_id: userId, 
           organization_id: orgId, 
           values: [
             { date: '2023-01-01', value: 100 }, 
             { date: new Date('2023-01-02'), value: 200 }, 
             { date: '2023-01-03', value: '300' }, 
             { date: '2023-01-04', value: null }, 
             { date: 'invalid-date', value: 400 }, 
             { date: '2023-01-05', value: 'invalid-number' }, 
             null, 
             { date: '2023-01-06' }, 
             { value: 500 }, 
             { date: '2023-01-07', value: NaN }, 
             { date: '2023-01-08', value: Infinity }, 
           ] as any[], 
         },
       ];
       const dto: AddVariablesDto = { variables: variableWithMixedValues };
       const expectedNormalizedValues = [
         { date: '2023-01-01', value: 100 },
         { date: '2023-01-02', value: 200 }, 
         { date: '2023-01-03', value: 300 }, 
         { date: '2023-01-04', value: null }, 
         { date: '2023-01-05', value: null }, 
         { date: '2023-01-06', value: null }, 
         { date: '2023-01-07', value: null }, 
         { date: '2023-01-08', value: null }, 
       ];
       const mockReturnData = { ...variableWithMixedValues[0], values: expectedNormalizedValues, created_at: 'ts', updated_at: 'ts' };      
       mockInsertSingleResult.mockResolvedValueOnce({ data: mockReturnData, error: null });

       await service.addVariables(dto);

       expect(mockInsertInputData).toHaveBeenCalledTimes(1);
       expect(mockInsertInputData).toHaveBeenCalledWith(expect.objectContaining({
         id: 'id-mixed',
         values: expectedNormalizedValues // Check normalized values in captured input
       }));
        expect(mockInsertSingleResult).toHaveBeenCalledTimes(1);
       // ... (check logs)
    });

     it('should apply default values if name or type are missing (when required fields are present)', async () => {
        const variableWithMissingFields: VariableDto[] = [
         { id: 'id-defaults', values: [], organization_id: orgId, user_id: userId }, 
       ];
       const dto: AddVariablesDto = { variables: variableWithMissingFields };
       const mockReturnData = { id: 'id-defaults', name: 'Unnamed Variable', type: VariableType.UNKNOWN, values: [], organization_id: orgId, user_id: userId, created_at: 'ts', updated_at: 'ts' };
       mockInsertSingleResult.mockResolvedValueOnce({ data: mockReturnData, error: null });

        await service.addVariables(dto);

        expect(mockInsertInputData).toHaveBeenCalledTimes(1);
        expect(mockInsertInputData).toHaveBeenCalledWith(expect.objectContaining({
          id: 'id-defaults',
          name: 'Unnamed Variable',
          type: VariableType.UNKNOWN,
          user_id: userId, // Check actual user_id in captured input
          organization_id: orgId
        }));
        expect(mockInsertSingleResult).toHaveBeenCalledTimes(1);
     });

     it('should use UNKNOWN type if provided type is invalid', async () => {
        const variableWithInvalidType: VariableDto[] = [
         { id: 'id-invalid-type', name: 'Invalid Type Var', type: 'INVALID_TYPE' as any, values: [], user_id: userId, organization_id: orgId },
       ];
       const dto: AddVariablesDto = { variables: variableWithInvalidType };
       const mockReturnData = { ...variableWithInvalidType[0], type: VariableType.UNKNOWN, created_at: 'ts', updated_at: 'ts' };
       mockInsertSingleResult.mockResolvedValueOnce({ data: mockReturnData, error: null });

        await service.addVariables(dto);

        expect(mockInsertInputData).toHaveBeenCalledTimes(1);
        expect(mockInsertInputData).toHaveBeenCalledWith(expect.objectContaining({
          id: 'id-invalid-type',
          type: VariableType.UNKNOWN // Check type in captured input
        }));
        expect(mockInsertSingleResult).toHaveBeenCalledTimes(1);
     });
     
      it('should throw error if Supabase insert fails', async () => {
        const variableInput: VariableDto[] = [
          { id: 'id-1', name: 'Var 1', type: VariableType.INPUT, values: [{ date: '2023-01-01', value: 100 }], user_id: userId, organization_id: orgId },
        ];
        const addDto: AddVariablesDto = { variables: variableInput };
        const dbError = { message: 'Insert failed', code: '500' };
        mockInsertSingleResult.mockResolvedValueOnce({ data: null, error: dbError });

        await expect(service.addVariables(addDto)).rejects.toThrow(/Failed to save variable/);
        expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Failed to save variable'));
        expect(mockInsertInputData).toHaveBeenCalledTimes(1); // Ensure insert was attempted
      });
  });

  // --- getVariablesByUser Tests --- 
  describe('getVariablesByUser', () => {
      let mockOrgEq: jest.Mock; // Declare mock for eq in this scope

      beforeEach(() => {
         // Setup specific chains for getVariablesByUser
         mockOrgEq = jest.fn(); // Initialize mock for eq
         mockSupabaseClient.from.mockImplementation((table: string) => {
           if (table === 'organization_members') {
             return { 
                 select: jest.fn().mockReturnThis(), // select() returns object with eq
                 eq: mockOrgEq // eq resolves directly using the mock in this scope
             };
           }
           if (table === 'variables') {
             return { 
                 select: jest.fn().mockReturnThis(), // select() returns object with in
                 in: mockSelectInResult 
             }; 
           }
           return {}; // Fallback empty object for safety
         });
      });

      const userId = 'user-123';
      const orgId = 'org-abc';
      const orgMembers = [{ organization_id: orgId }];
      const dbVariables = [
          { id: 'id-1', name: 'Var 1', type: VariableType.INPUT, values: [], user_id: userId, organization_id: orgId, created_at: 'ts', updated_at: 'ts' },
      ];

      it('should return variables for the given user ID', async () => {
        // Mock results
        mockOrgEq.mockResolvedValueOnce({ data: orgMembers, error: null });
        mockSelectInResult.mockResolvedValueOnce({ data: dbVariables, error: null });

        const result = await service.getVariablesByUser(userId);

        expect(mockOrgEq).toHaveBeenCalledWith('user_id', userId);
        expect(mockSelectInResult).toHaveBeenCalledWith('organization_id', [orgId]);
        expect(result.count).toBe(dbVariables.length);
        expect(result.variables).toEqual(dbVariables);
      });
       
      it('should return empty variables if user is in orgs but no variables found', async () => {
        mockOrgEq.mockResolvedValueOnce({ data: orgMembers, error: null });
        mockSelectInResult.mockResolvedValueOnce({ data: [], error: null });
       
        const result = await service.getVariablesByUser(userId);
       
        expect(mockOrgEq).toHaveBeenCalledWith('user_id', userId);
        expect(mockSelectInResult).toHaveBeenCalledWith('organization_id', [orgId]);
        expect(result.count).toBe(0);
        expect(result.variables).toEqual([]);
     });
     
     it('should return empty variables if user is not in any orgs', async () => {
         mockOrgEq.mockResolvedValueOnce({ data: [], error: null }); 
         
         const result = await service.getVariablesByUser(userId);
         
         expect(mockOrgEq).toHaveBeenCalledWith('user_id', userId);
         expect(mockSelectInResult).not.toHaveBeenCalled(); // Variables fetch shouldn't happen
         expect(result.count).toBe(0);
         expect(result.variables).toEqual([]);
      });

    it('should throw specific error if fetching organizations fails', async () => {
      const dbError = { message: 'Select failed on orgs', code: '500' };
      mockOrgEq.mockResolvedValueOnce({ data: null, error: dbError }); 
      
      await expect(service.getVariablesByUser(userId)).rejects.toThrow(
        /Error fetching variables by user's organizations: Failed to fetch organizations: Select failed on orgs/
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch organizations for user'));
    });
    
    it('should throw specific error if fetching variables fails', async () => {
      const dbError = { message: 'Select failed on variables', code: '500' };
      mockOrgEq.mockResolvedValueOnce({ data: orgMembers, error: null }); // Org check succeeds
      mockSelectInResult.mockResolvedValueOnce({ data: null, error: dbError }); // Variable fetch fails
      
      await expect(service.getVariablesByUser(userId)).rejects.toThrow(
        /Error fetching variables by user's organizations: Failed to fetch variables: Select failed on variables/
      );
      expect(Logger.prototype.error).toHaveBeenCalledWith(expect.stringContaining('Failed to fetch variables for organizations'));
    });
  });

  // --- updateVariables Tests --- 
  describe('updateVariables', () => {
      beforeEach(() => {
         // Setup specific chains for updateVariables
         const mockSelectEq = jest.fn().mockImplementation(() => ({ single: mockSingleResult }));
         const mockUpdateEq = jest.fn().mockImplementation(() => ({ select: jest.fn().mockReturnValue({ single: mockUpdateSingleResult }) }));
         
         mockSupabaseClient.from.mockImplementation((table: string) => {
            if (table === 'variables') {
               return {
                  select: jest.fn().mockReturnValue({ eq: mockSelectEq }), // select() returns obj with eq
                  update: jest.fn().mockReturnValue({ eq: mockUpdateEq }), // update() returns obj with eq
                  // Add other methods if used by the service in this context
               };
            }
            return {}; // Fallback
         });
         // Reset results for this scope
         mockSingleResult.mockClear().mockResolvedValue({ data: null, error: null });
         mockUpdateSingleResult.mockClear().mockResolvedValue({ data: null, error: null });
      });
      
    const userId = 'user-123';
    const orgId = 'org-abc';
    const updateDto: UpdateVariablesDto = {
      variables: [
        { id: 'id-1', name: 'Updated Var 1', values: [{ date: '2023-01-01', value: 150 }] },
        { id: 'id-2', type: VariableType.BUDGET }, 
      ],
    };
    const mockExistingVariable = { id: 'id-1', name: 'Var 1', values: [{ date: '2023-01-01', value: 100 }], user_id: userId, organization_id: orgId, type: VariableType.INPUT, created_at: 'ts', updated_at: 'ts' };

    it('should successfully update variables and return updated data', async () => {
      // Mock the first variable check (select().eq().single())
      mockSingleResult.mockResolvedValueOnce({ data: mockExistingVariable, error: null });
      // Mock the second variable check
      mockSingleResult.mockResolvedValueOnce({ data: { ...mockExistingVariable, id: 'id-2' }, error: null });
      
      // Mock the update operation results (update().eq().select().single())
      const mockUpdatedVar1 = { ...mockExistingVariable, name: 'Updated Var 1', values: [{ date: '2023-01-01', value: 150 }], updated_at: 'new-ts' };
      const mockUpdatedVar2 = { ...mockExistingVariable, id: 'id-2', type: VariableType.BUDGET, updated_at: 'new-ts2' };
      mockUpdateSingleResult.mockResolvedValueOnce({ data: mockUpdatedVar1, error: null });
      mockUpdateSingleResult.mockResolvedValueOnce({ data: mockUpdatedVar2, error: null });
      
      const result = await service.updateVariables(updateDto);
      
      expect(mockSingleResult).toHaveBeenCalledTimes(2); // Two checks
      expect(mockUpdateSingleResult).toHaveBeenCalledTimes(2); // Two updates
      expect(result.count).toBe(2);
      expect(result.variables).toEqual([ mockUpdatedVar1, mockUpdatedVar2 ]);
    });

    it('should throw error if variable not found', async () => {
      mockSingleResult.mockResolvedValueOnce({ data: null, error: { code: 'PGRST116', message: 'Not found'} });
      
      await expect(service.updateVariables({ 
        variables: [{ id: 'id-not-found', name: 'Updated Var 1' }] 
      })).rejects.toThrow(NotFoundException);
      
      expect(mockSingleResult).toHaveBeenCalledTimes(1);
      expect(mockUpdateSingleResult).not.toHaveBeenCalled();
      expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Variable with ID id-not-found not found'));
    });
  });

  // --- deleteVariables Tests --- 
  describe('deleteVariables', () => {
      let mockSelectEqChain1: jest.Mock, mockSelectEqChain2: jest.Mock;
      let mockDeleteEqChain1: jest.Mock, mockDeleteEqChain2: jest.Mock;

      beforeEach(() => {
          // Setup specific chains for deleteVariables: select().in().eq().eq() and delete().in().eq().eq()
          mockSelectEqChain2 = jest.fn().mockResolvedValue({ data: [], error: null }); 
          mockSelectEqChain1 = jest.fn().mockReturnValue({ eq: mockSelectEqChain2 });
          mockDeleteEqChain2 = jest.fn().mockResolvedValue({ data: null, error: null });
          mockDeleteEqChain1 = jest.fn().mockReturnValue({ eq: mockDeleteEqChain2 });

          mockSupabaseClient.from.mockImplementation((table: string) => {
              if (table === 'variables') {
                  return {
                      select: jest.fn().mockReturnValue({
                          in: jest.fn().mockReturnValue({ eq: mockSelectEqChain1 }) // select().in().eq()
                      }),
                      delete: jest.fn().mockReturnValue({
                          in: jest.fn().mockReturnValue({ eq: mockDeleteEqChain1 }) // delete().in().eq()
                      })
                  };
              }
              return {};
          });
      });

     const requestingUserId = 'req-user-id';
     const orgId = 'org-abc';
     const idsToDelete = ['id-1', 'id-2'];
     const deleteDto: DeleteVariablesDto = { ids: idsToDelete };

      it('should successfully delete variables and return count', async () => {
        const mockExistingVars = [{ id: 'id-1' }, { id: 'id-2' }];
        // Mock select check result (ends with second eq)
        mockSelectEqChain2.mockResolvedValueOnce({ data: mockExistingVars, error: null });
        // Mock delete result (ends with second eq)
        mockDeleteEqChain2.mockResolvedValueOnce({ data: null, error: null });
        
        const result = await service.deleteVariables(deleteDto, requestingUserId, orgId);
        
        // Verify check call chain
        expect(mockSelectEqChain1).toHaveBeenCalledWith('user_id', requestingUserId);
        expect(mockSelectEqChain2).toHaveBeenCalledWith('organization_id', orgId);
        // Verify delete call chain
        expect(mockDeleteEqChain1).toHaveBeenCalledWith('user_id', requestingUserId);
        expect(mockDeleteEqChain2).toHaveBeenCalledWith('organization_id', orgId);
        
        expect(result).toEqual({
          message: 'Variables deleted successfully',
          count: idsToDelete.length
        });
      });
      
      it('should handle partial matches and warn if some variables not found', async () => {
         const mockExistingVars = [{ id: 'id-1' }]; // Only one matches
         mockSelectEqChain2.mockResolvedValueOnce({ data: mockExistingVars, error: null });
         mockDeleteEqChain2.mockResolvedValueOnce({ data: null, error: null });
         
         const result = await service.deleteVariables(deleteDto, requestingUserId, orgId);
         
         expect(mockSelectEqChain2).toHaveBeenCalledTimes(1);
         expect(mockDeleteEqChain2).toHaveBeenCalledTimes(1); // Delete still called for the one found
         expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('Some variables not found: id-2'));
         expect(result.count).toBe(1); // Only one deleted
      });
      
      it('should return count 0 if no variables match criteria', async () => {
         mockSelectEqChain2.mockResolvedValueOnce({ data: [], error: null }); // None found
         
         const result = await service.deleteVariables(deleteDto, requestingUserId, orgId);
         
         expect(mockSelectEqChain2).toHaveBeenCalledTimes(1);
         expect(mockDeleteEqChain2).not.toHaveBeenCalled(); // Delete not called
         expect(Logger.prototype.warn).toHaveBeenCalledWith(expect.stringContaining('None of the specified variables were found'));
         expect(result.count).toBe(0);
      });

      it('should throw error if select check fails', async () => {
         const dbError = { message: 'Select check failed', code: '500' };
         mockSelectEqChain2.mockResolvedValueOnce({ data: null, error: dbError });
         
         await expect(service.deleteVariables(deleteDto, requestingUserId, orgId))
           .rejects.toThrow(/Failed to verify existing variables: Select check failed/);
         expect(mockDeleteEqChain2).not.toHaveBeenCalled();
      });
      
      it('should throw error if delete operation fails', async () => {
         const mockExistingVars = [{ id: 'id-1' }]; 
         const dbError = { message: 'Delete failed', code: '500' };
         mockSelectEqChain2.mockResolvedValueOnce({ data: mockExistingVars, error: null }); // Check succeeds
         mockDeleteEqChain2.mockResolvedValueOnce({ data: null, error: dbError }); // Delete fails
         
         await expect(service.deleteVariables(deleteDto, requestingUserId, orgId))
           .rejects.toThrow(/Failed to delete variables: Delete failed/);
         expect(mockDeleteEqChain2).toHaveBeenCalledTimes(1);
      });
  });
}); 