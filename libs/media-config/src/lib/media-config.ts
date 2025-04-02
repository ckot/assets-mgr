
export interface DatabaseConfig {
  logging: ('query' | 'info' | 'warn' | 'error')[];
  errorFormat: 'pretty' | 'colorless' | 'minimal';
  // Other Prisma config options
}

export interface FilesConfig {
  directory: string;
  allowedTypes: string[];
  maxSizeInMB: number;
}

export interface AppConfig {
  port: number;
  environment: 'development' | 'production' | 'test';
}

// Helper function to validate environment variables
export function validateEnvironment(): { valid: boolean; errors: string[] } {
  const requiredVars = [
    'MEDIA_DB_URL',
    'MEDIA_FILES_DIR'
  ];

  const optionalVars = [
    'PORT',
    'NODE_ENV'
  ];

  const errors: string[] = [];

  // Check required variables
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }

  // Log which optional variables are using defaults
  const warnings: string[] = [];
  for (const varName of optionalVars) {
    if (!process.env[varName]) {
      warnings.push(`Optional environment variable ${varName} not set, using default value`);
    }
  }

  // Log warnings but don't count them as errors
  if (warnings.length > 0) {
    console.warn('Configuration warnings:');
    warnings.forEach(warning => console.warn(`- ${warning}`));
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

// Helper function to validate environment variables
function validateEnv(name: string, message?: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      message ||
      `Required environment variable ${name} is not set. Please set this variable before starting the application.`
    );
  }
  return value;
}

export const getConfig = () => {
  // Determine environment
  const environment = (process.env.NODE_ENV || 'development') as
    | 'development'
    | 'production'
    | 'test';

  return {
    database: getDatabaseConfig(environment),
    files: getFilesConfig(environment),
    app: getAppConfig(environment),
  };
};

const getDatabaseConfig = (environment: string): DatabaseConfig => {
  // Validate MEDIA_DB_URL is set (but don't include it in the returned config)
  validateEnv(
    'MEDIA_DB_URL',
    'Database URL is not configured. Please set MEDIA_DB_URL environment variable.'
  );

  return {
    logging:
      environment === 'development' ? ['query', 'error', 'warn'] : ['error'],
    errorFormat: environment === 'development' ? 'pretty' : 'minimal',
    // Other Prisma config options as needed
  };
};

const getFilesConfig = (environment: string): FilesConfig => {
  // Validate MEDIA_FILES_DIR is set
  const directory = validateEnv(
    'MEDIA_FILES_DIR',
    'Media files directory is not configured. Please set MEDIA_FILES_DIR environment variable.'
  );

  return {
    directory,
    allowedTypes: ['jpg', 'jpeg', 'png', 'gif', 'mp4', 'mp3', 'pdf'],
    maxSizeInMB: environment === 'production' ? 100 : 500,
  };
};

const getAppConfig = (environment: AppConfig["environment"]): AppConfig => {
  return {
    port: parseInt(process.env.PORT || '3000', 10),
    environment,
  };
};

// Export individual getters for more targeted imports
export { getDatabaseConfig, getFilesConfig, getAppConfig };
