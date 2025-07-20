import { Injectable, Logger } from '@nestjs/common';
import { OpenTelemetryService } from './opentelemetry.service';
import { 
  Counter, 
  Histogram, 
  MetricsService as IMetricsService, 
  ObservableGaugeRegistration, 
  UpDownCounter 
} from './interfaces/metrics-service.interface';

/**
 * Service for creating and managing metrics
 * 
 * This service provides a simplified interface for working with OpenTelemetry metrics.
 * It abstracts away the complexity of the OpenTelemetry API and provides methods for
 * common metrics operations like creating counters, histograms, and recording API calls.
 * 
 * The service is designed to be used throughout the application to record metrics
 * for both automatic instrumentation and custom business metrics.
 */
@Injectable()
export class MetricsService implements IMetricsService {
  private readonly logger = new Logger(MetricsService.name);
  
  // Pre-created metrics for common operations
  private readonly apiRequestCounter: Counter;
  private readonly apiRequestDuration: Histogram;
  private readonly apiErrorCounter: Counter;
  
  // Meter name for all metrics created by this service
  private readonly meterName: string;
  
  constructor(private readonly telemetryService: OpenTelemetryService) {
    // Get the service name from the telemetry configuration
    const config = this.telemetryService.getConfiguration();
    this.meterName = config.serviceName;
    
    // Create common metrics that will be used frequently
    this.apiRequestCounter = this.createCounter(
      'api.request.count',
      'Count of API requests'
    );
    
    this.apiRequestDuration = this.createHistogram(
      'api.request.duration',
      'Duration of API requests in milliseconds',
      'ms'
    );
    
    this.apiErrorCounter = this.createCounter(
      'api.error.count',
      'Count of API errors'
    );
    
    this.logger.log('Metrics service initialized');
  }
  
  /**
   * Create a counter metric
   * 
   * @param name Name of the counter
   * @param description Description of what the counter measures
   * @param unit Optional unit of measurement (default: '1')
   * @returns Counter instance
   */
  createCounter(name: string, description: string, unit = '1'): Counter {
    try {
      const counter = this.telemetryService.createCounter(name, description, this.meterName);
      
      return {
        add: (value: number, attributes?: Record<string, any>) => {
          try {
            counter.add(value, attributes);
          } catch (error) {
            this.logger.error(`Error adding to counter ${name}: ${error.message}`);
          }
        }
      };
    } catch (error) {
      this.logger.error(`Error creating counter ${name}: ${error.message}`);
      
      // Return a no-op counter if creation fails
      return {
        add: () => {}
      };
    }
  }
  
  /**
   * Create a histogram metric
   * 
   * @param name Name of the histogram
   * @param description Description of what the histogram measures
   * @param unit Optional unit of measurement (default: 'ms')
   * @returns Histogram instance
   */
  createHistogram(name: string, description: string, unit = 'ms'): Histogram {
    try {
      const histogram = this.telemetryService.createHistogram(name, description, unit, this.meterName);
      
      return {
        record: (value: number, attributes?: Record<string, any>) => {
          try {
            histogram.record(value, attributes);
          } catch (error) {
            this.logger.error(`Error recording to histogram ${name}: ${error.message}`);
          }
        }
      };
    } catch (error) {
      this.logger.error(`Error creating histogram ${name}: ${error.message}`);
      
      // Return a no-op histogram if creation fails
      return {
        record: () => {}
      };
    }
  }
  
  /**
   * Create an up-down counter metric
   * 
   * @param name Name of the up-down counter
   * @param description Description of what the up-down counter measures
   * @param unit Optional unit of measurement (default: '1')
   * @returns Up-down counter instance
   */
  createUpDownCounter(name: string, description: string, unit = '1'): UpDownCounter {
    try {
      const upDownCounter = this.telemetryService.createUpDownCounter(name, description, this.meterName);
      
      return {
        add: (value: number, attributes?: Record<string, any>) => {
          try {
            upDownCounter.add(value, attributes);
          } catch (error) {
            this.logger.error(`Error adding to up-down counter ${name}: ${error.message}`);
          }
        }
      };
    } catch (error) {
      this.logger.error(`Error creating up-down counter ${name}: ${error.message}`);
      
      // Return a no-op up-down counter if creation fails
      return {
        add: () => {}
      };
    }
  }
  
  /**
   * Create an observable gauge metric
   * 
   * @param name Name of the gauge
   * @param description Description of what the gauge measures
   * @param callback Function that returns the current value
   * @param unit Optional unit of measurement (default: '1')
   * @returns Observable gauge registration that can be used to unregister the callback
   */
  createObservableGauge(
    name: string, 
    description: string, 
    callback: () => number,
    unit = '1'
  ): ObservableGaugeRegistration {
    try {
      const registration = this.telemetryService.createObservableGauge(
        name,
        description,
        callback,
        unit,
        this.meterName
      );
      
      return {
        unregister: () => {
          try {
            registration.unregister();
          } catch (error) {
            this.logger.error(`Error unregistering observable gauge ${name}: ${error.message}`);
          }
        }
      };
    } catch (error) {
      this.logger.error(`Error creating observable gauge ${name}: ${error.message}`);
      
      // Return a no-op registration if creation fails
      return {
        unregister: () => {}
      };
    }
  }
  
  /**
   * Record an API call
   * 
   * This method records metrics for an API call, including the count and duration.
   * It also records the API parameters as attributes if provided.
   * 
   * @param endpoint API endpoint path
   * @param method HTTP method
   * @param durationMs Duration of the API call in milliseconds
   * @param status HTTP status code
   * @param params Optional API parameters to record as attributes
   */
  recordApiCall(
    endpoint: string,
    method: string,
    durationMs: number,
    status: number,
    params?: Record<string, any>
  ): void {
    try {
      // Create base attributes for the API call
      const attributes: Record<string, any> = {
        endpoint,
        method,
        status,
      };
      
      // Add API parameters as attributes if provided
      if (params) {
        // Filter out sensitive parameters and limit attribute values
        const filteredParams = this.filterAndLimitParams(params);
        
        // Add filtered parameters to attributes
        Object.entries(filteredParams).forEach(([key, value]) => {
          attributes[`param.${key}`] = value;
        });
      }
      
      // Record the API call count
      this.apiRequestCounter.add(1, attributes);
      
      // Record the API call duration
      this.apiRequestDuration.record(durationMs, attributes);
      
      // Record error metrics if the status code indicates an error
      if (status >= 400) {
        this.apiErrorCounter.add(1, {
          ...attributes,
          errorType: status >= 500 ? 'server_error' : 'client_error',
        });
      }
    } catch (error) {
      this.logger.error(`Error recording API call metrics: ${error.message}`);
    }
  }
  
  /**
   * Record a business metric
   * 
   * This method records a custom business metric with the specified value and attributes.
   * It can be used to record domain-specific metrics like order values, product views, etc.
   * 
   * @param name Name of the metric
   * @param value Value to record
   * @param attributes Optional attributes to associate with the metric
   */
  recordBusinessMetric(
    name: string,
    value: number,
    attributes?: Record<string, any>
  ): void {
    try {
      // Determine the appropriate metric type based on the name and value
      if (name.endsWith('.count') || name.endsWith('.total')) {
        // Use a counter for count or total metrics
        const counter = this.createCounter(
          name,
          `Business metric: ${name}`,
          this.determineUnit(name)
        );
        
        counter.add(value, attributes);
      } else if (name.endsWith('.duration') || name.endsWith('.time')) {
        // Use a histogram for duration or time metrics
        const histogram = this.createHistogram(
          name,
          `Business metric: ${name}`,
          this.determineUnit(name)
        );
        
        histogram.record(value, attributes);
      } else if (name.endsWith('.gauge') || name.endsWith('.value')) {
        // Use an up-down counter for gauge or value metrics
        const upDownCounter = this.createUpDownCounter(
          name,
          `Business metric: ${name}`,
          this.determineUnit(name)
        );
        
        upDownCounter.add(value, attributes);
      } else {
        // Default to a counter for other metrics
        const counter = this.createCounter(
          name,
          `Business metric: ${name}`,
          this.determineUnit(name)
        );
        
        counter.add(value, attributes);
      }
    } catch (error) {
      this.logger.error(`Error recording business metric ${name}: ${error.message}`);
    }
  }
  
  /**
   * Filter and limit parameters to avoid recording sensitive or excessive data
   * 
   * @param params Parameters to filter and limit
   * @returns Filtered and limited parameters
   */
  private filterAndLimitParams(params: Record<string, any>): Record<string, string> {
    const result: Record<string, string> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential'];
    
    Object.entries(params).forEach(([key, value]) => {
      // Skip sensitive parameters
      if (sensitiveKeys.some(sensitive => key.toLowerCase().includes(sensitive))) {
        return;
      }
      
      // Convert value to string and limit length
      let stringValue: string;
      
      if (value === null || value === undefined) {
        stringValue = '';
      } else if (typeof value === 'object') {
        try {
          stringValue = JSON.stringify(value);
        } catch {
          stringValue = '[object]';
        }
      } else {
        stringValue = String(value);
      }
      
      // Limit string length to avoid excessive attribute values
      if (stringValue.length > 100) {
        stringValue = stringValue.substring(0, 97) + '...';
      }
      
      result[key] = stringValue;
    });
    
    return result;
  }
  
  /**
   * Determine the appropriate unit based on the metric name
   * 
   * @param name Metric name
   * @returns Appropriate unit for the metric
   */
  private determineUnit(name: string): string {
    if (name.includes('.duration') || name.includes('.time')) {
      return 'ms';
    } else if (name.includes('.bytes') || name.includes('.size')) {
      return 'By';
    } else if (name.includes('.percent') || name.includes('.ratio')) {
      return '%';
    } else if (name.includes('.temperature')) {
      return 'Cel';
    } else {
      return '1';
    }
  }
}