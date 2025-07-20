/**
 * Interface for the metrics service
 * 
 * This interface defines the contract for the metrics service, which provides
 * methods for creating and updating metrics. It abstracts the OpenTelemetry
 * implementation details and provides a simpler API for recording metrics.
 */
export interface MetricsService {
  /**
   * Create a counter metric
   * 
   * Counters are used to measure a non-negative, monotonically increasing value.
   * They are useful for counting events, such as the number of requests, errors, etc.
   * 
   * @param name Name of the counter
   * @param description Description of what the counter measures
   * @param unit Optional unit of measurement (default: '1')
   * @returns Counter instance
   */
  createCounter(name: string, description: string, unit?: string): Counter;
  
  /**
   * Create a histogram metric
   * 
   * Histograms are used to measure a distribution of values, such as request durations.
   * They provide statistics like count, sum, min, max, and percentiles.
   * 
   * @param name Name of the histogram
   * @param description Description of what the histogram measures
   * @param unit Optional unit of measurement (default: 'ms')
   * @returns Histogram instance
   */
  createHistogram(name: string, description: string, unit?: string): Histogram;
  
  /**
   * Create an up-down counter metric
   * 
   * Up-down counters are used to measure a non-monotonic value that can increase or decrease.
   * They are useful for measuring values like queue size, active connections, etc.
   * 
   * @param name Name of the up-down counter
   * @param description Description of what the up-down counter measures
   * @param unit Optional unit of measurement (default: '1')
   * @returns Up-down counter instance
   */
  createUpDownCounter(name: string, description: string, unit?: string): UpDownCounter;
  
  /**
   * Create an observable gauge metric
   * 
   * Observable gauges are used to measure a value that can increase or decrease
   * and is observed rather than updated directly. They are useful for measuring
   * values like CPU usage, memory usage, etc.
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
    unit?: string
  ): ObservableGaugeRegistration;
  
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
  ): void;
  
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
  ): void;
}

/**
 * Interface for a counter metric
 */
export interface Counter {
  /**
   * Add a value to the counter
   * 
   * @param value Value to add (must be non-negative)
   * @param attributes Optional attributes to associate with the value
   */
  add(value: number, attributes?: Record<string, any>): void;
}

/**
 * Interface for a histogram metric
 */
export interface Histogram {
  /**
   * Record a value in the histogram
   * 
   * @param value Value to record
   * @param attributes Optional attributes to associate with the value
   */
  record(value: number, attributes?: Record<string, any>): void;
}

/**
 * Interface for an up-down counter metric
 */
export interface UpDownCounter {
  /**
   * Add a value to the up-down counter
   * 
   * @param value Value to add (can be negative)
   * @param attributes Optional attributes to associate with the value
   */
  add(value: number, attributes?: Record<string, any>): void;
}

/**
 * Interface for an observable gauge registration
 */
export interface ObservableGaugeRegistration {
  /**
   * Unregister the observable gauge callback
   */
  unregister(): void;
}