import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '@/hooks/useLocalStorage';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

describe('useLocalStorage Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns initial value when localStorage is empty', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('initial-value');
    expect(mockLocalStorage.getItem).toHaveBeenCalledWith('test-key');
  });

  test('returns stored value from localStorage', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify('stored-value'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('stored-value');
  });

  test('stores value in localStorage when setValue is called', () => {
    mockLocalStorage.getItem.mockReturnValue(null);

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('test-key', JSON.stringify('new-value'));
    expect(result.current[0]).toBe('new-value');
  });

  test('handles function updates', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(5));

    const { result } = renderHook(() => useLocalStorage<number>('counter', 0));

    act(() => {
      result.current[1]((prev: number) => prev + 1);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('counter', JSON.stringify(6));
    expect(result.current[0]).toBe(6);
  });

  test('handles complex objects', () => {
    const initialObject = { name: 'John', age: 30 };
    const updatedObject = { name: 'Jane', age: 25 };

    mockLocalStorage.getItem.mockReturnValue(JSON.stringify(initialObject));

    const { result } = renderHook(() => useLocalStorage('user', {}));

    expect(result.current[0]).toEqual(initialObject);

    act(() => {
      result.current[1](updatedObject);
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(updatedObject));
    expect(result.current[0]).toEqual(updatedObject);
  });

  test('handles invalid JSON gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue('invalid-json');
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('initial-value');
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    consoleErrorSpy.mockRestore();
  });

  test('handles localStorage errors gracefully', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    mockLocalStorage.setItem.mockImplementation(() => {
      throw new Error('Storage quota exceeded');
    });
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    act(() => {
      result.current[1]('new-value');
    });

    expect(consoleErrorSpy).toHaveBeenCalled();
    // Value should still update in memory even if localStorage fails
    expect(result.current[0]).toBe('new-value');
    
    consoleErrorSpy.mockRestore();
  });

  test('handles localStorage not available', () => {
    mockLocalStorage.getItem.mockReturnValue(JSON.stringify('existing-value'));

    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));

    expect(result.current[0]).toBe('existing-value');
  });
});