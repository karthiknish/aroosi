import { renderHook, waitFor } from '@testing-library/react';
// Adjusted test after removal of onboarding/profile completion flags
import { useAuth } from '../../hooks/useAuth';

describe('useAuth Hook', () => {
  test('returns loading state initially', () => {
    const { result } = renderHook(() => useAuth());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.user).toBe(null);
    expect(result.current.isLoaded).toBe(false);
    // token removed in cookie-auth; ensure absence
    expect("token" in result.current).toBe(false);
    // profile completion flags removed
  });

  test('transitions to loaded state after timeout', async () => {
    const { result } = renderHook(() => useAuth());

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.isLoaded).toBe(false);

    // Wait for the timeout to complete
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.isSignedIn).toBe(false);
    expect(result.current.user).toBe(null);
    // token removed in cookie-auth; ensure absence
    expect("token" in result.current).toBe(false);
    // profile completion flags removed
  });

  test('maintains consistent state structure', () => {
    const { result } = renderHook(() => useAuth());

    const authState = result.current;

    expect(authState).toHaveProperty("user");
    expect(authState).toHaveProperty("isLoaded");
    expect(authState).toHaveProperty("isSignedIn");
    expect(authState).toHaveProperty("isLoading");
    // token property no longer exists
    expect(authState).not.toHaveProperty("token");
    // profile completion flags removed
  });
});