/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * Simplified module imports to use the new TelemetryModule instead of complex OpenTelemetryModule.
 * This change improves:
 * 
 * - Developer Clarity: Simple module import without complex async configuration
 * - Compute Efficiency: Faster application startup without configuration factory overhead
 * - Long-term Support: Fewer dependencies and simpler module graph
 */

import { Module } from '@nestjs/common';
import { TelemetryModule } from './common/telemetry/telemetry.module';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';

/**
 * Main application module
 * 
 * This module imports and configures all the components needed for the application.
 * The telemetry module is now imported directly without complex configuration.
 */
@Module({
  imports: [
    // Simple telemetry module import
    TelemetryModule,
    
    // Feature modules
    ProductsModule,
    OrdersModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}