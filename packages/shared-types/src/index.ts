// Re-export types from the Prisma client
import type { Variable } from '@prisma/client';

// Export the types
export type { Variable };

// Export any additional shared types or interfaces
export interface IVariableWithMetadata extends Variable {
  metadata: {
    description?: string;
    sourceId?: string;
    category?: string;
  };
} 