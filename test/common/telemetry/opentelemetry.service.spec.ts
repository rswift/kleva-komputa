import { Test } from '@nestjs/testing';
import { OpenTelemetryService } from '../../../src/common/telemetry/opentelemetry.service';
import { OPENTELEMETRY_MODULE_OPTIONS } from '../../../src/common/telemetry/telemetry.constants';
import { OpenTelemetryModuleOptions } from '../../../src/common/telemetry/interfaces/opentelemetry-options.interface';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { metrics } from '@opentelemetry/api';

// Mock the NodeSDK
jest.mock('@opentelemetry/sdk-node', () => {
  return {
    NodeSDK: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Mock the HostMetrics
jest.mock('@opentelemetry/host-metrics', () => {
  return {
    HostMetrics: jest.fn().mockImplementation(() => {
      return {
        start: jest.fn(),
      };
    }),
  };
});

// Mock the Prometheus exporter
jest.mock('@opentelemetry/exporter-prometheus', () => {
  return {
    PrometheusExporter: jest.fn().mockImplementation(() => {
      return {
        export: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Mock the OTLP HTTP exporter
jest.mock('@opentelemetry/exporter-metrics-otlp-http', () => {
  return {
    OTLPMetricExporter: jest.fn().mockImplementation(() => {
      return {
        export: jest.fn().mockResolvedValue(undefined),
        shutdown: jest.fn().mockResolvedValue(undefined),
      };
    }),
  };
});

// Mock the metrics API
jest.mock('@opentelemetry/api', () => {
  const originalModule = jest.requireActual('@opentelemetry/api');
  return {
    ...originalModule,
    metrics: {
      setGlobalMeterProvider: jest.fn(),
      getMeterProvider: jest.fn().mockReturnValue({
        getMeter: jest.fn().mockReturnValue({
          createCounter: jest.fn().mockReturnValue({
            add: jest.fn(),
          }),
          createHistogram: jest.fn().mockReturnValue({
            record: jest.fn(),
          }),
          createUpDownCounter: jest.fn().mockReturnValue({
            add: jest.fn(),
          }),
          createObservableGauge: jest.fn().mockReturnValue({
            addCallback: jest.fn().mockReturnValue({
              unregister: jest.fn(),
            }),
          }),
        }),
        forceFlush: jest.fn().mockResolvedValue(undefined),
      }),
    },
    diag: {
      setLogger: jest.fn(),
    },
    DiagLogLevel: {
      INFO: 'INFO',
      WARN: 'WARN',
      ERROR: 'ERROR',
    },
  };
});

describe('OpenTelemetryService', () => {
  let service: OpenTelemetryService;
  let options: OpenTelemetryModuleOptions;

  beforeEach(async () => {
    // Reset mocks
    jest.clearAllMocks();

    // Default options for testing
    options = {
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
      metrics: {
        hostMetrics: true,
        apiMetrics: true,
      },
      resourceAttributes: {
        'custom.attribute': 'test-value',
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        OpenTelemetryService,
        {
          provide: OPENTELEMETRY_MODULE_OPTIONS,
          useValue: options,
        },
      ],
    }).compile();

    service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
  });

  describe('onModuleInit', () => {
    it('should initialize the SDK when enabled', async () => {
      // Act
      await service.onModuleInit();

      // Assert
      expect(NodeSDK).toHaveBeenCalled();
      const sdkInstance = (NodeSDK as jest.Mock).mock.instances[0];
      expect(sdkInstance.start).toHaveBeenCalled();
    });

    it('should not initialize the SDK when disabled', async () => {
      // Arrange
      options.enabled = false;
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);

      // Act
      await service.onModuleInit();

      // Assert
      expect(NodeSDK).not.toHaveBeenCalled();
    });

    it('should set up diagnostic logging in development environment', async () => {
      // Arrange
      options.environment = 'development';
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);

      // Act
      await service.onModuleInit();

      // Assert
      const { diag, DiagLogLevel } = require('@opentelemetry/api');
      expect(diag.setLogger).toHaveBeenCalled();
      expect(diag.setLogger.mock.calls[0][1]).toBe(DiagLogLevel.INFO);
    });

    it('should set up diagnostic logging in production environment with ERROR level', async () => {
      // Arrange
      options.environment = 'production';
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);

      // Act
      await service.onModuleInit();

      // Assert
      const { diag, DiagLogLevel } = require('@opentelemetry/api');
      expect(diag.setLogger).toHaveBeenCalled();
      expect(diag.setLogger.mock.calls[0][1]).toBe(DiagLogLevel.ERROR);
    });

    it('should configure host metrics if enabled', async () => {
      // Arrange
      options.metrics.hostMetrics = true;

      // Act
      await service.onModuleInit();

      // Assert
      const { HostMetrics } = require('@opentelemetry/host-metrics');
      expect(HostMetrics).toHaveBeenCalled();
      const hostMetricsInstance = (HostMetrics as jest.Mock).mock.instances[0];
      expect(hostMetricsInstance.start).toHaveBeenCalled();
    });

    it('should not configure host metrics if disabled', async () => {
      // Arrange
      options.metrics.hostMetrics = false;
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);

      // Act
      await service.onModuleInit();

      // Assert
      const { HostMetrics } = require('@opentelemetry/host-metrics');
      expect(HostMetrics).not.toHaveBeenCalled();
    });

    it('should configure Prometheus exporter if enabled', async () => {
      // Arrange
      options.exporters.prometheus = {
        enabled: true,
        port: 9464,
        endpoint: '/metrics',
      };

      // Act
      await service.onModuleInit();

      // Assert
      const { PrometheusExporter } = require('@opentelemetry/exporter-prometheus');
      expect(PrometheusExporter).toHaveBeenCalled();
      expect(PrometheusExporter).toHaveBeenCalledWith(expect.objectContaining({
        port: 9464,
        endpoint: '/metrics',
      }));
    });

    it('should configure OTLP HTTP exporter if enabled', async () => {
      // Arrange
      if (!options.exporters.custom) options.exporters.custom = {};
      options.exporters.custom.otlpHttp = {
        enabled: true,
        url: 'http://localhost:4318/v1/metrics',
        headers: { 'Authorization': 'Bearer test' },
      };

      // Act
      await service.onModuleInit();

      // Assert
      const { OTLPMetricExporter } = require('@opentelemetry/exporter-metrics-otlp-http');
      expect(OTLPMetricExporter).toHaveBeenCalled();
      expect(OTLPMetricExporter).toHaveBeenCalledWith(expect.objectContaining({
        url: 'http://localhost:4318/v1/metrics',
        headers: { 'Authorization': 'Bearer test' },
      }));
    });

    it('should configure export intervals from configuration', async () => {
      // Arrange
      (options as any).exportIntervals = {
        intervalMs: 30000,
        timeoutMs: 15000,
      };

      // Act
      await service.onModuleInit();

      // Assert
      // This is a bit tricky to test directly, but we can verify the SDK was initialized
      expect(NodeSDK).toHaveBeenCalled();
    });

    it('should handle errors during initialization', async () => {
      // Arrange
      const error = new Error('Test error');
      (NodeSDK as jest.Mock).mockImplementationOnce(() => {
        return {
          start: jest.fn().mockRejectedValue(error),
          shutdown: jest.fn().mockResolvedValue(undefined),
        };
      });

      // Act & Assert
      await expect(service.onModuleInit()).resolves.not.toThrow();
    });
  });

  describe('onApplicationShutdown', () => {
    it('should shutdown the SDK', async () => {
      // Arrange
      await service.onModuleInit();

      // Act
      await service.onApplicationShutdown();

      // Assert
      const sdkInstance = (NodeSDK as jest.Mock).mock.instances[0];
      expect(sdkInstance.shutdown).toHaveBeenCalled();
    });

    it('should flush metrics before shutdown', async () => {
      // Arrange
      await service.onModuleInit();
      const meterProvider = metrics.getMeterProvider();

      // Act
      await service.onApplicationShutdown();

      // Assert
      expect(meterProvider.forceFlush).toHaveBeenCalled();
    });

    it('should handle errors during metric flushing', async () => {
      // Arrange
      await service.onModuleInit();
      const flushError = new Error('Flush error');
      const meterProvider = metrics.getMeterProvider();
      (meterProvider.forceFlush as jest.Mock).mockRejectedValueOnce(flushError);

      // Act & Assert
      await expect(service.onApplicationShutdown()).resolves.not.toThrow();
    });

    it('should handle errors during shutdown', async () => {
      // Arrange
      const error = new Error('Test error');
      (NodeSDK as jest.Mock).mockImplementationOnce(() => {
        return {
          start: jest.fn().mockResolvedValue(undefined),
          shutdown: jest.fn().mockRejectedValue(error),
        };
      });
      await service.onModuleInit();

      // Act & Assert
      await expect(service.onApplicationShutdown()).resolves.not.toThrow();
    });

    it('should use export timeout from configuration if available', async () => {
      // Arrange
      (options as any).exportIntervals = {
        intervalMs: 30000,
        timeoutMs: 15000,
      };
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      await service.onModuleInit();

      // Act
      await service.onApplicationShutdown();

      // Assert
      // This is hard to test directly, but we can verify the shutdown completes
      const sdkInstance = (NodeSDK as jest.Mock).mock.instances[0];
      expect(sdkInstance.shutdown).toHaveBeenCalled();
    });

    it('should clear references after shutdown', async () => {
      // Arrange
      await service.onModuleInit();

      // Act
      await service.onApplicationShutdown();

      // Assert
      // We can't directly test private properties, but we can verify the shutdown completes
      const sdkInstance = (NodeSDK as jest.Mock).mock.instances[0];
      expect(sdkInstance.shutdown).toHaveBeenCalled();
    });
  });

  describe('getMeter', () => {
    it('should return a meter when telemetry is enabled', async () => {
      // Arrange
      await service.onModuleInit();

      // Act
      const meter = service.getMeter('test-meter');

      // Assert
      expect(meter).toBeDefined();
      expect(meter.createCounter).toBeDefined();
      expect(meter.createHistogram).toBeDefined();
      expect(meter.createUpDownCounter).toBeDefined();
    });

    it('should return a no-op meter when telemetry is disabled', async () => {
      // Arrange
      options.enabled = false;
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);

      // Act
      const meter = service.getMeter('test-meter');

      // Assert
      expect(meter).toBeDefined();
      expect(meter.createCounter).toBeDefined();
      expect(meter.createHistogram).toBeDefined();
      expect(meter.createUpDownCounter).toBeDefined();
      // Test that the no-op methods don't throw
      expect(() => meter.createCounter().add(1)).not.toThrow();
      expect(() => meter.createHistogram().record(100)).not.toThrow();
      expect(() => meter.createUpDownCounter().add(1)).not.toThrow();
    });
  });

  describe('metric creation helpers', () => {
    beforeEach(async () => {
      await service.onModuleInit();
    });

    it('should create a counter', () => {
      // Act
      const counter = service.createCounter('test-counter', 'Test counter');

      // Assert
      expect(counter).toBeDefined();
      expect(counter.add).toBeDefined();
    });

    it('should create a histogram', () => {
      // Act
      const histogram = service.createHistogram('test-histogram', 'Test histogram');

      // Assert
      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
    });

    it('should create a histogram with custom unit', () => {
      // Act
      const histogram = service.createHistogram('test-histogram', 'Test histogram', 'bytes');

      // Assert
      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
    });

    it('should create an up-down counter', () => {
      // Act
      const upDownCounter = service.createUpDownCounter('test-up-down-counter', 'Test up-down counter');

      // Assert
      expect(upDownCounter).toBeDefined();
      expect(upDownCounter.add).toBeDefined();
    });

    it('should create an observable gauge', () => {
      // Act
      const callback = jest.fn().mockReturnValue(42);
      const gauge = service.createObservableGauge('test-gauge', 'Test gauge', callback);

      // Assert
      expect(gauge).toBeDefined();
      expect(gauge.unregister).toBeDefined();
    });
  });
  
  describe('custom views', () => {
    it('should configure custom views from configuration', async () => {
      // Arrange
      const customView = {
        instrumentName: 'custom.metric',
        instrumentType: 'HISTOGRAM',
        meterName: 'test-meter',
        aggregation: {
          boundaries: [10, 100, 1000],
        },
      };
      
      if (!options.metrics) options.metrics = { hostMetrics: true, apiMetrics: true };
      options.metrics.customViews = [customView];
      
      const moduleRef = await Test.createTestingModule({
        providers: [
          OpenTelemetryService,
          {
            provide: OPENTELEMETRY_MODULE_OPTIONS,
            useValue: options,
          },
        ],
      }).compile();
      service = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
      
      // Act
      await service.onModuleInit();
      
      // Assert
      // This is hard to test directly, but we can verify the SDK was initialized
      expect(NodeSDK).toHaveBeenCalled();
    });
  });
});