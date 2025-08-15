import script from '../src/script.mjs';

describe('Okta Assign User to Group Script', () => {
  const mockContext = {
    env: {
      ENVIRONMENT: 'test'
    },
    secrets: {
      OKTA_API_TOKEN: 'test-okta-token-123456'
    },
    outputs: {}
  };

  let originalFetch;
  let originalURL;
  let fetchMock;

  beforeAll(() => {
    // Save original global functions
    originalFetch = global.fetch;
    originalURL = global.URL;
  });

  beforeEach(() => {
    // Create a fresh mock for each test
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      status: 204,
      json: async () => ({})
    });
    
    // Set up global mocks
    global.fetch = fetchMock;
    global.URL = originalURL || class {
      constructor(path, base) {
        this.href = base ? `${base.replace(/\/$/, '')}${path}` : path;
      }
      toString() {
        return this.href;
      }
    };
    
    // Mock console to avoid noise in tests
    global.console.log = jest.fn();
    global.console.error = jest.fn();
  });

  afterAll(() => {
    // Restore original global functions
    global.fetch = originalFetch;
    global.URL = originalURL;
  });

  describe('invoke handler', () => {
    test('should successfully assign user to group', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        oktaDomain: 'test.okta.com'
      };

      const result = await script.invoke(params, mockContext);

      expect(result.userId).toBe('user123');
      expect(result.groupId).toBe('group456');
      expect(result.assigned).toBe(true);
      expect(result.oktaDomain).toBe('test.okta.com');
      expect(result.assignedAt).toBeDefined();
      
      // Verify the API was called correctly
      expect(fetchMock).toHaveBeenCalledTimes(1);
      const [url, options] = fetchMock.mock.calls[0];
      expect(url.toString()).toContain('/api/v1/groups/group456/users/user123');
      expect(options.method).toBe('PUT');
      expect(options.headers.Authorization).toContain('SSWS');
    });

    test('should throw error for missing userId', async () => {
      const params = {
        groupId: 'group456',
        oktaDomain: 'test.okta.com'
      };

      await expect(script.invoke(params, mockContext)).rejects.toThrow('Invalid or missing userId parameter');
    });

    test('should throw error for missing groupId', async () => {
      const params = {
        userId: 'user123',
        oktaDomain: 'test.okta.com'
      };

      await expect(script.invoke(params, mockContext)).rejects.toThrow('Invalid or missing groupId parameter');
    });

    test('should throw error for missing oktaDomain', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456'
      };

      await expect(script.invoke(params, mockContext)).rejects.toThrow('Invalid or missing oktaDomain parameter');
    });

    test('should throw error for missing API token', async () => {
      const params = {
        userId: 'user123',
        groupId: 'group456',
        oktaDomain: 'test.okta.com'
      };
      
      const contextNoToken = {
        ...mockContext,
        secrets: {}
      };

      await expect(script.invoke(params, contextNoToken)).rejects.toThrow('Missing required secret: OKTA_API_TOKEN');
    });

    test('should handle API error response', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          errorCode: 'E0000014',
          errorSummary: 'The user is already a member of this group'
        })
      });

      const params = {
        userId: 'user123',
        groupId: 'group456',
        oktaDomain: 'test.okta.com'
      };

      await expect(script.invoke(params, mockContext)).rejects.toThrow('The user is already a member of this group');
    });

    test('should handle rate limit error specially', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        status: 429,
        json: async () => ({
          errorCode: 'E0000047',
          errorSummary: 'API rate limit exceeded'
        })
      });

      const params = {
        userId: 'user123',
        groupId: 'group456',
        oktaDomain: 'test.okta.com'
      };

      await expect(script.invoke(params, mockContext)).rejects.toThrow('API rate limit exceeded');
    });
  });

  describe('error handler', () => {
    test('should retry on rate limit error', async () => {
      const params = {
        error: new Error('API rate limit exceeded')
      };

      // Mock successful retry
      fetchMock.mockResolvedValueOnce({
        ok: true,
        status: 204
      });

      const result = await script.error(params, {
        ...mockContext,
        params: {
          userId: 'user123',
          groupId: 'group456',
          oktaDomain: 'test.okta.com'
        }
      });

      expect(result.recovered).toBe(true);
    });

    test('should throw for non-retryable errors', async () => {
      const params = {
        error: new Error('Invalid credentials')
      };

      await expect(script.error(params, mockContext)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('halt handler', () => {
    test('should return halted status', async () => {
      const result = await script.halt({}, mockContext);
      expect(result.status).toBe('halted');
      expect(result.message).toBe('Job execution was halted');
    });
  });
});