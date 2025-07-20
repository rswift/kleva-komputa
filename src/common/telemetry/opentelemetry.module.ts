import { DynamicModule, Global, Module, Provider, Logger } from '@nestjs/common';
import { 
  OpenTelemetryModuleOptions, 
  OpenTelemetryModuleAsyncOptions,
  OpenTelemetryOptionsFactory
} from './interfaces/opentelemetry-options.interface';
import { OPENTELEMETRY_MODULE_OPTIONS, DEFAULT_PROMETHEUS_PORT, DEFAULT_PROMETHEUS_ENDPOINT } from './telemetry.constants';
import { OpenTelemetryService } from './opentelemetry.service';
import { MetricsService } from './metrics.service';
import { BusinessMetricsService } from './business-metrics';

/**
 * Module for configuring and initialising OpenTelemetry in a NestJS application
 * 
 * This module provides a dynamic factory for configuring OpenTelemetry with
 * various options, allowing for flexible integration with different environments
 * and configurations. It follows the dynamic module pattern from NestJS to allow
 * for both static and asynchronous configuration.
 * 
 * The module supports three registration methods:
 * 
 * 1. `forRoot`: For static configuration known at compile time
 * 2. `forRootAsync`: For dynamic configuration loaded at runtime
 * 3. `forFeature`: For registering the module without initializing the SDK
 * 
 * @example
 * ```typescript
 * // Static configuration
 * @Module({
 *   imports: [
 *     OpenTelemetryModule.forRoot({
 *       serviceName: 'my-service',
 *       serviceVersion: '1.0.0',
 *       environment: 'production',
 *       exporters: {
 *         console: true,
 *         prometheus: {
 *           enabled: true,
 *           port: 9464,
 *           endpoint: '/metrics',
 *         },
 *       },
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * 
 * // Async configuration
 * @Module({
 *   imports: [
 *     OpenTelemetryModule.forRootAsync({
 *       imports: [ConfigModule],
 *       useFactory: (configService: ConfigService) => ({
 *         serviceName: configService.get('OTEL_SERVICE_NAME'),
 *         serviceVersion: configService.get('OTEL_SERVICE_VERSION'),
 *         environment: configService.get('NODE_ENV'),
 *         exporters: {
 *           console: configService.get('OTEL_EXPORTER_CONSOLE') === 'true',
 *           prometheus: {
 *             enabled: configService.get('OTEL_EXPORTER_PROMETHEUS_ENABLED') === 'true',
 *             port: parseInt(configService.get('OTEL_EXPORTER_PROMETHEUS_PORT') || '9464', 10),
 *             endpoint: configService.get('OTEL_EXPORTER_PROMETHEUS_ENDPOINT') || '/metrics',
 *           },
 *         },
 *       }),
 *       inject: [ConfigService],
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */
@Global()
@Module({
  providers: [OpenTelemetryService, MetricsService, BusinessMetricsService],
  exports: [OpenTelemetryService, MetricsService, BusinessMetricsService],
})
export class OpenTelemetryModule {
  private static readonly logger = new Logger(OpenTelemetryModule.name);

  /**
   * Register the OpenTelemetry module with static options
   * 
   * This method is used when configuration is known at compile time and doesn't
   * need to be loaded dynamically from external sources.
   * 
   * @param options Configuration options for OpenTelemetry
   * @returns A dynamic module configuration
   */
  static forRoot(options: OpenTelemetryModuleOptions): DynamicModule {
    this.validateOptions(options);
    
    return {
      module: OpenTelemetryModule,
      providers: [
        {
          provide: OPENTELEMETRY_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    };
  }

  /**
   * Register the OpenTelemetry module with async options
   * 
   * This method allows for asynchronous configuration of the OpenTelemetry module,
   * which is useful when configuration values need to be loaded from external
   * sources or computed at runtime. It supports several patterns for providing
   * configuration:
   * 
   * 1. Factory function
   * 2. Class that implements OpenTelemetryOptionsFactory
   * 3. Existing provider that implements OpenTelemetryOptionsFactory
   * 
   * @param options Async configuration options for OpenTelemetry
   * @returns A dynamic module configuration
   */
  static forRootAsync(options: OpenTelemetryModuleAsyncOptions): DynamicModule {
    return {
      module: OpenTelemetryModule,
      imports: options.imports || [],
      providers: [
        ...this.createAsyncProviders(options),
      ],
      exports: [OpenTelemetryService],
    };
  }

  /**
   * Create a module that registers OpenTelemetry but doesn't initialize the SDK
   * 
   * This is useful for testing or when you want to manually control the SDK
   * initialization process.
   * 
   * @param options Configuration options for OpenTelemetry
   * @returns A dynamic module configuration
   */
  static forFeature(options: Partial<OpenTelemetryModuleOptions> = {}): DynamicModule {
    return {
      module: OpenTelemetryModule,
      providers: [
        {
          provide: OPENTELEMETRY_MODULE_OPTIONS,
          useValue: { 
            ...options,
            enabled: false, // Disable automatic initialization
          },
        },
      ],
    };
  }

  /**
   * Create providers for async module configuration
   * 
   * This method handles the different ways of providing async configuration:
   * - useFactory: A factory function that returns the configuration
   * - useClass: A class that implements OpenTelemetryOptionsFactory
   * - useExisting: An existing provider that implements OpenTelemetryOptionsFactory
   * 
   * @param options Async configuration options
   * @returns Array of providers
   */
  private static createAsyncProviders(options: OpenTelemetryModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [this.createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        this.createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    throw new Error('Invalid OpenTelemetry module configuration. You must provide either useFactory, useClass, or useExisting.');
  }

  /**
   * Create the async options provider
   * 
   * This method creates a provider that resolves to the module options,
   * either by calling a factory function or by using an options factory class.
   * 
   * @param options Async configuration options
   * @returns Provider for async options
   */
  private static createAsyncOptionsProvider(options: OpenTelemetryModuleAsyncOptions): Provider {
    if (options.useFactory) {
      // Store the factory function in a local variable to ensure TypeScript knows it's defined
      const factory = options.useFactory;
      return {
        provide: OPENTELEMETRY_MODULE_OPTIONS,
        useFactory: async (...args: any[]) => {
          const config = await factory(...args);
          this.validateOptions(config);
          return config;
        },
        inject: options.inject || [],
      };
    }

    const inject = options.useExisting || options.useClass;
    
    if (!inject) {
      throw new Error('Invalid OpenTelemetry module configuration. You must provide either useFactory, useClass, or useExisting.');
    }

    return {
      provide: OPENTELEMETRY_MODULE_OPTIONS,
      useFactory: async (optionsFactory: OpenTelemetryOptionsFactory) => {
        const config = await optionsFactory.createOpenTelemetryOptions();
        this.validateOptions(config);
        return config;
      },
      inject: [inject],
    };
  }

  /**
   * Validate the provided OpenTelemetry options
   * 
   * This method checks that the required options are provided and that
   * the configuration is valid. It throws errors for critical issues
   * and logs warnings for potential non-critical issues.
   * 
   * The validation includes:
   * - Required fields (serviceName)
   * - Format validation (service name, Prometheus endpoint)
   * - Range validation (Prometheus port)
   * - Type validation (resource attributes)
   * - Best practice checks (standard endpoints, attribute length)
   * 
   * @param options OpenTelemetry configuration options
   * @throws Error if critical configuration options are missing or invalid
   */
  private static validateOptions(options: OpenTelemetryModuleOptions): void {
    // Check for required serviceName
    if (!options.serviceName) {
      throw new Error('OpenTelemetry service name is required. Please provide a serviceName in the module options.');
    }

    // Validate service name format
    if (options.serviceName.includes(' ') || /[^a-zA-Z0-9_\-.]/.test(options.serviceName)) {
      this.logger.warn(`Service name "${options.serviceName}" contains spaces or special characters. This may cause issues with some telemetry backends.`);
    }

    // Check for Prometheus configuration if enabled
    if (options.exporters?.prometheus?.enabled) {
      // Validate port
      if (!options.exporters.prometheus.port) {
        this.logger.warn(`Prometheus port is not specified. Using default port ${DEFAULT_PROMETHEUS_PORT}.`);
      } else {
        const port = options.exporters.prometheus.port;
        if (isNaN(port)) {
          throw new Error(`Invalid Prometheus port: ${port}. Must be a number.`);
        }
        
        if (port < 0 || port > 65535) {
          throw new Error(`Invalid Prometheus port: ${port}. Must be between 0 and 65535.`);
        }
        
        // Check for commonly used ports that might cause conflicts
        if ([80, 443, 3000, 8080].includes(port)) {
          this.logger.warn(`Prometheus port ${port} is commonly used for other services and may cause conflicts.`);
        }
        
        // Check for privileged ports
        if (port < 1024) {
          this.logger.warn(`Prometheus port ${port} is a privileged port (below 1024). This may require elevated permissions to bind.`);
        }
      }
      
      // Validate endpoint
      if (!options.exporters.prometheus.endpoint) {
        this.logger.warn(`Prometheus endpoint is not specified. Using default endpoint "${DEFAULT_PROMETHEUS_ENDPOINT}".`);
      } else {
        // Validate endpoint format
        if (!options.exporters.prometheus.endpoint.startsWith('/')) {
          throw new Error(`Invalid Prometheus endpoint: ${options.exporters.prometheus.endpoint}. Must start with a forward slash.`);
        }
        
        // Check for standard endpoint
        if (options.exporters.prometheus.endpoint !== '/metrics') {
          this.logger.warn(`Prometheus endpoint "${options.exporters.prometheus.endpoint}" is not the standard "/metrics". This may cause issues with Prometheus scraping.`);
        }
      }
    }

    // Validate resource attributes if provided
    if (options.resourceAttributes) {
      if (typeof options.resourceAttributes !== 'object') {
        throw new Error('Resource attributes must be an object');
      }
      
      // Check for attribute value length limits
      Object.entries(options.resourceAttributes).forEach(([key, value]) => {
        if (value && value.length > 255) {
          this.logger.warn(`Resource attribute "${key}" has a value longer than 255 characters, which may be truncated by some telemetry backends.`);
        }
      });
    }

    // Log information about the configuration
    if (options.enabled !== false) {
      this.logger.log(`OpenTelemetry module configured for service: ${options.serviceName}`);
      
      if (options.exporters?.console) {
        this.logger.log('Console exporter is enabled');
      }
      
      if (options.exporters?.prometheus?.enabled) {
        this.logger.log(`Prometheus exporter is enabled on port ${options.exporters.prometheus.port || DEFAULT_PROMETHEUS_PORT} at endpoint ${options.exporters.prometheus.endpoint || DEFAULT_PROMETHEUS_ENDPOINT}`);
      }
    } else {
      this.logger.log('OpenTelemetry is disabled by configuration');
    }
  }
}