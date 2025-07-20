/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * Simplified bootstrap process using the new TelemetryService and TelemetryInterceptor.
 * This change improves:
 * 
 * - Developer Clarity: Cleaner bootstrap code without complex instrumentation setup
 * - Compute Efficiency: Faster startup without pre-initialization overhead
 * - Long-term Support: Simpler dependency management and error handling
 * - Security: Reduced complexity in application startup reduces potential failure points
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { TelemetryService } from './common/telemetry/telemetry.service';
import { TelemetryInterceptor } from './common/telemetry/telemetry.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  logger.log('Initialising application...');
  
  // Create NestJS application instance
  const app = await NestFactory.create(AppModule);
  
  // Set global prefix for all routes
  app.setGlobalPrefix('api');
  
  // Get the telemetry service from the application context
  const telemetryService = app.get(TelemetryService);
  
  // Apply global interceptor for automatic HTTP metrics
  app.useGlobalInterceptors(new TelemetryInterceptor(telemetryService));
  
  // Get port from environment variable or use default
  const port = parseInt(process.env.PORT || '3000', 10);
  
  // Start listening on the configured port
  await app.listen(port);
  logger.log(`Application is running on: ${await app.getUrl()}`);
  logger.log(`Metrics available at: http://localhost:${telemetryService.getConfig().prometheusPort}/metrics`);
}

// Start the application
bootstrap().catch((error) => {
  console.error('Error during application bootstrap:', error);
  process.exit(1);
});