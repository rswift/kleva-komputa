import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MetricsService } from '../telemetry/metrics.service';

/**
 * Global exception filter that records error metrics
 * 
 * This filter catches all exceptions thrown by the application and records
 * metrics about them using the MetricsService. It also formats the error
 * response in a consistent way.
 */
@Catch()
export class ErrorMetricsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ErrorMetricsFilter.name);
  private readonly errorCounter;
  
  constructor(private readonly metricsService: MetricsService) {
    // Create a counter for errors
    this.errorCounter = this.metricsService.createCounter(
      'api.error.count',
      'Count of API errors'
    );
  }
  
  /**
   * Catch and handle exceptions
   * 
   * @param exception The exception that was thrown
   * @param host The arguments host
   */
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    // Determine status code and error details
    const status = this.getStatusCode(exception);
    const errorDetails = this.getErrorDetails(exception);
    
    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${errorDetails.message}`,
      errorDetails.stack
    );
    
    // Record error metrics
    this.recordErrorMetrics(request, status, errorDetails);
    
    // Send the error response
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error: errorDetails.error,
      message: errorDetails.message,
    });
  }
  
  /**
   * Get the HTTP status code for an exception
   * 
   * @param exception The exception
   * @returns HTTP status code
   */
  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }
    return HttpStatus.INTERNAL_SERVER_ERROR;
  }
  
  /**
   * Get error details from an exception
   * 
   * @param exception The exception
   * @returns Error details
   */
  private getErrorDetails(exception: unknown): {
    error: string;
    message: string;
    stack?: string;
  } {
    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      
      if (typeof response === 'object' && response !== null) {
        const responseObj = response as Record<string, any>;
        return {
          error: responseObj.error || exception.name,
          message: responseObj.message || exception.message,
          stack: exception.stack,
        };
      }
      
      return {
        error: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }
    
    if (exception instanceof Error) {
      return {
        error: exception.name || 'Error',
        message: exception.message || 'An unexpected error occurred',
        stack: exception.stack,
      };
    }
    
    return {
      error: 'InternalServerError',
      message: 'An unexpected error occurred',
    };
  }
  
  /**
   * Record error metrics
   * 
   * @param request The HTTP request
   * @param status The HTTP status code
   * @param errorDetails Error details
   */
  private recordErrorMetrics(
    request: Request,
    status: number,
    errorDetails: { error: string; message: string }
  ): void {
    try {
      // Create attributes for the error
      const attributes: Record<string, any> = {
        path: request.url,
        method: request.method,
        status,
        errorType: errorDetails.error,
      };
      
      // Add query parameters as attributes
      if (Object.keys(request.query).length > 0) {
        attributes.hasQueryParams = true;
        
        // Add specific query parameters (avoiding sensitive data)
        Object.entries(request.query).forEach(([key, value]) => {
          // Skip sensitive parameters
          if (!['password', 'token', 'key', 'secret', 'auth'].includes(key.toLowerCase())) {
            attributes[`query.${key}`] = String(value).substring(0, 50); // Limit length
          }
        });
      }
      
      // Record the error
      this.errorCounter.add(1, attributes);
      
      // Record error by category
      const errorCategory = this.getErrorCategory(status);
      this.metricsService.recordBusinessMetric(
        `api.error.${errorCategory}.count`,
        1,
        attributes
      );
    } catch (error) {
      this.logger.error(`Failed to record error metrics: ${error.message}`);
    }
  }
  
  /**
   * Get the error category based on status code
   * 
   * @param status HTTP status code
   * @returns Error category
   */
  private getErrorCategory(status: number): string {
    if (status >= 500) {
      return 'server';
    } else if (status >= 400) {
      return 'client';
    } else {
      return 'unknown';
    }
  }
}