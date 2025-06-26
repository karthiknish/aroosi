import { apiResponse, ApiError } from '@/lib/utils/apiResponse';

describe('API Response Utilities', () => {
  describe('apiResponse', () => {
    test('creates successful response', () => {
      const data = { id: 1, name: 'Test' };
      const response = apiResponse.success(data);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.error).toBeUndefined();
    });

    test('creates successful response with message', () => {
      const data = { id: 1, name: 'Test' };
      const message = 'Operation completed successfully';
      const response = apiResponse.success(data, message);

      expect(response.success).toBe(true);
      expect(response.data).toEqual(data);
      expect(response.message).toBe(message);
    });

    test('creates error response', () => {
      const errorMessage = 'Something went wrong';
      const response = apiResponse.error(errorMessage);

      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
      expect(response.data).toBeUndefined();
    });

    test('creates error response with status code', () => {
      const errorMessage = 'Not found';
      const statusCode = 404;
      const response = apiResponse.error(errorMessage, statusCode);

      expect(response.success).toBe(false);
      expect(response.error).toBe(errorMessage);
      expect(response.statusCode).toBe(statusCode);
    });

    test('creates validation error response', () => {
      const errors = {
        email: 'Invalid email format',
        password: 'Password too short',
      };
      const response = apiResponse.validationError(errors);

      expect(response.success).toBe(false);
      expect(response.error).toBe('Validation failed');
      expect(response.validationErrors).toEqual(errors);
      expect(response.statusCode).toBe(400);
    });

    test('creates unauthorized response', () => {
      const response = apiResponse.unauthorized();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Unauthorized');
      expect(response.statusCode).toBe(401);
    });

    test('creates forbidden response', () => {
      const response = apiResponse.forbidden();

      expect(response.success).toBe(false);
      expect(response.error).toBe('Forbidden');
      expect(response.statusCode).toBe(403);
    });

    test('creates not found response', () => {
      const response = apiResponse.notFound('Resource not found');

      expect(response.success).toBe(false);
      expect(response.error).toBe('Resource not found');
      expect(response.statusCode).toBe(404);
    });
  });

  describe('ApiError', () => {
    test('creates API error with message', () => {
      const message = 'Test error';
      const error = new ApiError(message);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(500);
      expect(error.name).toBe('ApiError');
    });

    test('creates API error with status code', () => {
      const message = 'Not found';
      const statusCode = 404;
      const error = new ApiError(message, statusCode);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
    });

    test('creates API error with additional data', () => {
      const message = 'Validation failed';
      const statusCode = 400;
      const data = { field: 'email', issue: 'invalid format' };
      const error = new ApiError(message, statusCode, data);

      expect(error.message).toBe(message);
      expect(error.statusCode).toBe(statusCode);
      expect(error.data).toEqual(data);
    });

    test('is instance of Error', () => {
      const error = new ApiError('Test');
      expect(error).toBeInstanceOf(Error);
    });
  });
});