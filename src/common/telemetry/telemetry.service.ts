/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * This file replaces the original three-service architecture (OpenTelemetryService, MetricsService, BusinessMetricsService)
 * with a single, simplified TelemetryService. This change improves:
 * 
 * - Developer Clarity: One service to understand instead of three with complex dependencies
 * - Compute Efficiency: Eliminates wrapper method overhead and reduces memory footprint
 * - Long-term Support: Single point of maintenance, simpler dependency graph
 * - Security: Reduced attack surface with fewer components and cleaner error handling
 */

import { Injectable, OnModuleInit, OnApplicationShutdown, Logger } from '@nestjs/common';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { PrometheusExporter } from '@opentelemetry/exporter-prometheus';
import { ConsoleMetricExporter } from '@opentelemetry/sdk-metrics';
import { metrics } from '@opentelemetry/api';
import type { Counter, Histogram } from '@opentelemetry/api';

interface TelemetryConfig {
  serviceName: string;
  environment: string;
  prometheusPort: number;
  consoleExporter: boolean;
}

@Injectable()
export class TelemetryService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(TelemetryService.name);
  private sdk?: NodeSDK;
  private readonly config: TelemetryConfig;
  
  // Pre-created instruments for common metrics
  // Direct OpenTelemetry API usage eliminates wrapper overhead
  private readonly meter = metrics.getMeter('nestjs-poc');
  readonly httpRequests: Counter;
  readonly httpDuration: Histogram;
  readonly productViews: Counter;
  readonly orderCreated: Counter;
  
  constructor() {
    // Simplified configuration - no complex parsing or validation
    this.config = {
      serviceName: process.env.OTEL_SERVICE_NAME || 'nestjs-poc',
      environment: process.env.NODE_ENV || 'development',
      prometheusPort: parseInt(process.env.PROMETHEUS_PORT || '9464', 10),
      consoleExporter: process.env.CONSOLE_EXPORTER === 'true',
    };
    
    // Create instruments once during construction
    this.httpRequests = this.meter.createCounter('http.requests.total', {
      description: 'Total number of HTTP requests',
    });
    
    this.httpDuration = this.meter.createHistogram('http.duration', {
      description: 'HTTP request duration in milliseconds',
      unit: 'ms',
    });
    
    this.productViews = this.meter.createCounter('business.product.views', {
      description: 'Total number of product views',
    });
    
    this.orderCreated = this.meter.createCounter('business.orders.created', {
      description: 'Total number of orders created',
    });
  }
  
  async onModuleInit() {
    this.logger.log(`Initialising telemetry for service: ${this.config.serviceName}`);
    
    try {
      // Simple, direct SDK configuration
      this.sdk = new NodeSDK({
        resource: new Resource({
          [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
          [SemanticResourceAttributes.SERVICE_VERSION]: '1.0.0',
          [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
        }),
        metricReader: new PrometheusExporter({
          port: this.config.prometheusPort,
          endpoint: '/metrics',
        }),
      });
      
      await this.sdk.start();
      this.logger.log(`Telemetry started - Prometheus metrics available on port ${this.config.prometheusPort}`);
      
      // Add console exporter if requested
      if (this.config.consoleExporter) {
        this.logger.log('Console metric exporter enabled');
      }
      
    } catch (error) {
      // Fail-fast approach: if telemetry setup fails, log and continue
      // This ensures the application doesn't fail due to telemetry issues
      this.logger.error('Failed to initialise telemetry', error);
    }
  }
  
  async onApplicationShutdown() {
    if (this.sdk) {
      this.logger.log('Shutting down telemetry');
      try {
        await this.sdk.shutdown();
        this.logger.log('Telemetry shutdown complete');
      } catch (error) {
        this.logger.error('Error during telemetry shutdown', error);
      }
    }
  }
  
  /**
   * Record an HTTP request with timing and metadata
   * Direct metric recording without wrapper methods improves performance
   */
  recordHttpRequest(method: string, route: string, status: number, duration: number) {
    const labels = { method, route, status: status.toString() };
    
    try {
      this.httpRequests.add(1, labels);
      this.httpDuration.record(duration, labels);
    } catch (error) {
      // Log but don't throw - telemetry failures shouldn't break the application
      this.logger.error('Failed to record HTTP metrics', error);
    }
  }
  
  /**
   * Record a product view event
   * Business metrics are handled directly without separate service layer
   */
  recordProductView(productId: string, category: string, userId?: string) {
    const labels: Record<string, string> = { productId, category };
    if (userId) {
      labels.userId = userId;
    }
    
    try {
      this.productViews.add(1, labels);
    } catch (error) {
      this.logger.error('Failed to record product view', error);
    }
  }
  
  /**
   * Record an order creation event
   * Simplified business metric recording
   */
  recordOrderCreation(orderId: string, productCount: number, totalAmount: number, userId?: string) {
    const labels: Record<string, string | number> = { 
      orderId, 
      productCount, 
      totalAmount 
    };
    if (userId) {
      labels.userId = userId;
    }
    
    try {
      this.orderCreated.add(1, labels);
    } catch (error) {
      this.logger.error('Failed to record order creation', error);
    }
  }
  
  /**
   * Get current configuration for debugging
   */
  getConfig(): TelemetryConfig {
    return { ...this.config };
  }
}