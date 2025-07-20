/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * Updated to use the simplified TelemetryService instead of multiple telemetry services.
 * This change improves:
 * 
 * - Developer Clarity: Single service dependency instead of two separate services
 * - Compute Efficiency: Direct access to configuration without service layer overhead
 * - Long-term Support: Simplified dependency management
 * - Security: Reduced complexity in health endpoint reduces potential information leakage
 */

import { Controller, Get, Logger } from '@nestjs/common';
import { TelemetryService } from '../../common/telemetry/telemetry.service';

/**
 * Simplified health check response interface
 */
interface HealthCheckResponse {
  status: 'ok' | 'error';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  telemetry: {
    serviceName: string;
    prometheusPort: number;
    consoleExporter: boolean;
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
  
  constructor(
    private readonly telemetryService: TelemetryService,
  ) {
    this.startTime = Date.now();
  }
  
  /**
   * Get health status
   * 
   * @returns Health check response
   */
  @Get()
  async getHealth(): Promise<HealthCheckResponse> {
    this.logger.log('Health check requested');
    
    // Get telemetry configuration - simplified approach
    const telemetryConfig = this.telemetryService.getConfig();
    
    // Get memory usage
    const memoryUsage = process.memoryUsage();
    
    // Create simplified health check response
    const response: HealthCheckResponse = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor((Date.now() - this.startTime) / 1000), // Uptime in seconds
      version: process.env.npm_package_version || '0.1.0',
      environment: telemetryConfig.environment,
      telemetry: {
        serviceName: telemetryConfig.serviceName,
        prometheusPort: telemetryConfig.prometheusPort,
        consoleExporter: telemetryConfig.consoleExporter,
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