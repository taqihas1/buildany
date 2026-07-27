// Test setup - mock database and environment
(process.env as any).NODE_ENV = 'test';

// Mock crypto.randomUUID for consistent test IDs
if (!crypto.randomUUID) {
  let counter = 0;
  (globalThis as any).crypto.randomUUID = () => `test-uuid-${++counter}`;
}

// Console suppression for cleaner test output (optional)
// jest.spyOn(console, 'log').mockImplementation(() => {});
// jest.spyOn(console, 'error').mockImplementation(() => {});

console.log('[Test Setup] Jest configured for BuildAny tests');
