import { defaultConfig, AppConfig } from "./app.config";
import {
  ENV_VARS,
  DEFAULT_PROMETHEUS_PORT,
  DEFAULT_PROMETHEUS_ENDPOINT,
  DEFAULT_SERVICE_NAME_PREFIX,
} from "../common/telemetry/telemetry.constants";
import { Logger } from "@nestjs/common";

// Create a logger for the telemetry configuration
const logger = new Logger("TelemetryConfig");

/**
 * Parse a boolean value from an environment variable
 *
 * This helper function safely parses boolean values from environment variables,
 * handling various string representations like 'true', 'yes', '1', etc.
 *
 * @param value The string value to parse
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed boolean value or the default value
 */
function parseBoolean(
  value: string | undefined,
  defaultValue: boolean
): boolean {
  if (value === undefined) {
    return defaultValue;
  }

  const normalizedValue = value.toLowerCase().trim();
  return ["true", "yes", "1", "on"].includes(normalizedValue);
}

/**
 * Parse a number value from an environment variable
 *
 * This helper function safely parses numeric values from environment variables,
 * providing proper error handling and fallback to default values.
 *
 * @param value The string value to parse
 * @param defaultValue The default value to return if parsing fails
 * @returns The parsed number value or the default value
 */
function parseNumber(value: string | undefined, defaultValue: number): number {
  if (value === undefined) {
    return defaultValue;
  }

  const parsedValue = parseInt(value, 10);
  return isNaN(parsedValue) ? defaultValue : parsedValue;
}

/**
 * Parse resource attributes from environment variable
 *
 * This helper function parses the OTEL_RESOURCE_ATTRIBUTES environment variable
 * which follows the format "key1=value1,key2=value2".
 *
 * @param value The string value to parse
 * @returns Object containing parsed resource attributes
 */
function parseResourceAttributes(
  value: string | undefined
): Record<string, string> {
  if (!value) {
    return {};
  }

  try {
    return value
      .split(",")
      .map((pair) => pair.trim())
      .filter((pair) => pair.includes("="))
      .reduce(
        (acc, pair) => {
          const [key, value] = pair.split("=", 2);
          acc[key.trim()] = value.trim();
          return acc;
        },
        {} as Record<string, string>
      );
  } catch (error) {
    logger.warn(`Failed to parse resource attributes: ${error.message}`);
    return {};
  }
}

/**
 * Load OpenTelemetry configuration from environment variables
 *
 * This function reads configuration values from environment variables,
 * falling back to default values when environment variables are not set.
 * This approach allows for flexible configuration across different
 * environments without requiring code changes.
 *
 * Environment variables follow the OpenTelemetry specification naming convention
 * where possible, with additional custom variables for our specific needs.
 *
 * @returns OpenTelemetry configuration
 */
export function loadTelemetryConfig(): AppConfig["openTelemetry"] {
  // Get service name with fallbacks to ensure we always have a valid name
  const serviceName =
    process.env[ENV_VARS.SERVICE_NAME] ||
    defaultConfig.openTelemetry.serviceName ||
    `${DEFAULT_SERVICE_NAME_PREFIX}-${Date.now()}`;

  // Get environment from specific env var, NODE_ENV, or default
  const environment =
    process.env[ENV_VARS.ENVIRONMENT] ||
    process.env.NODE_ENV ||
    defaultConfig.environment;

  // Parse enabled flag
  const enabled = parseBoolean(
    process.env[ENV_VARS.ENABLED],
    defaultConfig.openTelemetry.enabled
  );

  // Parse console exporter flag
  const consoleExporter = parseBoolean(
    process.env[ENV_VARS.EXPORTER_CONSOLE],
    defaultConfig.openTelemetry.exporters.console
  );

  // Parse Prometheus configuration
  const prometheusEnabled = parseBoolean(
    process.env[ENV_VARS.EXPORTER_PROMETHEUS_ENABLED],
    defaultConfig.openTelemetry.exporters.prometheus.enabled
  );

  const prometheusPort = parseNumber(
    process.env[ENV_VARS.EXPORTER_PROMETHEUS_PORT],
    defaultConfig.openTelemetry.exporters.prometheus.port ||
      DEFAULT_PROMETHEUS_PORT
  );

  const prometheusEndpoint =
    process.env[ENV_VARS.EXPORTER_PROMETHEUS_ENDPOINT] ||
    defaultConfig.openTelemetry.exporters.prometheus.endpoint ||
    DEFAULT_PROMETHEUS_ENDPOINT;

  // Parse metrics configuration
  const hostMetrics = parseBoolean(
    process.env[ENV_VARS.HOST_METRICS_ENABLED],
    defaultConfig.openTelemetry.metrics?.hostMetrics ?? true
  );

  const apiMetrics = parseBoolean(
    process.env[ENV_VARS.API_METRICS_ENABLED],
    defaultConfig.openTelemetry.metrics?.apiMetrics ?? true
  );

  const customMetricsEnabled = parseBoolean(
    process.env[ENV_VARS.CUSTOM_METRICS_ENABLED],
    defaultConfig.openTelemetry.metrics?.customMetrics?.enabled ?? true
  );

  // Parse export intervals
  const exportIntervalMs = parseNumber(
    process.env[ENV_VARS.EXPORT_INTERVAL_MS],
    60000 // Default to 60 seconds
  );

  const exportTimeoutMs = parseNumber(
    process.env[ENV_VARS.EXPORT_TIMEOUT_MS],
    30000 // Default to 30 seconds
  );

  // Parse resource attributes from environment variable
  const envResourceAttributes = parseResourceAttributes(
    process.env[ENV_VARS.RESOURCE_ATTRIBUTES]
  );

  // Build the configuration object
  const config: AppConfig["openTelemetry"] = {
    serviceName,
    serviceVersion:
      process.env[ENV_VARS.SERVICE_VERSION] ||
      defaultConfig.openTelemetry.serviceVersion,
    enabled,
    environment,
    exporters: {
      console: consoleExporter,
      prometheus: {
        enabled: prometheusEnabled,
        port: prometheusPort,
        endpoint: prometheusEndpoint,
      },
    },
    metrics: {
      hostMetrics,
      apiMetrics,
      customMetrics: {
        enabled: customMetricsEnabled,
        defaultAttributes: {
          "service.name": serviceName,
          "service.version":
            process.env[ENV_VARS.SERVICE_VERSION] ||
            defaultConfig.openTelemetry.serviceVersion,
          "deployment.environment": environment,
          ...(defaultConfig.openTelemetry.metrics?.customMetrics
            ?.defaultAttributes || {}),
        },
      },
    },
    resourceAttributes: {
      environment,
      "service.framework": "nestjs",
      "service.instance.id": `instance-${Math.floor(Math.random() * 10000)}`,
      // Merge default resource attributes with those from environment
      ...(defaultConfig.openTelemetry.resourceAttributes || {}),
      ...envResourceAttributes,
    },
  };

  // Add export intervals to the configuration if they were specified
  if (
    process.env[ENV_VARS.EXPORT_INTERVAL_MS] ||
    process.env[ENV_VARS.EXPORT_TIMEOUT_MS]
  ) {
    (config as any).exportIntervals = {
      intervalMs: exportIntervalMs,
      timeoutMs: exportTimeoutMs,
    };
  }

  // Log the loaded configuration in development environments
  if (environment === "development") {
    logger.debug(
      "Loaded OpenTelemetry configuration",
      JSON.stringify(config, null, 2)
    );
  }

  return config;
}

/**
 * Validate OpenTelemetry configuration
 *
 * This function checks that the provided configuration is valid,
 * throwing errors for invalid configurations. This helps catch
 * configuration issues early rather than having them cause
 * problems at runtime.
 *
 * @param config OpenTelemetry configuration to validate
 * @throws Error if configuration is invalid
 */
export function validateTelemetryConfig(
  config: AppConfig["openTelemetry"]
): void {
  // Validate service name
  if (!config.serviceName) {
    throw new Error("OpenTelemetry service name is required");
  }

  // Validate service name format
  if (
    config.serviceName.includes(" ") ||
    /[^a-zA-Z0-9_\-.]/.test(config.serviceName)
  ) {
    logger.warn(
      `Service name "${config.serviceName}" contains spaces or special characters. This may cause issues with some telemetry backends.`
    );
  }

  // Validate service version
  if (!config.serviceVersion) {
    logger.warn(
      "OpenTelemetry service version is not specified. Using a version is recommended for tracking metrics across releases."
    );
  } else if (!/^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?$/.test(config.serviceVersion)) {
    logger.warn(
      `Service version "${config.serviceVersion}" does not follow semantic versioning format (e.g., 1.0.0). This may cause issues with version tracking.`
    );
  }

  // Validate environment
  if (!config.environment) {
    logger.warn(
      "OpenTelemetry environment is not specified. This may make it difficult to filter metrics by environment."
    );
  } else {
    // Check for standard environment names
    const standardEnvs = ["development", "test", "staging", "production"];
    if (!standardEnvs.includes(config.environment)) {
      logger.warn(
        `Environment "${config.environment}" is not one of the standard environments (${standardEnvs.join(", ")}). This may cause confusion when filtering metrics.`
      );
    }
  }

  // Validate exporters - at least one exporter should be enabled
  if (!config.exporters?.console && !config.exporters?.prometheus?.enabled) {
    logger.warn(
      "No OpenTelemetry exporters are enabled. Metrics will not be exported."
    );
  }

  // Validate Prometheus configuration if enabled
  if (config.exporters?.prometheus?.enabled) {
    // Validate port
    const port = config.exporters.prometheus.port;
    if (port !== undefined) {
      if (isNaN(port)) {
        throw new Error(`Invalid Prometheus port: ${port}. Must be a number.`);
      }

      if (port < 0 || port > 65535) {
        throw new Error(
          `Invalid Prometheus port: ${port}. Must be between 0 and 65535.`
        );
      }

      // Check for commonly used ports that might cause conflicts
      if ([80, 443, 3000, 8080].includes(port)) {
        logger.warn(
          `Prometheus port ${port} is commonly used for other services and may cause conflicts.`
        );
      }

      // Check for privileged ports
      if (port < 1024) {
        logger.warn(
          `Prometheus port ${port} is a privileged port (below 1024). This may require elevated permissions to bind.`
        );
      }
    } else {
      throw new Error(
        "Prometheus port is required when Prometheus exporter is enabled"
      );
    }

    // Validate endpoint
    if (!config.exporters.prometheus.endpoint) {
      throw new Error(
        "Prometheus endpoint is required when Prometheus exporter is enabled"
      );
    }

    // Validate endpoint format
    if (!config.exporters.prometheus.endpoint.startsWith("/")) {
      throw new Error(
        `Invalid Prometheus endpoint: ${config.exporters.prometheus.endpoint}. Must start with a forward slash.`
      );
    }

    // Check for standard endpoint
    if (config.exporters.prometheus.endpoint !== "/metrics") {
      logger.warn(
        `Prometheus endpoint "${config.exporters.prometheus.endpoint}" is not the standard "/metrics". This may cause issues with Prometheus scraping.`
      );
    }
  }

  // Validate resource attributes
  const resourceAttributes = config.resourceAttributes || {};
  
  if (typeof resourceAttributes !== "object") {
    throw new Error("Resource attributes must be an object");
  }

  // Check for required resource attributes
  if (!resourceAttributes.environment) {
    logger.warn(
      "Environment resource attribute is not specified. This may make it difficult to filter metrics by environment."
    );
  }

  // Check for standard resource attributes
  const recommendedAttributes = [
    "service.name",
    "service.version",
    "service.instance.id",
    "service.namespace",
    "host.name",
  ];

  const missingRecommended = recommendedAttributes.filter(
    (attr) =>
      !resourceAttributes[attr] &&
      attr !== "service.name" &&
      attr !== "service.version"
  );

  if (missingRecommended.length > 0) {
    logger.warn(
      `The following recommended resource attributes are missing: ${missingRecommended.join(", ")}`
    );
  }

  // Check for attribute value length limits
  Object.entries(resourceAttributes).forEach(([key, value]) => {
    if (typeof value === "string" && value.length > 255) {
      logger.warn(
        `Resource attribute "${key}" has a value longer than 255 characters, which may be truncated by some telemetry backends.`
      );
    }
  });

  // Validate metrics configuration
  if (config.metrics) {
    // Validate custom metrics configuration if present
    if (config.metrics.customMetrics) {
      if (config.metrics.customMetrics.defaultAttributes) {
        if (
          typeof config.metrics.customMetrics.defaultAttributes !== "object"
        ) {
          throw new Error(
            "Custom metrics default attributes must be an object"
          );
        }

        // Check for required default attributes
        if (!config.metrics.customMetrics.defaultAttributes["service.name"]) {
          logger.warn(
            "service.name is not specified in custom metrics default attributes. This may make it difficult to identify the source of metrics."
          );
        }
      }
    }
  }

  // Validate export intervals if specified
  if ((config as any).exportIntervals) {
    const { intervalMs, timeoutMs } = (config as any).exportIntervals;

    if (intervalMs < 1000) {
      logger.warn(
        `Export interval ${intervalMs}ms is very short and may cause performance issues. Consider using a longer interval (e.g., 15000ms).`
      );
    }

    if (timeoutMs >= intervalMs) {
      logger.warn(
        `Export timeout ${timeoutMs}ms is greater than or equal to the export interval ${intervalMs}ms. This may cause export operations to overlap.`
      );
    }
  }

  // Log validation success
  logger.log("OpenTelemetry configuration validated successfully");
}
