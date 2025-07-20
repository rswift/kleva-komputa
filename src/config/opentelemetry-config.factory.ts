import { Injectable, Logger } from '@nestjs/common';
import { OpenTelemetryOptionsFactory, OpenTelemetryModuleOptions } from '../common/telemetry/interfaces/opentelemetry-options.interface';
import { loadTelemetryConfig, validateTelemetryConfig } from './telemetry.config';
import { ENV_VARS, DEFAULT_PROMETHEUS_PORT, DEFAULT_PROMETHEUS_ENDPOINT } from '../common/telemetry/telemetry.constants';

/**
 * Factory for creating OpenTelemetry configuration from environment variables
 * 
 * This class implements the OpenTelemetryOptionsFactory interface to provide
 * environment-based configuration for the OpenTelemetry module. It uses the
 * loadTelemetryConfig function to load configuration from environment variables
 * and validateTelemetryConfig to ensure the configuration is valid.
 * 
 * This approach allows for flexible configuration across different environments
 * without requiring code changes, following the requirements for environment-based
 * configuration (Requirement 3.1).
 */
@Injectable()
export class OpenTelemetryConfigFactory implements OpenTelemetryOptionsFactory {
  private readonly logger = new Logger(OpenTelemetryConfigFactory.name);

  /**
   * Create OpenTelemetry module options from environment variables
   * 
   * This method loads configuration from environment variables using the
   * loadTelemetryConfig function, validates it using validateTelemetryConfig,
   * and returns it as OpenTelemetryModuleOptions.
   * 
   * @returns OpenTelemetry module options
   */
  createOpenTelemetryOptions(): OpenTelemetryModuleOptions {
    try {
      // Load configuration from environment variables
      const config = loadTelemetryConfig();
      
      // Validate the configuration
      validateTelemetryConfig(config);
      
      // Log the environment variables being used
      this.logEnvironmentVariables();
      
      // Create the export intervals configuration if present
      const exportIntervals = (config as any).exportIntervals ? {
        exportIntervals: {
          intervalMs: (config as any).exportIntervals.intervalMs || 60000,
          timeoutMs: (config as any).exportIntervals.timeoutMs || 30000,
        }
      } : undefined;
      
      // Return the configuration as OpenTelemetryModuleOptions
      const options: OpenTelemetryModuleOptions = {
        serviceName: config.serviceName,
        serviceVersion: config.serviceVersion || 'unknown',
        enabled: config.enabled !== false,
        exporters: {
          console: config.exporters?.console || false,
          prometheus: {
            enabled: config.exporters?.prometheus?.enabled || false,
            port: config.exporters?.prometheus?.port || DEFAULT_PROMETHEUS_PORT,
            endpoint: config.exporters?.prometheus?.endpoint || DEFAULT_PROMETHEUS_ENDPOINT,
          },
        },
        resourceAttributes: {},
      };
      
      // Add optional properties if they exist
      if (config.environment) {
        options.environment = config.environment;
      }
      
      if (config.exporters?.custom) {
        options.exporters.custom = config.exporters.custom;
      }
      
      if (config.metrics) {
        options.metrics = {
          hostMetrics: config.metrics.hostMetrics,
          apiMetrics: config.metrics.apiMetrics,
          customMetrics: config.metrics.customMetrics,
        };
      }
      
      if (config.resourceAttributes) {
        options.resourceAttributes = config.resourceAttributes;
      } else {
        options.resourceAttributes = {
          'service.name': config.serviceName,
          'service.version': config.serviceVersion || 'unknown',
          'deployment.environment': config.environment || 'development',
        };
      }
      
      // Add export intervals if present
      if (exportIntervals) {
        options.exportIntervals = exportIntervals.exportIntervals;
      }
      
      return options;
    } catch (error) {
      this.logger.error(`Failed to create OpenTelemetry configuration: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Log the environment variables being used for OpenTelemetry configuration
   * 
   * This helps with debugging configuration issues by showing which environment
   * variables are being used and their values.
   */
  private logEnvironmentVariables(): void {
    // Only log in development environment to avoid cluttering logs in production
    if (process.env.NODE_ENV !== 'development') {
      return;
    }
    
    const envVarValues: Record<string, string | undefined> = {};
    
    // Collect all environment variable values
    Object.values(ENV_VARS).forEach(varName => {
      envVarValues[varName] = process.env[varName];
    });
    
    // Log the values
    this.logger.debug('OpenTelemetry configuration environment variables:', envVarValues);
    
    // Log warnings for any missing critical variables
    if (!process.env[ENV_VARS.SERVICE_NAME]) {
      this.logger.warn(`${ENV_VARS.SERVICE_NAME} environment variable is not set. Using default service name.`);
    }
    
    if (!process.env[ENV_VARS.SERVICE_VERSION]) {
      this.logger.warn(`${ENV_VARS.SERVICE_VERSION} environment variable is not set. Using default service version.`);
    }
    
    if (!process.env[ENV_VARS.ENVIRONMENT] && !process.env.NODE_ENV) {
      this.logger.warn(`Neither ${ENV_VARS.ENVIRONMENT} nor NODE_ENV environment variables are set. Using default environment.`);
    }
  }
}