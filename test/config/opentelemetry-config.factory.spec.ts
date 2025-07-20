import { Test } from "@nestjs/testing";
import { OpenTelemetryConfigFactory } from "../../src/config/opentelemetry-config.factory";
import { ENV_VARS } from "../../src/common/telemetry/telemetry.constants";
import * as telemetryConfig from "../../src/config/telemetry.config";
import { Logger } from "@nestjs/common";

// Store original environment variables to restore after tests
const originalEnv = { ...process.env };

// Helper to reset environment variables between tests
function resetEnv() {
  process.env = { ...originalEnv };
}

describe("OpenTelemetryConfigFactory", () => {
  let factory: OpenTelemetryConfigFactory;
  let loggerErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Create a fresh instance of the factory for each test
    const moduleRef = await Test.createTestingModule({
      providers: [OpenTelemetryConfigFactory],
    }).compile();

    factory = moduleRef.get<OpenTelemetryConfigFactory>(
      OpenTelemetryConfigFactory
    );

    // Spy on the logger.error method
    loggerErrorSpy = jest
      .spyOn(Logger.prototype, "error")
      .mockImplementation(() => {});
  });

  // Reset environment variables after each test
  afterEach(() => {
    resetEnv();
    jest.restoreAllMocks();
  });

  it("should be defined", () => {
    expect(factory).toBeDefined();
  });

  it("should call loadTelemetryConfig and validateTelemetryConfig", () => {
    // Arrange
    const loadSpy = jest.spyOn(telemetryConfig, "loadTelemetryConfig");
    const validateSpy = jest.spyOn(telemetryConfig, "validateTelemetryConfig");

    // Mock the loadTelemetryConfig to return a valid configuration
    loadSpy.mockReturnValue({
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      enabled: true,
      environment: "test",
      exporters: {
        console: true,
        prometheus: {
          enabled: true,
          port: 9464,
          endpoint: "/metrics",
        },
      },
      resourceAttributes: {
        environment: "test",
      },
    });

    // Act
    const options = factory.createOpenTelemetryOptions();

    // Assert
    expect(loadSpy).toHaveBeenCalled();
    expect(validateSpy).toHaveBeenCalled();
    expect(options.serviceName).toBe("test-service");
    expect(options.environment).toBe("test");
  });

  it("should include export intervals if present in the config", () => {
    // Arrange
    const loadSpy = jest.spyOn(telemetryConfig, "loadTelemetryConfig");

    // Create a base configuration object
    const config = {
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      enabled: true,
      environment: "test",
      exporters: {
        console: true,
        prometheus: {
          enabled: false,
          port: 0,
          endpoint: "",
        },
      },
    };

    // Add exportIntervals separately to avoid TypeScript error
    (config as any).exportIntervals = {
      intervalMs: 30000,
      timeoutMs: 15000,
    };

    // Mock the loadTelemetryConfig to return the configuration
    loadSpy.mockReturnValue(config);

    // Act
    const options = factory.createOpenTelemetryOptions();

    // Assert
    expect(options.exportIntervals).toBeDefined();
    if (options.exportIntervals) {
      expect(options.exportIntervals.intervalMs).toBe(30000);
      expect(options.exportIntervals.timeoutMs).toBe(15000);
    }
  });

  it("should load configuration from environment variables", () => {
    // Arrange
    process.env[ENV_VARS.SERVICE_NAME] = "env-test-service";
    process.env[ENV_VARS.SERVICE_VERSION] = "2.0.0";
    process.env[ENV_VARS.ENVIRONMENT] = "production";
    process.env[ENV_VARS.ENABLED] = "true";
    process.env[ENV_VARS.EXPORTER_CONSOLE] = "true";
    process.env[ENV_VARS.EXPORTER_PROMETHEUS_ENABLED] = "false";

    // Act
    const options = factory.createOpenTelemetryOptions();

    // Assert
    expect(options.serviceName).toBe("env-test-service");
    expect(options.serviceVersion).toBe("2.0.0");
    expect(options.environment).toBe("production");
    expect(options.enabled).toBe(true);
    expect(options.exporters.console).toBe(true);
    expect(options.exporters.prometheus.enabled).toBe(false);
  });

  it("should handle custom exporters if present in the config", () => {
    // Arrange
    const loadSpy = jest.spyOn(telemetryConfig, "loadTelemetryConfig");

    // Mock the loadTelemetryConfig to return a configuration with custom exporters
    loadSpy.mockReturnValue({
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      enabled: true,
      environment: "test",
      exporters: {
        console: true,
        prometheus: {
          enabled: true,
          port: 9464,
          endpoint: "/metrics",
        },
        custom: {
          otlpHttp: {
            enabled: true,
            url: "http://localhost:4318/v1/metrics",
            headers: { Authorization: "Bearer test" },
          },
        },
      },
    });

    // Act
    const options = factory.createOpenTelemetryOptions();

    // Assert
    expect(options.exporters.custom).toBeDefined();
    if (options.exporters.custom) {
      expect(options.exporters.custom.otlpHttp).toBeDefined();
      if (options.exporters.custom.otlpHttp) {
        expect(options.exporters.custom.otlpHttp.enabled).toBe(true);
        expect(options.exporters.custom.otlpHttp.url).toBe(
          "http://localhost:4318/v1/metrics"
        );
      }
    }
  });

  it("should handle validation errors and log them", () => {
    // Arrange
    const loadSpy = jest.spyOn(telemetryConfig, "loadTelemetryConfig");
    const validateSpy = jest.spyOn(telemetryConfig, "validateTelemetryConfig");

    // Mock the loadTelemetryConfig to return a valid configuration
    loadSpy.mockReturnValue({
      serviceName: "test-service",
      serviceVersion: "1.0.0",
      enabled: true,
      exporters: {
        prometheus: {
          enabled: true,
          port: -1, // Invalid port
          endpoint: "/metrics",
        },
        console: false,
      },
      resourceAttributes: {},
    });

    // Mock validateTelemetryConfig to throw an error
    validateSpy.mockImplementation(() => {
      throw new Error(
        "Invalid Prometheus port: -1. Must be between 0 and 65535."
      );
    });

    // Act & Assert
    expect(() => factory.createOpenTelemetryOptions()).toThrow(
      "Invalid Prometheus port"
    );
    expect(loggerErrorSpy).toHaveBeenCalled();
    expect(loggerErrorSpy.mock.calls[0][0]).toContain(
      "Failed to create OpenTelemetry configuration"
    );
  });

  it("should handle complex resource attributes", () => {
    // Arrange
    process.env[ENV_VARS.RESOURCE_ATTRIBUTES] =
      "deployment.region=eu-west-1,host.name=test-host,custom.attribute=value";

    // Act
    const options = factory.createOpenTelemetryOptions();

    // Assert
    expect(options.resourceAttributes).toBeDefined();
    if (options.resourceAttributes) {
      expect(options.resourceAttributes["deployment.region"]).toBe("eu-west-1");
      expect(options.resourceAttributes["host.name"]).toBe("test-host");
      expect(options.resourceAttributes["custom.attribute"]).toBe("value");
    }
  });

  it("should handle metrics configuration from environment variables", () => {
    // Arrange
    process.env[ENV_VARS.HOST_METRICS_ENABLED] = "false";
    process.env[ENV_VARS.API_METRICS_ENABLED] = "true";
    process.env[ENV_VARS.CUSTOM_METRICS_ENABLED] = "true";

    // Act
    const options = factory.createOpenTelemetryOptions();

    // Assert
    expect(options.metrics).toBeDefined();
    if (options.metrics) {
      expect(options.metrics.hostMetrics).toBe(false);
      expect(options.metrics.apiMetrics).toBe(true);
      if (options.metrics.customMetrics) {
        expect(options.metrics.customMetrics.enabled).toBe(true);
      }
    }
  });
});
