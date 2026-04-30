import { aggregateUsagePayloads } from './usage-aggregator';

describe('aggregateUsagePayloads', () => {
  it('sums nested numeric values while preserving useful metadata', () => {
    const result = aggregateUsagePayloads([
      {
        limit: { used: 10, remaining: 90, unit: 'requests' },
        plan: 'pro',
        buckets: [{ used: 2 }, { used: 3 }],
      },
      {
        limit: { used: 25, remaining: 75, unit: 'requests' },
        plan: 'pro',
        buckets: [{ used: 4 }, { used: 1 }],
      },
    ]);

    expect(result).toEqual({
      limit: { used: 35, remaining: 165, unit: 'requests' },
      plan: 'pro',
      buckets: [{ used: 6 }, { used: 4 }],
    });
  });
});
