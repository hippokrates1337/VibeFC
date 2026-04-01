# Utils Directory (`src/lib/utils/`)

This directory contains utility functions and helpers that provide common functionality across the application.

## Files

- `logger.ts` - Development-only logging utility
- `forecast-hierarchy.ts` - Hierarchical sorting and tree traversal utilities for forecast graphs

## Logger Utility (`logger.ts`)

A simple logging utility that conditionally logs messages based on the environment. Only logs in development mode to avoid cluttering production logs.

### Features

- **Environment-aware**: Only logs when `NODE_ENV !== 'production'`
- **Multiple log levels**: Supports `log`, `error`, `warn`, and `info` methods
- **Console API wrapper**: Wraps native console methods with environment checks

### Usage

```typescript
import { logger } from '@/lib/utils/logger';

// These will only log in development
logger.log('Debug information', { data: 'example' });
logger.error('Something went wrong', error);
logger.warn('This is a warning');
logger.info('Informational message');
```

### Methods

- **`log(message: string, ...args: any[])`**: General purpose logging
- **`error(message: string, ...args: any[])`**: Error logging
- **`warn(message: string, ...args: any[])`**: Warning messages
- **`info(message: string, ...args: any[])`**: Informational messages

### Benefits

- **Clean production logs**: Prevents development debug messages from appearing in production
- **Consistent interface**: Provides a unified logging interface across the application
- **Easy to extend**: Can be enhanced with additional features like log levels, formatting, or external logging services

## Forecast Hierarchy Utility (`forecast-hierarchy.ts`)

A comprehensive utility for hierarchical sorting and tree traversal operations on forecast graph structures. Provides advanced graph analysis capabilities for building and manipulating hierarchical node relationships.

### Key Functions

- **`buildHierarchicalStructure()`**: Analyzes forecast edges to build tree structures with parent-child relationships
- **`flattenHierarchy()`**: Converts hierarchical trees to linear arrays based on expansion state  
- **`getNodePath()`**: Gets complete path from root to any node for navigation and breadcrumbs
- **`getNodeDescendants()`**: Finds all descendants of a given node in the hierarchy
- **`validateHierarchy()`**: Validates graph structure with cycle detection and error reporting
- **`defaultNodeComparator()`**: Intelligent sorting by node type priority and display names
- **`getNodeDisplayName()`**: Consistent display naming for different forecast node types

### Features

- **Graph Analysis**: Analyzes directed graph structure from edges to determine relationships
- **Cycle Detection**: Validates structure for cycles and orphaned references with detailed error reporting
- **Configurable Sorting**: Supports custom sort comparators with intelligent defaults
- **Expansion State**: UI expansion state support for hierarchical display components
- **Type Safety**: Full TypeScript support with comprehensive interfaces
- **Performance**: Optimized algorithms with efficient map-based lookups
- **Reusability**: Modular design for use across multiple components

### Usage

```typescript
import { 
  buildHierarchicalStructure, 
  flattenHierarchy, 
  defaultNodeComparator 
} from '@/lib/utils/forecast-hierarchy';

// Build hierarchy from nodes and edges
const hierarchy = buildHierarchicalStructure(nodes, edges, {
  expandedNodes: new Set(['node1', 'node2']),
  sortComparator: defaultNodeComparator
});

// Flatten for display
const flatNodes = flattenHierarchy(hierarchy);

// Validate structure
const validation = validateHierarchy(nodes, edges);
if (!validation.isValid) {
  console.error('Graph issues:', validation.issues);
}
```

## Adding New Utilities

When adding new utilities to this directory:

1. **Single responsibility**: Each utility should have a focused purpose
2. **Environment awareness**: Consider if the utility should behave differently in development vs production
3. **TypeScript**: Use proper type definitions and interfaces
4. **Documentation**: Include JSDoc comments for complex utilities
5. **Testing**: Write unit tests for utility functions
6. **Naming**: Use descriptive names that clearly indicate the utility's purpose

## Guidelines

- Keep utilities pure functions when possible (no side effects)
- Avoid dependencies on React or Next.js specific APIs unless necessary
- Export utilities as named exports for better tree-shaking
- Consider performance implications for frequently used utilities 