/**
 * Application configuration interface
 * 
 * We're using a simple object for configuration rather than a more complex
 * configuration library to minimise dependencies as per requirement 6.3
 */
export interface AppConfig {
  port: number;
  environment: string;
  openTelemetry: {
    serviceName: string;
    serviceVersion: string;
    enabled: boolean;
    /**
     * Environment in which the service is running (e.g., development, production)
     * This allows for filtering metrics by environment
     */
    environment?: string;
    exporters: {
      console: boolean;
      prometheus: {
        enabled: boolean;
        port: number;
        endpoint: string;
      };
      custom?: Record<string, any>;
    };
    metrics?: {
      hostMetrics?: boolean;
      apiMetrics?: boolean;
      customMetrics?: {
        enabled?: boolean;
        defaultAttributes?: Record<string, string>;
      };
    };
    resourceAttributes?: Record<string, string>;
  };
}

/**
 * Default configuration values
 * 
 * These values can be overridden by environment variables
 */
export const defaultConfig: AppConfig = {
  port: 3000,
  environment: 'development',
  openTelemetry: {
    serviceName: 'nestjs-opentelemetry-poc',
    serviceVersion: '0.1.0',
    enabled: true,
    exporters: {
      console: true,
      prometheus: {
        enabled: true,
        port: 9464,
        endpoint: '/metrics',
      },
    },
    metrics: {
      hostMetrics: true,
      apiMetrics: true,
      customMetrics: {
        enabled: true,
        defaultAttributes: {
          'service.name': 'nestjs-opentelemetry-poc',
          'service.version': '0.1.0',
          'deployment.environment': 'development',
        },
      },
    },
    resourceAttributes: {
      'service.framework': 'nestjs',
      'service.instance.id': `instance-${Math.floor(Math.random() * 10000)}`,
    },
  },
};