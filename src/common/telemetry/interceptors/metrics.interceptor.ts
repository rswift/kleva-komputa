import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../metrics.service';

/**
 * Interceptor for automatically recording API call metrics
 * 
 * This interceptor measures the duration of API calls and records metrics
 * using the MetricsService. It captures the endpoint, method, status code,
 * and request parameters as attributes.
 * 
 * The interceptor is designed to be applied globally to all controllers
 * or selectively to specific controllers or routes.
 */
@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  private readonly logger = new Logger(MetricsInterceptor.name);

  constructor(private readonly metricsService: MetricsService) {}

  /**
   * Intercept method that is called for each request
   * 
   * This method measures the duration of the request and records metrics
   * using the MetricsService.
   * 
   * @param context Execution context containing request information
   * @param next Call handler for the next middleware or route handler
   * @returns Observable that completes when the request is handled
   */
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    // Get the request object
    const request = context.switchToHttp().getRequest();
    
    // Skip metrics collection for the metrics endpoint itself to avoid circular reporting
    if (request.path === '/metrics') {
      return next.handle();
    }
    
    // Record the start time
    const startTime = Date.now();
    
    // Extract request information
    const { method, path } = request;
    
    // Extract query parameters and body for metrics attributes
    const params = {
      ...request.query,
      ...request.params,
    };
    
    // Add request body for POST, PUT, and PATCH requests, but exclude large payloads
    if (['POST', 'PUT', 'PATCH'].includes(method) && 
        request.body && 
        typeof request.body === 'object' && 
        Object.keys(request.body).length < 10) {
      params.body = request.body;
    }
    
    // Process the request and record metrics when it completes
    return next.handle().pipe(
      tap({
        next: (data: any) => {
          // Calculate the request duration
          const durationMs = Date.now() - startTime;
          
          // Get the response status code (default to 200 if not available)
          const statusCode = context.switchToHttp().getResponse()?.statusCode || 200;
          
          // Record the API call metrics
          this.metricsService.recordApiCall(
            path,
            method,
            durationMs,
            statusCode,
            params
          );
          
          // Log the API call for debugging in development
          if (process.env.NODE_ENV === 'development') {
            this.logger.debug(`${method} ${path} - ${statusCode} - ${durationMs}ms`);
          }
        },
        error: (error: any) => {
          // Calculate the request duration
          const durationMs = Date.now() - startTime;
          
          // Determine the status code from the error or default to 500
          const statusCode = error.status || error.statusCode || 500;
          
          // Add error information to the parameters
          const errorParams = {
            ...params,
            errorName: error.name || 'Error',
            errorMessage: error.message || 'Unknown error',
          };
          
          // Record the API call metrics with error information
          this.metricsService.recordApiCall(
            path,
            method,
            durationMs,
            statusCode,
            errorParams
          );
          
          // Log the error for debugging
          this.logger.debug(`${method} ${path} - ${statusCode} - ${durationMs}ms - Error: ${error.message}`);
        }
      })
    );
  }
}