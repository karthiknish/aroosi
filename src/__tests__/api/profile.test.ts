import { createMocks } from 'node-mocks-http';
import { GET, POST, PUT, DELETE } from '@/app/api/profile/route';
import { ConvexHttpClient } from 'convex/browser';

// Mock Convex client
jest.mock('convex/browser', () => ({
  ConvexHttpClient: jest.fn(),
}));

// Mock auth utilities
jest.mock('@/app/api/_utils/auth', () => ({
  requireUserToken: jest.fn(),
}));

const mockConvexHttpClient = ConvexHttpClient as jest.MockedClass<typeof ConvexHttpClient>;
const { requireUserToken } = require('@/app/api/_utils/auth');

describe('/api/profile API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    test('returns user profile when authenticated', async () => {
      requireUserToken.mockReturnValue({ token: 'valid-token', userId: 'user_123' });

      const mockProfile = {
        _id: 'profile_123',
        userId: 'user_123',
        fullName: 'Test User',
        email: 'test@example.com',
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue(mockProfile),
        setAuth: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ 
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' }
      });
      const response = await GET(req);

      expect(mockClient.query).toHaveBeenCalled();
    });

    test('returns 401 when not authenticated', async () => {
      requireUserToken.mockReturnValue({ errorResponse: new Response('Unauthorized', { status: 401 }) });

      const { req } = createMocks({ method: 'GET' });
      const response = await GET(req);

      expect(response.status).toBe(401);
    });

    test('handles profile not found', async () => {
      requireUserToken.mockReturnValue({ token: 'valid-token', userId: 'user_123' });

      const mockClient = {
        query: jest.fn().mockResolvedValue(null),
        setAuth: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ 
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' }
      });
      const response = await GET(req);

      expect(response.status).toBe(404);
    });

    test('handles database errors gracefully', async () => {
      requireUserToken.mockReturnValue({ token: 'valid-token', userId: 'user_123' });

      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        setAuth: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ 
        method: 'GET',
        headers: { authorization: 'Bearer valid-token' }
      });
      
      const response = await GET(req);
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/profile', () => {
    test('creates new profile when authenticated', async () => {
      requireUserToken.mockReturnValue({ token: 'valid-token', userId: 'user_123' });

      const profileData = {
        fullName: 'New User',
        city: 'London',
        dateOfBirth: '1990-01-01',
        gender: 'male',
        aboutMe: 'Test about me',
        occupation: 'Engineer',
        education: 'University',
        height: '5ft 10in',
        maritalStatus: 'single',
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue(null), // No existing profile
        mutation: jest.fn().mockResolvedValue({ success: true }),
        setAuth: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({
        method: 'POST',
        body: profileData,
        headers: { 
          'content-type': 'application/json',
          authorization: 'Bearer valid-token'
        },
      });

      const response = await POST(req);
      expect(response.status).toBe(200);
    });

    test('returns 401 when not authenticated', async () => {
      requireUserToken.mockReturnValue({ errorResponse: new Response('Unauthorized', { status: 401 }) });

      const { req } = createMocks({
        method: 'POST',
        body: { fullName: 'Test' },
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(req);
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/profile', () => {
    test('updates existing profile when authenticated', async () => {
      requireUserToken.mockReturnValue({ token: 'valid-token', userId: 'user_123' });

      const updateData = {
        fullName: 'Updated User',
        city: 'Birmingham',
      };

      const mockProfile = {
        _id: 'profile_123',
        userId: 'user_123',
        fullName: 'Old Name',
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue(mockProfile),
        mutation: jest.fn().mockResolvedValue({ success: true }),
        setAuth: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({
        method: 'PUT',
        body: updateData,
        headers: { 
          'content-type': 'application/json',
          authorization: 'Bearer valid-token'
        },
      });

      const response = await PUT(req);
      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/profile', () => {
    test('deletes profile when authenticated', async () => {
      requireUserToken.mockReturnValue({ token: 'valid-token', userId: 'user_123' });

      const mockProfile = {
        _id: 'profile_123',
        userId: 'user_123',
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue(mockProfile),
        mutation: jest.fn().mockResolvedValue({ success: true }),
        setAuth: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ 
        method: 'DELETE',
        headers: { authorization: 'Bearer valid-token' }
      });

      const response = await DELETE(req);
      expect(response.status).toBe(200);
    });
  });
});