import { Test } from '@nestjs/testing';
import { MetricsService } from '../../../src/common/telemetry/metrics.service';
import { OpenTelemetryService } from '../../../src/common/telemetry/opentelemetry.service';
import { Logger } from '@nestjs/common';

// Mock the OpenTelemetryService
const mockOpenTelemetryService = {
  createCounter: jest.fn().mockReturnValue({
    add: jest.fn(),
  }),
  createHistogram: jest.fn().mockReturnValue({
    record: jest.fn(),
  }),
  createUpDownCounter: jest.fn().mockReturnValue({
    add: jest.fn(),
  }),
  createObservableGauge: jest.fn().mockReturnValue({
    unregister: jest.fn(),
  }),
  getConfiguration: jest.fn().mockReturnValue({
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    enabled: true,
  }),
};

describe('MetricsService', () => {
  let metricsService: MetricsService;
  let openTelemetryService: OpenTelemetryService;
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const moduleRef = await Test.createTestingModule({
      providers: [
        MetricsService,
        {
          provide: OpenTelemetryService,
          useValue: mockOpenTelemetryService,
        },
      ],
    }).compile();
    
    // Get the services from the testing module
    metricsService = moduleRef.get<MetricsService>(MetricsService);
    openTelemetryService = moduleRef.get<OpenTelemetryService>(OpenTelemetryService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('createCounter', () => {
    it('should create a counter using the OpenTelemetryService', () => {
      // Act
      const counter = metricsService.createCounter('test-counter', 'Test counter');
      
      // Assert
      expect(mockOpenTelemetryService.createCounter).toHaveBeenCalledWith(
        'test-counter',
        'Test counter',
        'test-service'
      );
      expect(counter).toBeDefined();
      expect(counter.add).toBeDefined();
    });
    
    it('should handle errors when creating a counter', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      mockOpenTelemetryService.createCounter.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act
      const counter = metricsService.createCounter('test-counter', 'Test counter');
      
      // Assert
      expect(errorSpy).toHaveBeenCalled();
      expect(counter).toBeDefined();
      expect(counter.add).toBeDefined();
      
      // The counter should be a no-op counter
      expect(() => counter.add(1)).not.toThrow();
    });
    
    it('should handle errors when adding to a counter', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      const mockCounter = {
        add: jest.fn().mockImplementationOnce(() => {
          throw new Error('Test error');
        }),
      };
      mockOpenTelemetryService.createCounter.mockReturnValueOnce(mockCounter);
      
      // Act
      const counter = metricsService.createCounter('test-counter', 'Test counter');
      
      // Assert
      expect(counter).toBeDefined();
      
      // Adding to the counter should not throw
      expect(() => counter.add(1)).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
  
  describe('createHistogram', () => {
    it('should create a histogram using the OpenTelemetryService', () => {
      // Act
      const histogram = metricsService.createHistogram('test-histogram', 'Test histogram');
      
      // Assert
      expect(mockOpenTelemetryService.createHistogram).toHaveBeenCalledWith(
        'test-histogram',
        'Test histogram',
        'ms',
        'test-service'
      );
      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
    });
    
    it('should create a histogram with custom unit', () => {
      // Act
      const histogram = metricsService.createHistogram('test-histogram', 'Test histogram', 'bytes');
      
      // Assert
      expect(mockOpenTelemetryService.createHistogram).toHaveBeenCalledWith(
        'test-histogram',
        'Test histogram',
        'bytes',
        'test-service'
      );
    });
    
    it('should handle errors when creating a histogram', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      mockOpenTelemetryService.createHistogram.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act
      const histogram = metricsService.createHistogram('test-histogram', 'Test histogram');
      
      // Assert
      expect(errorSpy).toHaveBeenCalled();
      expect(histogram).toBeDefined();
      expect(histogram.record).toBeDefined();
      
      // The histogram should be a no-op histogram
      expect(() => histogram.record(100)).not.toThrow();
    });
  });
  
  describe('createUpDownCounter', () => {
    it('should create an up-down counter using the OpenTelemetryService', () => {
      // Act
      const upDownCounter = metricsService.createUpDownCounter('test-counter', 'Test counter');
      
      // Assert
      expect(mockOpenTelemetryService.createUpDownCounter).toHaveBeenCalledWith(
        'test-counter',
        'Test counter',
        'test-service'
      );
      expect(upDownCounter).toBeDefined();
      expect(upDownCounter.add).toBeDefined();
    });
  });
  
  describe('createObservableGauge', () => {
    it('should create an observable gauge using the OpenTelemetryService', () => {
      // Arrange
      const callback = jest.fn().mockReturnValue(42);
      
      // Act
      const gauge = metricsService.createObservableGauge('test-gauge', 'Test gauge', callback);
      
      // Assert
      expect(mockOpenTelemetryService.createObservableGauge).toHaveBeenCalledWith(
        'test-gauge',
        'Test gauge',
        callback,
        '1',
        'test-service'
      );
      expect(gauge).toBeDefined();
      expect(gauge.unregister).toBeDefined();
    });
    
    it('should create an observable gauge with custom unit', () => {
      // Arrange
      const callback = jest.fn().mockReturnValue(42);
      
      // Act
      const gauge = metricsService.createObservableGauge('test-gauge', 'Test gauge', callback, 'celsius');
      
      // Assert
      expect(mockOpenTelemetryService.createObservableGauge).toHaveBeenCalledWith(
        'test-gauge',
        'Test gauge',
        callback,
        'celsius',
        'test-service'
      );
    });
  });
  
  describe('recordApiCall', () => {
    it('should record API call metrics', () => {
      // Arrange
      const addSpy = jest.fn();
      const recordSpy = jest.fn();
      
      // Mock the pre-created metrics
      (metricsService as any).apiRequestCounter = { add: addSpy };
      (metricsService as any).apiRequestDuration = { record: recordSpy };
      (metricsService as any).apiErrorCounter = { add: jest.fn() };
      
      // Act
      metricsService.recordApiCall(
        '/api/test',
        'GET',
        100,
        200,
        { param1: 'value1', param2: 'value2' }
      );
      
      // Assert
      expect(addSpy).toHaveBeenCalledWith(1, expect.objectContaining({
        endpoint: '/api/test',
        method: 'GET',
        status: 200,
        'param.param1': 'value1',
        'param.param2': 'value2',
      }));
      
      expect(recordSpy).toHaveBeenCalledWith(100, expect.objectContaining({
        endpoint: '/api/test',
        method: 'GET',
        status: 200,
      }));
    });
    
    it('should record error metrics for error status codes', () => {
      // Arrange
      const errorAddSpy = jest.fn();
      
      // Mock the pre-created metrics
      (metricsService as any).apiRequestCounter = { add: jest.fn() };
      (metricsService as any).apiRequestDuration = { record: jest.fn() };
      (metricsService as any).apiErrorCounter = { add: errorAddSpy };
      
      // Act
      metricsService.recordApiCall(
        '/api/test',
        'GET',
        100,
        500,
        { param1: 'value1' }
      );
      
      // Assert
      expect(errorAddSpy).toHaveBeenCalledWith(1, expect.objectContaining({
        endpoint: '/api/test',
        method: 'GET',
        status: 500,
        errorType: 'server_error',
      }));
    });
    
    it('should filter sensitive parameters', () => {
      // Arrange
      const addSpy = jest.fn();
      
      // Mock the pre-created metrics
      (metricsService as any).apiRequestCounter = { add: addSpy };
      (metricsService as any).apiRequestDuration = { record: jest.fn() };
      (metricsService as any).apiErrorCounter = { add: jest.fn() };
      
      // Act
      metricsService.recordApiCall(
        '/api/test',
        'GET',
        100,
        200,
        {
          param1: 'value1',
          password: 'secret',
          token: 'abc123',
          apiKey: 'xyz789',
        }
      );
      
      // Assert
      expect(addSpy).toHaveBeenCalledWith(1, expect.objectContaining({
        'param.param1': 'value1',
      }));
      
      // Sensitive parameters should be filtered out
      const attributes = addSpy.mock.calls[0][1];
      expect(attributes['param.password']).toBeUndefined();
      expect(attributes['param.token']).toBeUndefined();
      expect(attributes['param.apiKey']).toBeUndefined();
    });
    
    it('should limit long parameter values', () => {
      // Arrange
      const addSpy = jest.fn();
      
      // Mock the pre-created metrics
      (metricsService as any).apiRequestCounter = { add: addSpy };
      (metricsService as any).apiRequestDuration = { record: jest.fn() };
      (metricsService as any).apiErrorCounter = { add: jest.fn() };
      
      // Create a long string
      const longString = 'a'.repeat(200);
      
      // Act
      metricsService.recordApiCall(
        '/api/test',
        'GET',
        100,
        200,
        { longParam: longString }
      );
      
      // Assert
      const attributes = addSpy.mock.calls[0][1];
      expect(attributes['param.longParam'].length).toBeLessThan(longString.length);
      expect(attributes['param.longParam'].endsWith('...')).toBe(true);
    });
  });
  
  describe('recordBusinessMetric', () => {
    it('should record a counter metric for count or total metrics', () => {
      // Arrange
      const createCounterSpy = jest.spyOn(metricsService, 'createCounter');
      const mockCounter = { add: jest.fn() };
      createCounterSpy.mockReturnValue(mockCounter);
      
      // Act
      metricsService.recordBusinessMetric('test.count', 5, { attr1: 'value1' });
      
      // Assert
      expect(createCounterSpy).toHaveBeenCalled();
      expect(mockCounter.add).toHaveBeenCalledWith(5, { attr1: 'value1' });
    });
    
    it('should record a histogram metric for duration or time metrics', () => {
      // Arrange
      const createHistogramSpy = jest.spyOn(metricsService, 'createHistogram');
      const mockHistogram = { record: jest.fn() };
      createHistogramSpy.mockReturnValue(mockHistogram);
      
      // Act
      metricsService.recordBusinessMetric('test.duration', 100, { attr1: 'value1' });
      
      // Assert
      expect(createHistogramSpy).toHaveBeenCalled();
      expect(mockHistogram.record).toHaveBeenCalledWith(100, { attr1: 'value1' });
    });
    
    it('should record an up-down counter for gauge or value metrics', () => {
      // Arrange
      const createUpDownCounterSpy = jest.spyOn(metricsService, 'createUpDownCounter');
      const mockUpDownCounter = { add: jest.fn() };
      createUpDownCounterSpy.mockReturnValue(mockUpDownCounter);
      
      // Act
      metricsService.recordBusinessMetric('test.gauge', 42, { attr1: 'value1' });
      
      // Assert
      expect(createUpDownCounterSpy).toHaveBeenCalled();
      expect(mockUpDownCounter.add).toHaveBeenCalledWith(42, { attr1: 'value1' });
    });
    
    it('should determine the appropriate unit based on the metric name', () => {
      // Arrange
      const createCounterSpy = jest.spyOn(metricsService, 'createCounter');
      
      // Act
      metricsService.recordBusinessMetric('test.duration.ms', 100);
      metricsService.recordBusinessMetric('test.bytes.total', 1024);
      metricsService.recordBusinessMetric('test.percent.value', 75);
      
      // Assert
      expect(createCounterSpy).toHaveBeenCalledWith(
        'test.duration.ms',
        expect.any(String),
        'ms'
      );
      
      expect(createCounterSpy).toHaveBeenCalledWith(
        'test.bytes.total',
        expect.any(String),
        'By'
      );
      
      expect(createCounterSpy).toHaveBeenCalledWith(
        'test.percent.value',
        expect.any(String),
        '%'
      );
    });
    
    it('should handle errors when recording business metrics', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      jest.spyOn(metricsService, 'createCounter').mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act & Assert
      expect(() => metricsService.recordBusinessMetric('test.count', 5)).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});