import { Controller, Get, Logger } from '@nestjs/common';
import { OpenTelemetryService } from '../../common/telemetry/opentelemetry.service';
import { MetricsService } from '../../common/telemetry/metrics.service';

/**
 * Health check response interface
 */
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  telemetry: {
    enabled: boolean;
    serviceName: string;
    exporters: {
      console: boolean;
      prometheus: {
        enabled: boolean;
        endpoint: string;
      };
    };
  };
  memory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
}

/**
 * Controller for health check endpoint
 */
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);
  private readonly startTime: number;
  private readonly healthCheckCounter;
  
  constructor(
    private readonly telemetryService: OpenTelemetryService,
    private readonly metricsService: MetricsService,
  ) {
    this.startTime = Date.now();
    
    // Create a counter for health checks
    this.healthCheckCounter = this.metricsService.createCounter(
      'api.health.check.count',
      'Count of health check requests'
    );
  }
  
  /**
   * Get health status
   * 
   * @returns Health check response
   */
  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    this.logger.log('Health check requested');
    
    // Record health check metric
    this.healthCheckCounter.add(1);
    
    // Get telemetry configuration
    const telemetryConfig = this.telemetryService.getConfiguration();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Create health check response
    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // Uptime in seconds
      version: process.env.npm_package_version || '0.1.0',
      environment: telemetryConfig.environment || process.env.NODE_ENV || 'development',
      telemetry: {
        enabled: telemetryConfig.enabled,
        serviceName: telemetryConfig.serviceName,
        exporters: {
          console: telemetryConfig.exporters?.console || false,
          prometheus: {
            enabled: telemetryConfig.exporters?.prometheus?.enabled || false,
            endpoint: telemetryConfig.exporters?.prometheus?.endpoint || '/metrics',
          },
        },
      },
      memory: {
        rss: Math.round(memoryUsage.rss / 1024 / 1024 * 100) / 100, // Convert to MB with 2 decimal places
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024 * 100) / 100,
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024 * 100) / 100,
        external: Math.round(memoryUsage.external / 1024 / 1024 * 100) / 100,
      },
    };
    
    return response;
  }
}