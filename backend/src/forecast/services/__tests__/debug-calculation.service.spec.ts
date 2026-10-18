import { DebugCalculationService } from '../debug-calculation.service';
import { ForecastCalculationService } from '../forecast-calculation.service';
import { DebugCollectorService } from '../debug-collector.service';
import { DebugCalculationStep } from '../../types/debug-types';

describe('DebugCalculationService.getCalculationSteps', () => {
  const step = (nodeId: string): DebugCalculationStep =>
    ({ nodeId, stepNumber: 1 }) as unknown as DebugCalculationStep;

  let service: DebugCalculationService;
  let collector: { getDebugInfo: jest.Mock };

  beforeEach(() => {
    collector = { getDebugInfo: jest.fn().mockReturnValue({ calculationSteps: [step('leaked')] }) };
    service = new DebugCalculationService(
      {} as ForecastCalculationService,
      collector as unknown as DebugCollectorService,
    );
  });

  type StoreSteps = (userId: string, forecastId: string, steps: DebugCalculationStep[]) => void;

  // storeSteps is called at the end of calculateWithDebug
  const storeSteps: StoreSteps = (userId, forecastId, steps) =>
    (service as unknown as { storeSteps: StoreSteps }).storeSteps(userId, forecastId, steps);

  it('returns only the steps of the same user and forecast', async () => {
    storeSteps('user-a', 'forecast-1', [step('a1')]);
    storeSteps('user-b', 'forecast-1', [step('b1')]);

    await expect(service.getCalculationSteps('forecast-1', 'user-a')).resolves.toEqual([step('a1')]);
    await expect(service.getCalculationSteps('forecast-1', 'user-b')).resolves.toEqual([step('b1')]);
  });

  it('never falls back to the shared collector state', async () => {
    await expect(service.getCalculationSteps('forecast-1', 'user-c')).resolves.toEqual([]);
    expect(collector.getDebugInfo).not.toHaveBeenCalled();
  });

  it('evicts the oldest run beyond the limit', async () => {
    for (let i = 0; i <= 50; i++) {
      storeSteps('user-a', `forecast-${i}`, [step(`n${i}`)]);
    }

    await expect(service.getCalculationSteps('forecast-0', 'user-a')).resolves.toEqual([]);
    await expect(service.getCalculationSteps('forecast-50', 'user-a')).resolves.toEqual([step('n50')]);
  });
});
