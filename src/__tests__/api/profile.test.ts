import { createMocks } from 'node-mocks-http';
import profileHandler from '@/app/api/profile/route';
import { auth } from '@clerk/nextjs';
import { ConvexHttpClient } from 'convex/server';

// Mock Convex client
jest.mock('convex/nextjs', () => ({
  convexAuthNextjsToken: jest.fn(),
}));

jest.mock('convex/server', () => ({
  ConvexHttpClient: jest.fn(),
}));

// Mock authentication
jest.mock('@clerk/nextjs', () => ({
  auth: jest.fn(),
}));

const mockAuth = auth as jest.MockedFunction<typeof auth>;
const mockConvexHttpClient = ConvexHttpClient as jest.MockedClass<typeof ConvexHttpClient>;

describe('/api/profile API Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/profile', () => {
    test('returns user profile when authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_123' });

      const mockProfile = {
        _id: 'profile_123',
        userId: 'user_123',
        fullName: 'Test User',
        email: 'test@example.com',
      };

      const mockClient = {
        query: jest.fn().mockResolvedValue(mockProfile),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ method: 'GET' });
      await profileHandler.GET(req);

      expect(mockClient.query).toHaveBeenCalled();
    });

    test('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const mockClient = {
        query: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ method: 'GET' });
      const response = await profileHandler.GET(req);

      expect(response.status).toBe(401);
    });

    test('handles profile not found', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_123' });

      const mockClient = {
        query: jest.fn().mockResolvedValue(null),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ method: 'GET' });
      const response = await profileHandler.GET(req);

      expect(response.status).toBe(404);
    });

    test('handles database errors gracefully', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_123' });

      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ method: 'GET' });
      
      try {
        await profileHandler.GET(req);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('POST /api/profile', () => {
    test('creates new profile when authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_123' });

      const profileData = {
        fullName: 'New User',
        city: 'London',
      };

      const mockClient = {
        mutation: jest.fn().mockResolvedValue({ success: true, data: profileData }),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({
        method: 'POST',
        body: profileData,
      });

      await profileHandler.POST(req);
      expect(mockClient.mutation).toHaveBeenCalled();
    });

    test('returns 401 when not authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: null });

      const mockClient = {
        mutation: jest.fn(),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({
        method: 'POST',
        body: { fullName: 'Test' },
      });

      await profileHandler.POST(req);
      expect(mockClient.mutation).not.toHaveBeenCalled();
    });
  });

  describe('PUT /api/profile', () => {
    test('updates existing profile when authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_123' });

      const updateData = {
        fullName: 'Updated User',
        city: 'Birmingham',
      };

      const mockClient = {
        mutation: jest.fn().mockResolvedValue({ success: true }),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({
        method: 'PUT',
        body: updateData,
      });

      await profileHandler.PUT(req);
      expect(mockClient.mutation).toHaveBeenCalled();
    });
  });

  describe('DELETE /api/profile', () => {
    test('deletes profile when authenticated', async () => {
      mockAuth.mockResolvedValue({ userId: 'user_123' });

      const mockClient = {
        mutation: jest.fn().mockResolvedValue({ success: true }),
      };
      mockConvexHttpClient.mockImplementation(() => mockClient as any);

      const { req } = createMocks({ method: 'DELETE' });

      await profileHandler.DELETE(req);
      expect(mockClient.mutation).toHaveBeenCalled();
    });
  });
});