import { Controller, Get, Header, Logger, Res } from '@nestjs/common';
import { Response } from 'express';
import { OpenTelemetryService } from '../../common/telemetry/opentelemetry.service';
import * as fs from 'fs';
import * as path from 'path';
import * as http from 'http';

/**
 * Controller for metrics endpoint
 * 
 * This controller provides an endpoint for accessing metrics in Prometheus format.
 * It proxies requests to the Prometheus exporter if enabled, or returns a message
 * if the Prometheus exporter is not enabled.
 */
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);
  
  constructor(private readonly telemetryService: OpenTelemetryService) {}
  
  /**
   * Get metrics in Prometheus format
   * 
   * @param res Express response object
   */
  @Get()
  @Header('Content-Type', 'text/plain')
  async getMetrics(@Res() res: Response): Promise<void> {
    this.logger.log('Metrics requested');
    
    // Get telemetry configuration
    const config = this.telemetryService.getConfiguration();
    
    // Check if Prometheus exporter is enabled
    if (config.exporters?.prometheus?.enabled) {
      const port = config.exporters.prometheus.port;
      const endpoint = config.exporters.prometheus.endpoint || '/metrics';
      
      try {
        // Proxy the request to the Prometheus exporter
        const prometheusUrl = `http://localhost:${port}${endpoint}`;
        this.logger.debug(`Proxying metrics request to ${prometheusUrl}`);
        
        // Make a request to the Prometheus exporter
        const metricsResponse = await this.fetchPrometheusMetrics(prometheusUrl);
        
        // Return the metrics
        res.send(metricsResponse);
      } catch (error) {
        this.logger.error(`Failed to fetch metrics from Prometheus exporter: ${error.message}`);
        res.status(500).send(`Error fetching metrics: ${error.message}`);
      }
    } else {
      // Prometheus exporter is not enabled
      this.logger.warn('Prometheus exporter is not enabled');
      res.send('# Prometheus exporter is not enabled. Enable it in the configuration to see metrics here.');
    }
  }
  
  /**
   * Fetch metrics from the Prometheus exporter
   * 
   * @param url URL of the Prometheus exporter
   * @returns Metrics in Prometheus format
   */
  private fetchPrometheusMetrics(url: string): Promise<string> {
    return new Promise((resolve, reject) => {
      http.get(url, (response) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to fetch metrics: ${response.statusCode} ${response.statusMessage}`));
          return;
        }
        
        const chunks: Buffer[] = [];
        
        response.on('data', (chunk) => {
          chunks.push(chunk);
        });
        
        response.on('end', () => {
          const metrics = Buffer.concat(chunks).toString('utf8');
          resolve(metrics);
        });
      }).on('error', (error) => {
        reject(error);
      });
    });
  }
}