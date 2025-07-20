import { Module } from '@nestjs/common';
import { OpenTelemetryModule } from './common/telemetry/opentelemetry.module';
import { OpenTelemetryConfigFactory } from './config/opentelemetry-config.factory';
import { ProductsModule } from './modules/products/products.module';
import { OrdersModule } from './modules/orders/orders.module';
import { HealthModule } from './modules/health/health.module';
import { MetricsModule } from './modules/metrics/metrics.module';

/**
 * Main application module
 * 
 * This module imports and configures all the components needed for the application.
 * The OpenTelemetry module is configured asynchronously using the OpenTelemetryConfigFactory
 * to load configuration from environment variables.
 */
@Module({
  imports: [
    // Configure OpenTelemetry
    OpenTelemetryModule.forRootAsync({
      useClass: OpenTelemetryConfigFactory,
    }),
    
    // Feature modules
    ProductsModule,
    OrdersModule,
    HealthModule,
    MetricsModule,
  ],
  controllers: [],
  providers: [OpenTelemetryConfigFactory],
})
export class AppModule {}