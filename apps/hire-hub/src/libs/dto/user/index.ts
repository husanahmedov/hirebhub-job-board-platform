/**
 * User DTOs - Input types, Output types, and Query types
 *
 * This module exports all User-related Data Transfer Objects (DTOs) used throughout
 * the application for GraphQL operations, validation, and data transformation.
 */

// Input DTOs (for mutations and user input)
export * from './user.update';
export * from './[step-1].register.input';
export * from './[step-2].register.input';
export * from './[step-3].register.input';
export * from './[step-4].register.input';
export * from './[step-5].register.input';
export * from './refresh-token.input';
export * from './global.register.input';

// Output DTOs (for queries and responses)
export * from './user.output';

// Query DTOs (for filtering, pagination, and sorting)
export * from './user.query';
