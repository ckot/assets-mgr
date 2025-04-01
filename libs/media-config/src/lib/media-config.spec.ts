// config.test.ts
import {
  getDatabaseConfig,
  getFilesConfig,
  validateEnvironment,
} from '../lib/media-config.js';

describe('Config Library', () => {
  // Store original environment
  const originalEnv = { ...process.env };

  // Set up test environment before each test
  beforeEach(() => {
    // Set default test values
    process.env.MEDIA_DB_URL = 'file://test.db';
    process.env.MEDIA_FILES_DIR = '/tmp/test-media';
  });

  // Restore original environment after each test
  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('validateEnvironment', () => {
    test('should return valid when all required vars are set', () => {
      const result = validateEnvironment();
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should return invalid when MEDIA_DB_URL is missing', () => {
      delete process.env.MEDIA_DB_URL;
      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: MEDIA_DB_URL'
      );
    });

    test('should return invalid when MEDIA_FILES_DIR is missing', () => {
      delete process.env.MEDIA_FILES_DIR;
      const result = validateEnvironment();
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(
        'Missing required environment variable: MEDIA_FILES_DIR'
      );
    });
  });

  describe('getDatabaseConfig', () => {
    test('should throw when MEDIA_DB_URL is missing', () => {
      delete process.env.MEDIA_DB_URL;
      expect(() => getDatabaseConfig('development')).toThrow(
        /Database URL is not configured/
      );
    });

    test('should return config when MEDIA_DB_URL is set', () => {
      const config = getDatabaseConfig('development');
      expect(config).toHaveProperty('logging');
      expect(config).toHaveProperty('errorFormat');
    });
  });

  describe('getFilesConfig', () => {
    test('should throw when MEDIA_FILES_DIR is missing', () => {
      delete process.env.MEDIA_FILES_DIR;
      expect(() => getFilesConfig('development')).toThrow(
        /Media files directory is not configured/
      );
    });

    test('should return config when MEDIA_FILES_DIR is set', () => {
      const config = getFilesConfig('development');
      expect(config.directory).toBe('/tmp/test-media');
      expect(config).toHaveProperty('allowedTypes');
      expect(config).toHaveProperty('maxSizeInMB');
    });
  });
});
