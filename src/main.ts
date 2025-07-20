import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { defaultConfig } from './config/app.config';
import { MetricsService } from './common/telemetry/metrics.service';
import { ErrorMetricsFilter } from './common/filters/error-metrics.filter';
import { MetricsInterceptor } from './common/telemetry/interceptors/metrics.interceptor';
import { initializeHttpInstrumentation } from './common/telemetry/instrumentation/http-instrumentation';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('Initializing application...');
  
  // Initialize HTTP instrumentation before creating the NestJS app
  // This ensures that all HTTP requests are instrumented from the start
  initializeHttpInstrumentation(
    process.env.OTEL_SERVICE_NAME || defaultConfig.openTelemetry.serviceName,
    process.env.OTEL_SERVICE_VERSION || defaultConfig.openTelemetry.serviceVersion,
    process.env.OTEL_ENVIRONMENT || process.env.NODE_ENV || defaultConfig.environment
  );
  
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Get the metrics service from the application context
  const metricsService = app.get(MetricsService);
  
  // Apply global exception filter for error metrics
  app.useGlobalFilters(new ErrorMetricsFilter(metricsService));
  
  // Apply global interceptor for API metrics
  app.useGlobalInterceptors(new MetricsInterceptor(metricsService));
  
  // Get port from configuration or environment variable
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : defaultConfig.port;
  
  // Start listening on the configured port
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}

// Start the application
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});