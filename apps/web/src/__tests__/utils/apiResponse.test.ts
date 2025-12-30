import { apiResponse, getErrorMessage } from '@/lib/utils/apiResponse';

describe('API Response Utilities', () => {
  describe('apiResponse', () => {
    test('creates successful response', () => {
      const data = { id: 1, name: 'Test' };
      const response = apiResponse.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
    });

    test('creates error response', () => {
      const errorMessage = 'Something went wrong';
      const response = apiResponse.error('INTERNAL_ERROR', errorMessage);

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe(errorMessage);
      expect(response.error?.code).toBe('INTERNAL_ERROR');
      expect(response.data).toBeUndefined();
    });

    test('creates validation error response', () => {
      const errors = {
        email: 'Invalid email format',
        password: 'Password too short',
      };
      const response = apiResponse.validationError(errors);

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Validation failed');
      expect(response.error?.code).toBe('VALIDATION_ERROR');
      expect(response.error?.details).toEqual(errors);
    });

    test('creates unauthorized response', () => {
      const response = apiResponse.unauthorized();

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Unauthorized');
      expect(response.error?.code).toBe('UNAUTHORIZED');
    });

    test('creates forbidden response', () => {
      const response = apiResponse.forbidden();

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Forbidden');
      expect(response.error?.code).toBe('FORBIDDEN');
    });

    test('creates not found response', () => {
      const response = apiResponse.notFound('Resource not found');

      expect(response.success).toBe(false);
      expect(response.error?.message).toBe('Resource not found');
      expect(response.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('getErrorMessage', () => {
    test('returns string error as-is', () => {
      expect(getErrorMessage('oops')).toBe('oops');
    });

    test('extracts message from ApiError object', () => {
      expect(getErrorMessage({ code: 'X', message: 'Bad', details: { a: 1 } })).toBe('Bad');
    });

    test('returns generic message for undefined', () => {
      expect(getErrorMessage(undefined)).toBe('An unexpected error occurred');
    });
  });
});