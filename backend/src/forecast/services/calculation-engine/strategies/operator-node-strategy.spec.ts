import { Test, type TestingModule } from '@nestjs/testing';
import { OperatorNodeStrategy } from './operator-node-strategy';
import { PeriodService } from '../services/period-service';
import { CalculationTreeNode, OperatorNodeAttributes } from '../types/calculation-types';

describe('OperatorNodeStrategy', () => {
  let strategy: OperatorNodeStrategy;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OperatorNodeStrategy, PeriodService]
    }).compile();

    strategy = module.get<OperatorNodeStrategy>(OperatorNodeStrategy);
  });

  it('validateNode rejects offset without offsetMonths', () => {
    const node: CalculationTreeNode = {
      nodeId: 'offset-1',
      nodeType: 'OPERATOR',
      nodeData: { op: 'offset', inputOrder: ['a'] } as OperatorNodeAttributes,
      children: [{ nodeId: 'a', nodeType: 'CONSTANT', nodeData: {}, children: [] }]
    };

    const v = strategy.validateNode(node);
    expect(v.isValid).toBe(false);
    expect(v.errors.some((e) => e.includes('offsetMonths'))).toBe(true);
  });

  it('validateNode accepts offset with offsetMonths and one child', () => {
    const node: CalculationTreeNode = {
      nodeId: 'offset-1',
      nodeType: 'OPERATOR',
      nodeData: {
        op: 'offset',
        inputOrder: ['a'],
        offsetMonths: 2
      } as OperatorNodeAttributes,
      children: [{ nodeId: 'a', nodeType: 'CONSTANT', nodeData: {}, children: [] }]
    };

    const v = strategy.validateNode(node);
    expect(v.errors.filter((e) => e.includes('offset'))).toHaveLength(0);
    expect(v.isValid).toBe(true);
  });
});
