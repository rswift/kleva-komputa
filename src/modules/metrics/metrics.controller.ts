/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * Updated to use the simplified TelemetryService and removed complex proxying logic.
 * This change improves:
 * 
 * - Developer Clarity: Simpler metrics endpoint without complex HTTP proxying
 * - Compute Efficiency: Direct response instead of internal HTTP requests
 * - Long-term Support: Fewer dependencies and simpler error handling
 * - Security: Eliminates internal HTTP requests that could be exploited
 */

import { Controller, Get, Header, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { TelemetryService } from '../../common/telemetry/telemetry.service';

/**
 * Controller for metrics endpoint
 * 
 * This controller provides information about the metrics endpoint.
 * The actual Prometheus metrics are served directly by the Prometheus exporter.
 */
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);
  
  constructor(private readonly telemetryService: TelemetryService) {}
  
  /**
   * Get metrics information
   * 
   * @param res Express response object
   */
  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(@Res() res: Response): Promise<void> {
    this.logger.log('Metrics information requested');
    
    // Get telemetry configuration
    const config = this.telemetryService.getConfig();
    
    // Provide information about where to find metrics
    const message = `# NestJS OpenTelemetry POC Metrics
# 
# Prometheus metrics are available at: http://localhost:${config.prometheusPort}/metrics
# 
# Available metrics:
# - http.requests.total: Total number of HTTP requests
# - http.duration: HTTP request duration in milliseconds
# - business.product.views: Total number of product views
# - business.orders.created: Total number of orders created
#
# Service: ${config.serviceName}
# Environment: ${config.environment}
# Console Exporter: ${config.consoleExporter ? 'enabled' : 'disabled'}
`;
    
    res.send(message);
  }
}