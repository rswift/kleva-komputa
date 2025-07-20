/*
 * REFACTOR COMMENT (Claude Sonnet 4.0):
 * This interceptor replaces the original MetricsInterceptor with a simplified approach.
 * Improvements include:
 * 
 * - Developer Clarity: Direct telemetry service usage without wrapper methods
 * - Compute Efficiency: Eliminates parameter filtering overhead and complex attribute processing
 * - Long-term Support: Simpler logic is easier to maintain and debug
 * - Security: No sensitive parameter processing reduces data leakage risk
 */

import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { TelemetryService } from './telemetry.service';

@Injectable()
export class TelemetryInterceptor implements NestInterceptor {
  constructor(private readonly telemetryService: TelemetryService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    // Extract basic request information
    const method = request.method;
    const route = request.route?.path || request.url || 'unknown';
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        const status = response.statusCode;
        
        // Direct telemetry recording - no complex parameter processing
        this.telemetryService.recordHttpRequest(method, route, status, duration);
      }),
    );
  }
}