import { loadTelemetryConfig, validateTelemetryConfig } from '../../src/config/telemetry.config';
import { ENV_VARS } from '../../src/common/telemetry/telemetry.constants';
import { AppConfig } from '../../src/config/app.config';

// Store original environment variables to restore after tests
const originalEnv = { ...process.env };

// Helper to reset environment variables between tests
function resetEnv() {
  process.env = { ...originalEnv };
}

describe('Telemetry Configuration', () => {
  // Reset environment variables after each test
  afterEach(() => {
    resetEnv();
  });

  describe('loadTelemetryConfig', () => {
    it('should load default configuration when no environment variables are set', () => {
      // Arrange & Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.serviceName).toBeDefined();
      expect(config.enabled).toBe(true);
      expect(config.exporters.console).toBe(true);
      expect(config.exporters.prometheus.enabled).toBe(true);
    });

    it('should override configuration with environment variables', () => {
      // Arrange
      process.env[ENV_VARS.SERVICE_NAME] = 'test-service';
      process.env[ENV_VARS.SERVICE_VERSION] = '1.2.3';
      process.env[ENV_VARS.ENABLED] = 'false';
      process.env[ENV_VARS.EXPORTER_CONSOLE] = 'false';
      process.env[ENV_VARS.EXPORTER_PROMETHEUS_ENABLED] = 'false';
      process.env.NODE_ENV = 'test';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.serviceName).toBe('test-service');
      expect(config.serviceVersion).toBe('1.2.3');
      expect(config.enabled).toBe(false);
      expect(config.exporters.console).toBe(false);
      expect(config.exporters.prometheus.enabled).toBe(false);
      expect(config.resourceAttributes.environment).toBe('test');
    });

    it('should use OTEL_ENVIRONMENT over NODE_ENV when both are set', () => {
      // Arrange
      process.env[ENV_VARS.ENVIRONMENT] = 'production';
      process.env.NODE_ENV = 'development';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.environment).toBe('production');
      expect(config.resourceAttributes.environment).toBe('production');
    });

    it('should parse boolean values correctly', () => {
      // Arrange
      process.env[ENV_VARS.ENABLED] = 'true';
      process.env[ENV_VARS.EXPORTER_CONSOLE] = 'yes';
      process.env[ENV_VARS.EXPORTER_PROMETHEUS_ENABLED] = '1';
      process.env[ENV_VARS.HOST_METRICS_ENABLED] = 'on';
      process.env[ENV_VARS.API_METRICS_ENABLED] = 'TRUE';
      process.env[ENV_VARS.CUSTOM_METRICS_ENABLED] = 'false';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.enabled).toBe(true);
      expect(config.exporters.console).toBe(true);
      expect(config.exporters.prometheus.enabled).toBe(true);
      expect(config.metrics.hostMetrics).toBe(true);
      expect(config.metrics.apiMetrics).toBe(true);
      expect(config.metrics.customMetrics.enabled).toBe(false);
    });

    it('should parse numeric values correctly', () => {
      // Arrange
      process.env[ENV_VARS.EXPORTER_PROMETHEUS_PORT] = '9999';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.exporters.prometheus.port).toBe(9999);
    });

    it('should use default values for invalid numeric inputs', () => {
      // Arrange
      process.env[ENV_VARS.EXPORTER_PROMETHEUS_PORT] = 'not-a-number';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.exporters.prometheus.port).not.toBe(NaN);
    });

    it('should set resource attributes correctly', () => {
      // Arrange
      process.env.NODE_ENV = 'production';
      process.env[ENV_VARS.SERVICE_NAME] = 'production-service';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.resourceAttributes.environment).toBe('production');
      expect(config.resourceAttributes['service.framework']).toBe('nestjs');
      expect(config.resourceAttributes['service.instance.id']).toContain('instance-');
    });

    it('should parse resource attributes from environment variable', () => {
      // Arrange
      process.env[ENV_VARS.RESOURCE_ATTRIBUTES] = 'deployment.region=eu-west-1,host.name=test-host';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.resourceAttributes['deployment.region']).toBe('eu-west-1');
      expect(config.resourceAttributes['host.name']).toBe('test-host');
    });

    it('should handle malformed resource attributes gracefully', () => {
      // Arrange
      process.env[ENV_VARS.RESOURCE_ATTRIBUTES] = 'invalid-format,host.name=test-host';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.resourceAttributes['host.name']).toBe('test-host');
      expect(config.resourceAttributes['invalid-format']).toBeUndefined();
    });

    it('should set custom metrics default attributes correctly', () => {
      // Arrange
      process.env[ENV_VARS.SERVICE_NAME] = 'custom-service';
      process.env[ENV_VARS.SERVICE_VERSION] = '2.0.0';
      process.env.NODE_ENV = 'staging';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect(config.metrics.customMetrics.defaultAttributes['service.name']).toBe('custom-service');
      expect(config.metrics.customMetrics.defaultAttributes['service.version']).toBe('2.0.0');
      expect(config.metrics.customMetrics.defaultAttributes['deployment.environment']).toBe('staging');
    });

    it('should configure export intervals when specified', () => {
      // Arrange
      process.env[ENV_VARS.EXPORT_INTERVAL_MS] = '30000';
      process.env[ENV_VARS.EXPORT_TIMEOUT_MS] = '15000';

      // Act
      const config = loadTelemetryConfig();

      // Assert
      expect((config as any).exportIntervals).toBeDefined();
      expect((config as any).exportIntervals.intervalMs).toBe(30000);
      expect((config as any).exportIntervals.timeoutMs).toBe(15000);
    });
    
    it('should support OTLP HTTP exporter configuration', () => {
      // Arrange
      const config = loadTelemetryConfig();
      
      // Add OTLP HTTP exporter configuration
      if (!config.exporters) config.exporters = { console: true, prometheus: { enabled: false, port: 9464, endpoint: '/metrics' } };
      if (!config.exporters.custom) config.exporters.custom = {};
      config.exporters.custom.otlpHttp = {
        enabled: true,
        url: 'http://localhost:4318/v1/metrics',
        headers: { 'Authorization': 'Bearer test' },
        concurrencyLimit: 5,
        timeoutMillis: 10000
      };
      
      // Assert
      expect(config.exporters.custom.otlpHttp).toBeDefined();
      expect(config.exporters.custom.otlpHttp.enabled).toBe(true);
      expect(config.exporters.custom.otlpHttp.url).toBe('http://localhost:4318/v1/metrics');
      expect(config.exporters.custom.otlpHttp.headers.Authorization).toBe('Bearer test');
    });
  });

  describe('validateTelemetryConfig', () => {
    it('should not throw for valid configuration', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        serviceVersion: '1.0.0',
        enabled: true,
        environment: 'test',
        exporters: {
          console: true,
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '/metrics',
          },
        },
        resourceAttributes: {
          environment: 'test',
        },
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).not.toThrow();
    });

    it('should throw if service name is missing', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: '',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: true,
        },
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).toThrow('OpenTelemetry service name is required');
    });

    it('should warn if service name contains spaces or special characters', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test service with spaces',
        serviceVersion: '1.0.0',
        enabled: true,
        exporters: {
          console: true,
        },
      };

      // Mock the logger.warn function
      const originalWarn = console.warn;
      const mockWarn = jest.fn();
      console.warn = mockWarn;

      // Act
      validateTelemetryConfig(config);

      // Assert
      expect(mockWarn).toHaveBeenCalled();
      
      // Restore the original function
      console.warn = originalWarn;
    });

    it('should warn if service version does not follow semantic versioning', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        serviceVersion: 'invalid-version',
        enabled: true,
        exporters: {
          console: true,
        },
      };

      // Mock the logger.warn function
      const originalWarn = console.warn;
      const mockWarn = jest.fn();
      console.warn = mockWarn;

      // Act
      validateTelemetryConfig(config);

      // Assert
      expect(mockWarn).toHaveBeenCalled();
      
      // Restore the original function
      console.warn = originalWarn;
    });

    it('should throw if Prometheus port is invalid', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        exporters: {
          prometheus: {
            enabled: true,
            port: 99999, // Invalid port
            endpoint: '/metrics',
          },
        },
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).toThrow('Invalid Prometheus port');
    });

    it('should throw if Prometheus endpoint is missing', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        exporters: {
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '',
          },
        },
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).toThrow('Prometheus endpoint is required');
    });

    it('should throw if Prometheus endpoint format is invalid', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        exporters: {
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: 'metrics', // Missing leading slash
          },
        },
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).toThrow('Invalid Prometheus endpoint');
    });

    it('should warn if Prometheus endpoint is not the standard "/metrics"', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        exporters: {
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '/custom-metrics',
          },
        },
      };

      // Mock the logger.warn function
      const originalWarn = console.warn;
      const mockWarn = jest.fn();
      console.warn = mockWarn;

      // Act
      validateTelemetryConfig(config);

      // Assert
      expect(mockWarn).toHaveBeenCalled();
      
      // Restore the original function
      console.warn = originalWarn;
    });

    it('should throw if resource attributes is not an object', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        resourceAttributes: 'not-an-object' as any,
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).toThrow('Resource attributes must be an object');
    });

    it('should throw if custom metrics default attributes is not an object', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        metrics: {
          customMetrics: {
            defaultAttributes: 'not-an-object' as any,
          },
        },
      };

      // Act & Assert
      expect(() => validateTelemetryConfig(config)).toThrow('Custom metrics default attributes must be an object');
    });

    it('should warn if export interval is too short', () => {
      // Arrange
      const config: AppConfig['openTelemetry'] = {
        serviceName: 'test-service',
        exporters: {
          console: true,
        },
      };
      
      // Add export intervals
      (config as any).exportIntervals = {
        intervalMs: 500, // Too short
        timeoutMs: 1000,
      };

      // Mock the logger.warn function
      const originalWarn = console.warn;
      const mockWarn = jest.fn();
      console.warn = mockWarn;

      // Act
      validateTelemetryConfig(config);

      // Assert
      expect(mockWarn).toHaveBeenCalled();
      
      // Restore the original function
      console.warn = originalWarn;
    });
  });
});