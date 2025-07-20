import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { Logger } from '@nestjs/common';

/**
 * Initialize automatic HTTP instrumentation
 * 
 * This function sets up automatic instrumentation for HTTP requests and responses
 * using the OpenTelemetry Node.js auto-instrumentation package. It configures
 * the instrumentation to capture HTTP request and response details, including
 * headers, method, URL, and status code.
 * 
 * @param serviceName Name of the service
 * @param serviceVersion Version of the service
 * @param environment Environment (e.g., development, production)
 */
export function initializeHttpInstrumentation(
  serviceName: string,
  serviceVersion: string,
  environment: string
): void {
  const logger = new Logger('HttpInstrumentation');
  
  try {
    logger.log('Initializing automatic HTTP instrumentation');
    
    // Create a resource that identifies the service
    const resource = Resource.default().merge(
      new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
        [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
        [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
      })
    );
    
    // Create the SDK with auto-instrumentation
    const sdk = new NodeSDK({
      resource,
      instrumentations: [
        getNodeAutoInstrumentations({
          // Enable HTTP instrumentation
          '@opentelemetry/instrumentation-http': {
            enabled: true,
            ignoreIncomingPaths: ['/health', '/metrics'], // Don't trace health checks and metrics
            ignoreOutgoingUrls: [/localhost:9464/], // Don't trace Prometheus scrapes
          },
          // Enable Express instrumentation if using Express
          '@opentelemetry/instrumentation-express': {
            enabled: true,
          },
          // Disable other instrumentations we don't need
          '@opentelemetry/instrumentation-fs': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-net': {
            enabled: false,
          },
          '@opentelemetry/instrumentation-dns': {
            enabled: false,
          },
        }),
      ],
    });
    
    // Start the SDK
    sdk.start();
    logger.log('Automatic HTTP instrumentation initialized successfully');
    
    // Register shutdown handler
    process.on('SIGTERM', () => {
      sdk.shutdown()
        .then(() => logger.log('HTTP instrumentation SDK shut down successfully'))
        .catch(err => logger.error('Error shutting down HTTP instrumentation SDK', err))
        .finally(() => process.exit(0));
    });
  } catch (error) {
    logger.error(`Failed to initialize automatic HTTP instrumentation: ${error.message}`);
  }
}