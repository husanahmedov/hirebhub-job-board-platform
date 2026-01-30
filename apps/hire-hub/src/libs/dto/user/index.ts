/**
 * User DTOs - Input types and Output types
 *
 * This module exports all User-related Data Transfer Objects (DTOs) used throughout
 * the application for GraphQL operations, validation, and data transformation.
 *
 * All input types are consolidated in input.ts
 * All output types are consolidated in output.ts
 */

// Input DTOs (for mutations and user input)
export * from './input';

// Output DTOs (for queries and responses)
export * from './output';

// Query DTOs (for filtering, pagination, and sorting)
export * from './user.query';
