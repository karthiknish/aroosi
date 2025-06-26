// Simple test to verify Jest setup is working
describe('Simple Math Tests', () => {
  test('addition works correctly', () => {
    expect(2 + 2).toBe(4);
  });

  test('subtraction works correctly', () => {
    expect(10 - 5).toBe(5);
  });

  test('arrays contain expected values', () => {
    const fruits = ['apple', 'banana', 'orange'];
    expect(fruits).toContain('banana');
    expect(fruits).toHaveLength(3);
  });

  test('objects have expected properties', () => {
    const user = { name: 'John', age: 30 };
    expect(user).toHaveProperty('name');
    expect(user.name).toBe('John');
  });

  test('async operations work', async () => {
    const promise = Promise.resolve('success');
    await expect(promise).resolves.toBe('success');
  });
});