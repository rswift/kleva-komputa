/**
 * Injection token for OpenTelemetry module options
 * 
 * This constant is used as a token for dependency injection of the
 * OpenTelemetry module configuration options.
 */
export const OPENTELEMETRY_MODULE_OPTIONS = 'OPENTELEMETRY_MODULE_OPTIONS';

/**
 * Default port for Prometheus metrics endpoint
 * 
 * This is the standard port used by OpenTelemetry for exposing Prometheus metrics.
 * It's different from the default Prometheus port (9090) to avoid conflicts.
 */
export const DEFAULT_PROMETHEUS_PORT = 9464;

/**
 * Default endpoint for Prometheus metrics
 * 
 * This is the standard endpoint path for exposing Prometheus metrics.
 */
export const DEFAULT_PROMETHEUS_ENDPOINT = '/metrics';

/**
 * Default service name prefix
 * 
 * This prefix is used when a service name is not provided to ensure
 * that the service is identifiable in telemetry data.
 */
export const DEFAULT_SERVICE_NAME_PREFIX = 'nestjs-service';

/**
 * Environment variable names for OpenTelemetry configuration
 * 
 * These constants define the standard environment variable names used
 * for configuring OpenTelemetry. They follow the OpenTelemetry specification
 * for environment variable configuration where possible, with additional
 * custom variables for our specific needs.
 */
export const ENV_VARS = {
  // Core configuration
  SERVICE_NAME: 'OTEL_SERVICE_NAME',
  SERVICE_VERSION: 'OTEL_SERVICE_VERSION',
  ENABLED: 'OTEL_ENABLED',
  ENVIRONMENT: 'OTEL_ENVIRONMENT',
  
  // Exporter configuration
  EXPORTER_CONSOLE: 'OTEL_EXPORTER_CONSOLE',
  EXPORTER_PROMETHEUS_ENABLED: 'OTEL_EXPORTER_PROMETHEUS_ENABLED',
  EXPORTER_PROMETHEUS_PORT: 'OTEL_EXPORTER_PROMETHEUS_PORT',
  EXPORTER_PROMETHEUS_ENDPOINT: 'OTEL_EXPORTER_PROMETHEUS_ENDPOINT',
  
  // Metrics configuration
  HOST_METRICS_ENABLED: 'OTEL_HOST_METRICS_ENABLED',
  API_METRICS_ENABLED: 'OTEL_API_METRICS_ENABLED',
  CUSTOM_METRICS_ENABLED: 'OTEL_CUSTOM_METRICS_ENABLED',
  
  // Resource attributes
  RESOURCE_ATTRIBUTES: 'OTEL_RESOURCE_ATTRIBUTES',
  
  // Export intervals
  EXPORT_INTERVAL_MS: 'OTEL_EXPORT_INTERVAL_MS',
  EXPORT_TIMEOUT_MS: 'OTEL_EXPORT_TIMEOUT_MS',
};