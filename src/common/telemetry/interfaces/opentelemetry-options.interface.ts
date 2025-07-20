import { Type } from '@nestjs/common';
import { View } from '@opentelemetry/sdk-metrics';

/**
 * Interface defining the configuration options for the OpenTelemetry module
 * 
 * This interface provides a strongly-typed structure for configuring the
 * OpenTelemetry module, ensuring that all required options are provided
 * and validated.
 * 
 * The configuration follows OpenTelemetry conventions and best practices,
 * allowing for flexible instrumentation of NestJS applications with metrics
 * and telemetry data.
 * 
 * @example
 * ```typescript
 * // Basic configuration
 * const options: OpenTelemetryModuleOptions = {
 *   serviceName: 'my-service',
 *   serviceVersion: '1.0.0',
 *   environment: 'production',
 *   exporters: {
 *     console: true,
 *     prometheus: {
 *       enabled: true,
 *       port: 9464,
 *       endpoint: '/metrics',
 *     },
 *   },
 * };
 * ```
 */
export interface OpenTelemetryModuleOptions {
  /**
   * Name of the service being instrumented
   * This is required as it uniquely identifies the service in telemetry data
   */
  serviceName: string;
  
  /**
   * Version of the service being instrumented
   * This helps track metrics across different versions of the service
   */
  serviceVersion: string;
  
  /**
   * Environment in which the service is running (e.g., development, production)
   * This allows for filtering metrics by environment
   */
  environment?: string;
  
  /**
   * Whether OpenTelemetry is enabled
   * This allows for disabling telemetry in certain environments
   */
  enabled: boolean;
  
  /**
   * Configuration for telemetry exporters
   * This defines how and where telemetry data is sent
   */
  exporters: {
    /**
     * Whether to enable console exporter
     * Console exporter is useful for development and debugging
     */
    console: boolean;
    
    /**
     * Configuration for Prometheus exporter
     * Prometheus is a popular metrics collection and alerting system
     */
    prometheus: {
      /**
       * Whether to enable Prometheus exporter
       */
      enabled: boolean;
      
      /**
       * Port on which to expose Prometheus metrics
       * Default is typically 9464 for OpenTelemetry
       */
      port: number;
      
      /**
       * Endpoint at which to expose Prometheus metrics
       * Default is typically '/metrics'
       */
      endpoint: string;
      
      /**
       * Whether to append timestamps to metrics
       * This can be useful for tracking when metrics were collected
       */
      appendTimestamp?: boolean;
    };
    
    /**
     * Custom exporter configuration
     * This allows for adding custom exporters beyond the built-in ones
     */
    custom?: {
      /**
       * Configuration for OTLP HTTP exporter
       * OTLP is the OpenTelemetry Protocol for sending telemetry data
       */
      otlpHttp?: {
        /**
         * Whether to enable OTLP HTTP exporter
         */
        enabled?: boolean;
        
        /**
         * URL to send OTLP data to
         */
        url?: string;
        
        /**
         * Headers to include in OTLP requests
         */
        headers?: Record<string, string>;
        
        /**
         * Maximum number of concurrent requests
         */
        concurrencyLimit?: number;
        
        /**
         * Timeout for OTLP requests in milliseconds
         */
        timeoutMillis?: number;
      };
      
      /**
       * Additional custom exporters
       */
      [key: string]: any;
    };
  };
  
  /**
   * Configuration for metrics collection
   * This defines what types of metrics are collected
   */
  metrics?: {
    /**
     * Whether to collect host metrics (CPU, memory, etc.)
     */
    hostMetrics?: boolean;
    
    /**
     * Whether to collect API metrics (request counts, latencies, etc.)
     */
    apiMetrics?: boolean;
    
    /**
     * Configuration for custom metrics
     * This allows for defining application-specific metrics
     */
    customMetrics?: {
      /**
       * Whether custom metrics are enabled
       */
      enabled?: boolean;
      
      /**
       * Default attributes to add to all custom metrics
       */
      defaultAttributes?: Record<string, string>;
    };
    
    /**
     * Custom views for metrics aggregation
     * Views allow for customizing how metrics are collected and aggregated
     */
    customViews?: View[];
  };
  
  /**
   * Resource attributes to add to all telemetry data
   * These help categorize and filter telemetry data
   */
  resourceAttributes?: Record<string, string>;
  
  /**
   * Configuration for metric export intervals
   * This controls how frequently metrics are exported
   */
  exportIntervals?: {
    /**
     * How frequently to export metrics in milliseconds
     * Default is 60000 (60 seconds)
     */
    intervalMs: number;
    
    /**
     * Timeout for metric export operations in milliseconds
     * Default is 30000 (30 seconds)
     */
    timeoutMs: number;
  };
}

/**
 * Interface for the async options factory
 * 
 * This interface defines the contract for classes that can create OpenTelemetry
 * module options. It's used with the useClass and useExisting options in
 * OpenTelemetryModuleAsyncOptions.
 * 
 * Classes implementing this interface should handle loading configuration from
 * external sources (e.g., environment variables, configuration files, etc.)
 * and returning a properly structured OpenTelemetryModuleOptions object.
 * 
 * @example
 * ```typescript
 * @Injectable()
 * class OpenTelemetryConfigService implements OpenTelemetryOptionsFactory {
 *   constructor(private configService: ConfigService) {}
 * 
 *   createOpenTelemetryOptions(): OpenTelemetryModuleOptions {
 *     return {
 *       serviceName: this.configService.get('OTEL_SERVICE_NAME'),
 *       serviceVersion: this.configService.get('OTEL_SERVICE_VERSION'),
 *       environment: this.configService.get('NODE_ENV'),
 *       exporters: {
 *         console: this.configService.get('OTEL_EXPORTER_CONSOLE') === 'true',
 *         prometheus: {
 *           enabled: this.configService.get('OTEL_EXPORTER_PROMETHEUS_ENABLED') === 'true',
 *           port: parseInt(this.configService.get('OTEL_EXPORTER_PROMETHEUS_PORT') || '9464', 10),
 *           endpoint: this.configService.get('OTEL_EXPORTER_PROMETHEUS_ENDPOINT') || '/metrics',
 *         },
 *       },
 *     };
 *   }
 * }
 * ```
 */
export interface OpenTelemetryOptionsFactory {
  /**
   * Create OpenTelemetry module options
   * 
   * This method is called by the module to get the configuration options.
   * It can be synchronous or asynchronous.
   * 
   * The implementation should handle loading configuration from external sources
   * and returning a properly structured OpenTelemetryModuleOptions object.
   * 
   * @returns OpenTelemetry module options, either directly or as a Promise
   */
  createOpenTelemetryOptions(): Promise<OpenTelemetryModuleOptions> | OpenTelemetryModuleOptions;
}

/**
 * Interface for async module options
 * 
 * This interface defines the options for asynchronously configuring the
 * OpenTelemetry module. It supports three patterns:
 * 
 * 1. Factory function (useFactory)
 * 2. Class that implements OpenTelemetryOptionsFactory (useClass)
 * 3. Existing provider that implements OpenTelemetryOptionsFactory (useExisting)
 * 
 * @example
 * ```typescript
 * // Using factory function
 * OpenTelemetryModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useFactory: (configService: ConfigService) => ({
 *     serviceName: configService.get('OTEL_SERVICE_NAME'),
 *     serviceVersion: configService.get('OTEL_SERVICE_VERSION'),
 *     environment: configService.get('NODE_ENV'),
 *     exporters: {
 *       console: configService.get('OTEL_EXPORTER_CONSOLE') === 'true',
 *       prometheus: {
 *         enabled: configService.get('OTEL_EXPORTER_PROMETHEUS_ENABLED') === 'true',
 *         port: parseInt(configService.get('OTEL_EXPORTER_PROMETHEUS_PORT') || '9464', 10),
 *         endpoint: configService.get('OTEL_EXPORTER_PROMETHEUS_ENDPOINT') || '/metrics',
 *       },
 *     },
 *   }),
 *   inject: [ConfigService],
 * })
 * 
 * // Using class
 * OpenTelemetryModule.forRootAsync({
 *   imports: [ConfigModule],
 *   useClass: OpenTelemetryConfigService,
 * })
 * 
 * // Using existing provider
 * OpenTelemetryModule.forRootAsync({
 *   useExisting: OpenTelemetryConfigService,
 * })
 * ```
 */
export interface OpenTelemetryModuleAsyncOptions {
  /**
   * Optional list of modules to import
   * 
   * These modules will be imported by the dynamic module, making their
   * exported providers available for injection in the factory function
   * or options factory class.
   */
  imports?: any[];
  
  /**
   * Existing provider that implements OpenTelemetryOptionsFactory
   * 
   * This provider will be injected and its createOpenTelemetryOptions method
   * will be called to get the module options.
   */
  useExisting?: Type<OpenTelemetryOptionsFactory>;
  
  /**
   * Class that implements OpenTelemetryOptionsFactory
   * 
   * An instance of this class will be created and its createOpenTelemetryOptions
   * method will be called to get the module options.
   */
  useClass?: Type<OpenTelemetryOptionsFactory>;
  
  /**
   * Factory function that returns module options
   * 
   * This function will be called with the injected dependencies to get
   * the module options.
   */
  useFactory?: (...args: any[]) => Promise<OpenTelemetryModuleOptions> | OpenTelemetryModuleOptions;
  
  /**
   * Dependencies to inject into the factory function
   * 
   * These providers will be injected into the factory function in the
   * order they are specified.
   */
  inject?: any[];
}