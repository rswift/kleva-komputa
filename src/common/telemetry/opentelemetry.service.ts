import { Inject, Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common';
import { OPENTELEMETRY_MODULE_OPTIONS, DEFAULT_PROMETHEUS_PORT, DEFAULT_PROMETHEUS_ENDPOINT } from './telemetry.constants';
import { OpenTelemetryModuleOptions } from './interfaces/opentelemetry-options.interface';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { 
  ConsoleMetricExporter, 
  MeterProvider, 
  PeriodicExportingMetricReader,
  View,
  InstrumentType,
  MetricReader,
  Aggregation,
  AggregationTemporality
} from '@opentelemetry/sdk-metrics';
import { metrics, diag, DiagLogLevel, ObservableResult } from '@opentelemetry/api';
import { HostMetrics } from '@opentelemetry/host-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';

/**
 * Service responsible for initialising and managing OpenTelemetry
 * 
 * This service handles the initialisation of the OpenTelemetry SDK,
 * configuration of exporters, and provides methods for creating and
 * managing metrics.
 */
@Injectable()
export class OpenTelemetryService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(OpenTelemetryService.name);
  private isEnabled = false;
  private sdk: NodeSDK | null = null;
  private meterProvider: MeterProvider | null = null;

  constructor(
    @Inject(OPENTELEMETRY_MODULE_OPTIONS)
    private readonly options: OpenTelemetryModuleOptions,
  ) {
    // Store whether telemetry is enabled for quick access
    this.isEnabled = options.enabled !== false;
  }

  /**
   * Initialise OpenTelemetry when the module is initialised
   */
  async onModuleInit() {
    this.logger.log(`Initialising OpenTelemetry with service name: ${this.options.serviceName}`);
    
    if (!this.isEnabled) {
      this.logger.log('OpenTelemetry is disabled by configuration');
      return;
    }

    // Log the environment information
    this.logger.log(`Environment: ${this.options.environment || 'not specified'}`);
    
    // Log exporter configuration
    this.logExporterConfiguration();

    try {
      // Initialize the SDK
      await this.initializeOpenTelemetry();
      this.logger.log('OpenTelemetry SDK initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry SDK', error);
      // Don't throw the error, as we want the application to continue running
      // even if telemetry initialization fails
    }
  }

  /**
   * Initialize the OpenTelemetry SDK with the configured options
   * 
   * This method sets up the OpenTelemetry SDK with the appropriate configuration
   * based on the provided options. It configures diagnostic logging, creates a
   * resource with service information and additional attributes, configures
   * metric readers with exporters, creates a meter provider, and configures
   * host metrics if enabled.
   * 
   * The SDK is then started and ready to collect metrics.
   */
  private async initializeOpenTelemetry(): Promise<void> {
    try {
      // Set up diagnostic logging for OpenTelemetry based on environment
      this.configureDiagnosticLogging();

      // Create resource with service information and additional attributes
      const resource = this.createTelemetryResource();

      // Configure metric readers with exporters
      const metricReaders = this.configureMetricReaders();
      
      // Create meter provider with appropriate configuration
      const meterProvider = this.createMeterProvider(resource, metricReaders);
      
      // Configure host metrics if enabled
      this.configureHostMetrics(meterProvider);

      // Create the SDK with the configured components
      this.sdk = new NodeSDK({
        resource,
        // We'll use the MeterProvider for multiple readers instead of the SDK's metricReader
      } as any);

      // Start the SDK
      await this.sdk.start();
      this.logger.log('OpenTelemetry SDK started successfully');
      
      // Register shutdown handler to ensure proper cleanup
      this.registerShutdownHandler();
    } catch (error) {
      this.logger.error('Failed to initialize OpenTelemetry SDK', error);
      // Don't throw the error, as we want the application to continue running
      // even if telemetry initialization fails
    }
  }
  
  /**
   * Register a shutdown handler to ensure proper cleanup of OpenTelemetry resources
   * 
   * This method registers handlers for common process termination signals to ensure
   * that the OpenTelemetry SDK is properly shut down and metrics are flushed before
   * the application exits.
   */
  private registerShutdownHandler(): void {
    // Only register handlers if we're in a Node.js environment
    if (typeof process !== 'undefined') {
      const signals = ['SIGTERM', 'SIGINT', 'beforeExit'];
      
      signals.forEach(signal => {
        process.on(signal, async () => {
          try {
            this.logger.log(`Received ${signal} signal, shutting down OpenTelemetry SDK`);
            await this.onApplicationShutdown();
          } catch (error) {
            this.logger.error(`Error during OpenTelemetry shutdown on ${signal}`, error);
          } finally {
            // If this is a termination signal, exit the process after cleanup
            if (signal !== 'beforeExit') {
              process.exit(0);
            }
          }
        });
      });
      
      this.logger.debug('Registered OpenTelemetry shutdown handlers for process termination signals');
    }
  }
  
  /**
   * Configure diagnostic logging for OpenTelemetry based on environment
   */
  private configureDiagnosticLogging(): void {
    // Set up diagnostic logging level based on environment
    let logLevel = DiagLogLevel.ERROR; // Default to errors only
    
    if (this.options.environment === 'development') {
      logLevel = DiagLogLevel.INFO;
    } else if (this.options.environment === 'test') {
      logLevel = DiagLogLevel.WARN;
    }
    
    // Create a logger that forwards to NestJS logger
    diag.setLogger({
      verbose: (...args) => this.logger.debug(args),
      debug: (...args) => this.logger.debug(args),
      info: (...args) => this.logger.log(args),
      warn: (...args) => this.logger.warn(args),
      error: (...args) => this.logger.error(args),
    }, logLevel);
    
    this.logger.log(`OpenTelemetry diagnostic logging set to level: ${DiagLogLevel[logLevel]}`);
  }
  
  /**
   * Create the OpenTelemetry resource with appropriate attributes
   * 
   * This method creates a resource with standard semantic attributes that
   * identify the service and its environment. It includes attributes for
   * service name, version, environment, and other metadata that helps
   * categorize and filter telemetry data.
   * 
   * The resource attributes follow the OpenTelemetry semantic conventions
   * for resources, ensuring compatibility with various telemetry backends.
   * 
   * @returns Resource with configured attributes
   */
  private createTelemetryResource(): Resource {
    // Get process and environment information
    const processId = process.pid?.toString();
    const nodeVersion = process.version;
    const osType = process.platform;
    const osRelease = process.release?.name;
    const hostname = process.env.HOSTNAME || require('os').hostname();
    
    // Generate a unique instance ID if not provided
    const instanceId = this.options.resourceAttributes?.['service.instance.id'] || 
                       `instance-${hostname}-${processId}-${Math.floor(Math.random() * 10000)}`;
    
    // Define standard semantic resource attributes
    const resourceAttributes: Record<string, string> = {
      // Required attributes
      [SemanticResourceAttributes.SERVICE_NAME]: this.options.serviceName,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.options.serviceVersion || 'unknown',
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.options.environment || 'development',
      
      // Add standard attributes that help with telemetry data organization
      [SemanticResourceAttributes.SERVICE_NAMESPACE]: 'nestjs-opentelemetry-poc',
      [SemanticResourceAttributes.SERVICE_INSTANCE_ID]: instanceId,
      
      // Add custom service framework attribute
      'service.framework': 'nestjs',
      
      // Add process information
      [SemanticResourceAttributes.PROCESS_PID]: processId || '',
      [SemanticResourceAttributes.PROCESS_RUNTIME_NAME]: 'nodejs',
      [SemanticResourceAttributes.PROCESS_RUNTIME_VERSION]: nodeVersion,
      [SemanticResourceAttributes.PROCESS_RUNTIME_DESCRIPTION]: 'Node.js',
      
      // Add host information
      [SemanticResourceAttributes.HOST_NAME]: hostname,
      [SemanticResourceAttributes.HOST_TYPE]: process.env.HOST_TYPE || osType,
      [SemanticResourceAttributes.OS_TYPE]: osType,
      [SemanticResourceAttributes.OS_VERSION]: osRelease || '',
      
      // Add telemetry SDK information
      'telemetry.sdk.name': 'opentelemetry',
      'telemetry.sdk.language': 'nodejs',
      'telemetry.sdk.version': require('@opentelemetry/sdk-node/package.json').version,
    };
    
    // Add any additional resource attributes from configuration
    if (this.options.resourceAttributes) {
      Object.entries(this.options.resourceAttributes).forEach(([key, value]) => {
        resourceAttributes[key] = value;
      });
    }

    this.logger.debug('Configuring OpenTelemetry with resource attributes:', resourceAttributes);
    
    // Create a resource by merging with the default resource
    // This ensures we get standard attributes like OS version, etc.
    return Resource.default().merge(new Resource(resourceAttributes));
  }
  
  /**
   * Create and configure the meter provider
   * 
   * This method creates and configures a meter provider with the appropriate resource
   * attributes and views. The meter provider is responsible for creating meters,
   * which in turn create instruments like counters, histograms, and gauges.
   * 
   * The meter provider is also responsible for collecting metrics and sending them
   * to the configured exporters via metric readers.
   * 
   * @param resource The resource to associate with the meter provider
   * @param metricReaders The metric readers to register with the meter provider
   * @returns Configured meter provider
   */
  private createMeterProvider(resource: Resource, metricReaders: MetricReader[]): MeterProvider {
    this.logger.log('Creating and configuring meter provider');
    
    try {
      // Configure views for customizing metrics collection
      const views = this.configureViews();
      
      // Create meter provider with resource and views
      const meterProvider = new MeterProvider({
        resource,
        views,
        // Add interval configuration if available
        ...(this.options.exportIntervals && {
          metricReaderOptions: {
            exportIntervalMillis: this.options.exportIntervals.intervalMs,
            exportTimeoutMillis: this.options.exportIntervals.timeoutMs,
          }
        }),
      });

      // Register metric readers with the meter provider
      if (metricReaders.length > 0) {
        this.logger.log(`Registering ${metricReaders.length} metric readers with meter provider`);
        
        for (const reader of metricReaders) {
          meterProvider.addMetricReader(reader);
        }
      } else {
        this.logger.warn('No metric readers to register with meter provider');
      }

      // Set the global meter provider
      metrics.setGlobalMeterProvider(meterProvider);
      this.meterProvider = meterProvider;
      
      this.logger.log('Meter provider configured successfully');
      return meterProvider;
    } catch (error) {
      this.logger.error('Failed to create meter provider', error);
      
      // Create a minimal meter provider as fallback
      const fallbackMeterProvider = new MeterProvider({
        resource,
      });
      
      this.logger.warn('Using fallback meter provider with minimal configuration');
      metrics.setGlobalMeterProvider(fallbackMeterProvider);
      this.meterProvider = fallbackMeterProvider;
      
      return fallbackMeterProvider;
    }
  }
  
  /**
   * Configure host metrics collection if enabled
   * 
   * @param meterProvider The meter provider to use for host metrics
   */
  private configureHostMetrics(meterProvider: MeterProvider): void {
    if (!this.options.metrics?.hostMetrics) {
      return;
    }
    
    try {
      this.logger.log('Initializing host metrics collection');
      const hostMetrics = new HostMetrics({
        meterProvider,
        name: `${this.options.serviceName}.host`,
      });
      hostMetrics.start();
      this.logger.log('Host metrics collection initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize host metrics collection', error);
    }
  }

  /**
   * Configure metric exporters based on the provided configuration
   * 
   * This method creates and configures metric exporters based on the module options.
   * It supports multiple exporter types including Console, Prometheus, and OTLP HTTP.
   * 
   * If no exporters are configured, it falls back to using the Console exporter
   * to ensure that metrics are still available for debugging.
   * 
   * @returns Array of configured metric exporters
   */
  private configureMetricExporters(): any[] {
    const exporters = [];
    let exporterCount = 0;

    // Configure console exporter if enabled
    if (this.options.exporters?.console) {
      this.logger.log('Configuring console metric exporter');
      try {
        // Configure console exporter
        exporters.push(new ConsoleMetricExporter());
        this.logger.log('Console exporter configured successfully');
        exporterCount++;
      } catch (error) {
        this.logger.error('Failed to configure console metric exporter', error);
      }
    }

    // Configure Prometheus exporter if enabled
    if (this.options.exporters?.prometheus?.enabled) {
      const { endpoint, port } = this.options.exporters.prometheus;
      const prometheusPort = port || DEFAULT_PROMETHEUS_PORT;
      const prometheusEndpoint = endpoint || DEFAULT_PROMETHEUS_ENDPOINT;
      
      this.logger.log(`Configuring Prometheus exporter on port ${prometheusPort} at endpoint ${prometheusEndpoint}`);
      
      try {
        // Check if the port is already in use
        const testPort = (port: number): Promise<boolean> => {
          return new Promise((resolve) => {
            const net = require('net');
            const tester = net.createServer()
              .once('error', () => {
                // Port is in use
                resolve(false);
              })
              .once('listening', () => {
                // Port is available
                tester.close(() => resolve(true));
              })
              .listen(port);
          });
        };
        
        // Try to test the port availability
        testPort(prometheusPort)
          .then(available => {
            if (!available) {
              this.logger.warn(`Prometheus port ${prometheusPort} may already be in use. Metrics endpoint might not be accessible.`);
            }
          })
          .catch(() => {
            // Ignore errors from port testing
          });
        
        // Configure the Prometheus exporter
        const prometheusExporter = new PrometheusExporter({
          endpoint: prometheusEndpoint,
          port: prometheusPort,
          preventServerStart: false, // Start the server automatically
          appendTimestamp: true, // Add timestamps to metrics
        });
        
        exporters.push(prometheusExporter);
        this.logger.log(`Prometheus exporter configured successfully on http://localhost:${prometheusPort}${prometheusEndpoint}`);
        exporterCount++;
      } catch (error) {
        this.logger.error('Failed to configure Prometheus exporter', error);
      }
    }

    // Configure OTLP HTTP exporter if configured in custom exporters
    if (this.options.exporters?.custom?.otlpHttp?.enabled) {
      const otlpConfig = this.options.exporters.custom.otlpHttp;
      const otlpUrl = otlpConfig.url || 'http://localhost:4318/v1/metrics';
      
      this.logger.log(`Configuring OTLP HTTP exporter with endpoint: ${otlpUrl}`);
      
      try {
        // Configure the OTLP HTTP exporter with sensible defaults
        const otlpExporter = new OTLPMetricExporter({
          url: otlpUrl,
          headers: otlpConfig.headers || {},
          concurrencyLimit: otlpConfig.concurrencyLimit || 10,
          timeoutMillis: otlpConfig.timeoutMillis || 30000,
        });
        
        exporters.push(otlpExporter);
        this.logger.log('OTLP HTTP exporter configured successfully');
        exporterCount++;
      } catch (error) {
        this.logger.error('Failed to configure OTLP HTTP exporter', error);
      }
    }

    // If no exporters were successfully configured, use console exporter as fallback
    if (exporterCount === 0) {
      this.logger.warn('No exporters were successfully configured, using console exporter as fallback');
      exporters.push(new ConsoleMetricExporter());
    }

    return exporters;
  }
  
  /**
   * Configure metric readers with exporters
   * 
   * Metric readers are responsible for collecting metrics from the SDK
   * and exporting them via the configured exporters. This method creates
   * a PeriodicExportingMetricReader for each configured exporter, with
   * appropriate export intervals and timeouts.
   * 
   * The export intervals control how frequently metrics are collected and
   * sent to the exporters, and the timeout controls how long to wait for
   * the export operation to complete before giving up.
   * 
   * @returns Array of configured metric readers
   */
  private configureMetricReaders(): PeriodicExportingMetricReader[] {
    const exporters = this.configureMetricExporters();
    const readers: PeriodicExportingMetricReader[] = [];
    
    // Get export intervals from configuration if available
    // These control how frequently metrics are exported and the timeout for exports
    const exportIntervalMillis = this.options.exportIntervals?.intervalMs || 60000; // Default: 60 seconds
    const exportTimeoutMillis = this.options.exportIntervals?.timeoutMs || 30000; // Default: 30 seconds
    
    this.logger.log(`Configuring metric readers with export interval: ${exportIntervalMillis}ms, timeout: ${exportTimeoutMillis}ms`);
    
    // Create a reader for each exporter
    for (const exporter of exporters) {
      try {
        const reader = new PeriodicExportingMetricReader({
          exporter,
          exportIntervalMillis,
          exportTimeoutMillis,
        });
        
        readers.push(reader);
        
        // Log the exporter type for debugging
        const exporterType = exporter.constructor.name;
        this.logger.debug(`Configured metric reader with ${exporterType} exporter`);
      } catch (error) {
        this.logger.error('Failed to create metric reader for exporter', error);
      }
    }
    
    // Log warning if no readers were created
    if (readers.length === 0) {
      this.logger.warn('No metric readers were created. Metrics will not be exported.');
    } else {
      this.logger.log(`Created ${readers.length} metric readers`);
    }
    
    return readers;
  }
  
  /**
   * Configure views for customizing metrics collection
   * 
   * Views allow for customizing how metrics are collected and aggregated.
   * This includes defining custom bucket boundaries for histograms,
   * filtering which attributes are included, etc.
   * 
   * This method configures standard views for common metrics like HTTP request
   * duration and database operation duration, as well as any custom views
   * provided in the configuration.
   * 
   * @returns Array of configured views
   */
  private configureViews(): View[] {
    this.logger.log('Configuring metric views');
    const views: View[] = [];
    
    // Add a view for API request duration with custom histogram buckets
    // This provides better granularity for API timing metrics
    views.push({
      name: 'http.server.duration',
      description: 'HTTP server request duration',
      aggregation: {
        kind: AggregationTemporality.CUMULATIVE,
        boundaries: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
      },
    } as unknown as View);
    
    // Add a view for database operation duration with custom histogram buckets
    views.push({
      name: 'db.operation.duration',
      description: 'Database operation duration',
      aggregation: {
        kind: AggregationTemporality.CUMULATIVE,
        boundaries: [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500],
      },
    } as unknown as View);
    
    // Add a view for API request count with method and path attributes
    views.push({
      name: 'http.server.request.count',
      description: 'HTTP server request count',
      aggregation: Aggregation.Sum(),
    } as View);
    
    // Add a view for API error count with method, path, and error type attributes
    views.push({
      name: 'http.server.error.count',
      description: 'HTTP server error count',
      aggregation: Aggregation.Sum(),
    } as View);
    
    // Add a view for active connections with custom aggregation
    views.push({
      name: 'http.server.active_requests',
      description: 'HTTP server active requests',
      aggregation: Aggregation.LastValue(),
    } as View);
    
    // Add custom views from configuration if provided
    if (this.options.metrics?.customViews) {
      this.logger.log(`Adding ${this.options.metrics.customViews.length} custom views from configuration`);
      
      for (const customView of this.options.metrics.customViews) {
        try {
          views.push(customView);
          this.logger.debug(`Added custom view for instrument ${customView.name || 'unknown'}`);
        } catch (error) {
          this.logger.warn(`Failed to add custom view for instrument ${customView.name || 'unknown'}`, error);
        }
      }
    }
    
    this.logger.log(`Configured ${views.length} metric views`);
    return views;
  }

  /**
   * Log the configuration of exporters for debugging purposes
   */
  private logExporterConfiguration(): void {
    const exporters = this.options.exporters || {};
    
    if (exporters.console) {
      this.logger.log('Console exporter is enabled');
    }
    
    if (exporters.prometheus?.enabled) {
      this.logger.log(`Prometheus exporter is enabled on port ${exporters.prometheus.port} at endpoint ${exporters.prometheus.endpoint}`);
    }
  }

  /**
   * Check if OpenTelemetry is enabled
   * 
   * @returns True if OpenTelemetry is enabled, false otherwise
   */
  isOpenTelemetryEnabled(): boolean {
    return this.isEnabled;
  }

  /**
   * Get the current OpenTelemetry configuration
   * 
   * @returns The current OpenTelemetry configuration
   */
  getConfiguration(): OpenTelemetryModuleOptions {
    return { ...this.options };
  }

  /**
   * Create a meter with the given name
   * 
   * @param name Name of the meter
   * @param version Optional version of the meter
   * @returns Meter instance
   */
  getMeter(name: string, version?: string): any {
    if (!this.isEnabled || !this.meterProvider) {
      // Return a no-op meter if OpenTelemetry is disabled
      return {
        createCounter: () => ({
          add: () => {},
        }),
        createHistogram: () => ({
          record: () => {},
        }),
        createUpDownCounter: () => ({
          add: () => {},
        }),
        createObservableGauge: () => ({
          addCallback: () => ({ unregister: () => {} }),
        }),
      };
    }

    return this.meterProvider.getMeter(name, version);
  }
  
  /**
   * Create a counter metric
   * 
   * Counters are used to measure a non-negative, monotonically increasing value.
   * 
   * @param name Name of the counter
   * @param description Description of what the counter measures
   * @param meterName Optional name for the meter (defaults to service name)
   * @returns Counter instance
   */
  createCounter(name: string, description: string, meterName?: string): any {
    const meter = this.getMeter(meterName || this.options.serviceName);
    return meter.createCounter(name, {
      description,
      unit: '1', // Default unit for a count
    });
  }
  
  /**
   * Create a histogram metric
   * 
   * Histograms are used to measure a distribution of values.
   * 
   * @param name Name of the histogram
   * @param description Description of what the histogram measures
   * @param unit Optional unit of measurement (e.g., 'ms' for milliseconds)
   * @param meterName Optional name for the meter (defaults to service name)
   * @returns Histogram instance
   */
  createHistogram(name: string, description: string, unit = 'ms', meterName?: string): any {
    const meter = this.getMeter(meterName || this.options.serviceName);
    return meter.createHistogram(name, {
      description,
      unit,
    });
  }
  
  /**
   * Create an up-down counter metric
   * 
   * Up-down counters are used to measure a non-monotonic value that can increase or decrease.
   * 
   * @param name Name of the up-down counter
   * @param description Description of what the up-down counter measures
   * @param meterName Optional name for the meter (defaults to service name)
   * @returns Up-down counter instance
   */
  createUpDownCounter(name: string, description: string, meterName?: string): any {
    const meter = this.getMeter(meterName || this.options.serviceName);
    return meter.createUpDownCounter(name, {
      description,
      unit: '1', // Default unit for a count
    });
  }
  
  /**
   * Create an observable gauge metric
   * 
   * Observable gauges are used to measure a value that can increase or decrease
   * and is observed rather than updated directly.
   * 
   * @param name Name of the gauge
   * @param description Description of what the gauge measures
   * @param callback Function that returns the current value
   * @param unit Optional unit of measurement
   * @param meterName Optional name for the meter (defaults to service name)
   * @returns Observable gauge registration that can be used to unregister the callback
   */
  createObservableGauge(
    name: string, 
    description: string, 
    callback: () => number,
    unit = '1',
    meterName?: string
  ): { unregister: () => void } {
    if (!this.isEnabled || !this.meterProvider) {
      return { unregister: () => {} };
    }
    
    const meter = this.getMeter(meterName || this.options.serviceName);
    const gauge = meter.createObservableGauge(name, {
      description,
      unit,
    });
    
    return gauge.addCallback((observableResult: ObservableResult) => {
      observableResult.observe(callback());
    });
  }

  /**
   * Shutdown the OpenTelemetry SDK when the application shuts down
   * 
   * This ensures that any pending metrics are flushed and resources are cleaned up
   */
  async onApplicationShutdown(): Promise<void> {
    if (!this.sdk) {
      return;
    }
    
    this.logger.log('Shutting down OpenTelemetry SDK');
    
    try {
      // Get shutdown timeout from configuration or use default
      const shutdownTimeout = (this.options as any).exportIntervals?.timeoutMs || 5000;
      
      // First, try to flush any pending metrics
      if (this.meterProvider && typeof this.meterProvider.forceFlush === 'function') {
        this.logger.debug('Flushing pending metrics');
        try {
          // Create a timeout promise for the flush operation
          const flushTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error(`Metric flushing timed out after ${shutdownTimeout / 2}ms`));
            }, shutdownTimeout / 2); // Use half the shutdown timeout for flushing
          });
          
          // Race the flush against the timeout
          await Promise.race([this.meterProvider.forceFlush(), flushTimeoutPromise]);
          this.logger.debug('Metrics flushed successfully');
        } catch (flushError) {
          // Log but continue with shutdown even if flush fails
          this.logger.warn('Error flushing metrics during shutdown', flushError);
        }
      }
      
      // Now shutdown the SDK with a timeout to ensure it completes
      this.logger.debug(`Shutting down SDK with timeout of ${shutdownTimeout}ms`);
      const shutdownPromise = this.sdk.shutdown();
      
      // Create a timeout promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`OpenTelemetry SDK shutdown timed out after ${shutdownTimeout}ms`));
        }, shutdownTimeout);
      });
      
      // Race the shutdown against the timeout
      await Promise.race([shutdownPromise, timeoutPromise]);
      this.logger.log('OpenTelemetry SDK shut down successfully');
    } catch (error) {
      this.logger.error('Error shutting down OpenTelemetry SDK', error);
    } finally {
      // Clear references to help with garbage collection
      this.sdk = null;
      this.meterProvider = null;
    }
  }
}