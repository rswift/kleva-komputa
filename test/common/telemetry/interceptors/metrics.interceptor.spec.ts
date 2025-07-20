import { Test } from '@nestjs/testing';
import { MetricsInterceptor } from '../../../../src/common/telemetry/interceptors/metrics.interceptor';
import { MetricsService } from '../../../../src/common/telemetry/metrics.service';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, of, throwError } from 'rxjs';
import { Logger } from '@nestjs/common';

// Mock the MetricsService
const mockMetricsService = {
  recordApiCall: jest.fn(),
};

describe('MetricsInterceptor', () => {
  let interceptor: MetricsInterceptor;
  let metricsService: MetricsService;
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const moduleRef = await Test.createTestingModule({
      providers: [
        MetricsInterceptor,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();
    
    // Get the interceptor and service from the testing module
    interceptor = moduleRef.get<MetricsInterceptor>(MetricsInterceptor);
    metricsService = moduleRef.get<MetricsService>(MetricsService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock Date.now to return a consistent value
    jest.spyOn(Date, 'now').mockImplementation(() => 1000);
  });
  
  afterEach(() => {
    // Restore Date.now
    jest.restoreAllMocks();
  });
  
  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });
  
  describe('intercept', () => {
    it('should skip metrics collection for the metrics endpoint', async () => {
      // Arrange
      const context = createMockExecutionContext({
        path: '/metrics',
        method: 'GET',
      });
      
      const next: CallHandler = {
        handle: () => of('test'),
      };
      
      // Act
      await interceptor.intercept(context, next).toPromise();
      
      // Assert
      expect(mockMetricsService.recordApiCall).not.toHaveBeenCalled();
    });
    
    it('should record API call metrics for successful requests', async () => {
      // Arrange
      const context = createMockExecutionContext({
        path: '/api/test',
        method: 'GET',
        query: { param1: 'value1' },
        params: { id: '123' },
      });
      
      // Mock the response object with a statusCode
      const response = { statusCode: 200 };
      jest.spyOn(context.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Mock Date.now to return different values on each call to simulate elapsed time
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // First call (start time)
        .mockReturnValueOnce(1100); // Second call (end time)
      
      const next: CallHandler = {
        handle: () => of('test'),
      };
      
      // Act
      await interceptor.intercept(context, next).toPromise();
      
      // Assert
      expect(mockMetricsService.recordApiCall).toHaveBeenCalledWith(
        '/api/test',
        'GET',
        100, // 1100 - 1000 = 100ms
        200,
        expect.objectContaining({
          param1: 'value1',
          id: '123',
        })
      );
    });
    
    it('should record API call metrics for failed requests', async () => {
      // Arrange
      const context = createMockExecutionContext({
        path: '/api/test',
        method: 'POST',
        body: { data: 'test' },
      });
      
      // Mock Date.now to return different values on each call to simulate elapsed time
      jest.spyOn(Date, 'now')
        .mockReturnValueOnce(1000) // First call (start time)
        .mockReturnValueOnce(1200); // Second call (end time)
      
      const error = new Error('Test error');
      (error as any).status = 500;
      
      const next: CallHandler = {
        handle: () => throwError(error),
      };
      
      // Spy on the logger to prevent error output during tests
      const loggerSpy = jest.spyOn(Logger.prototype, 'debug').mockImplementation(() => {});
      
      // Act & Assert
      try {
        await interceptor.intercept(context, next).toPromise();
        fail('Expected error to be thrown');
      } catch (e) {
        expect(mockMetricsService.recordApiCall).toHaveBeenCalledWith(
          '/api/test',
          'POST',
          200, // 1200 - 1000 = 200ms
          500,
          expect.objectContaining({
            body: { data: 'test' },
            errorName: 'Error',
            errorMessage: 'Test error',
          })
        );
      }
    });
    
    it('should include request body for POST, PUT, and PATCH requests', async () => {
      // Arrange
      const context = createMockExecutionContext({
        path: '/api/test',
        method: 'POST',
        body: { data: 'test' },
      });
      
      const response = { statusCode: 201 };
      jest.spyOn(context.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      const next: CallHandler = {
        handle: () => of('test'),
      };
      
      // Act
      await interceptor.intercept(context, next).toPromise();
      
      // Assert
      expect(mockMetricsService.recordApiCall).toHaveBeenCalledWith(
        '/api/test',
        'POST',
        expect.any(Number),
        201,
        expect.objectContaining({
          body: { data: 'test' },
        })
      );
    });
    
    it('should not include request body for GET requests', async () => {
      // Arrange
      const context = createMockExecutionContext({
        path: '/api/test',
        method: 'GET',
        body: { data: 'test' },
      });
      
      const response = { statusCode: 200 };
      jest.spyOn(context.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      const next: CallHandler = {
        handle: () => of('test'),
      };
      
      // Act
      await interceptor.intercept(context, next).toPromise();
      
      // Assert
      const recordApiCallArgs = mockMetricsService.recordApiCall.mock.calls[0];
      const params = recordApiCallArgs[4];
      expect(params.body).toBeUndefined();
    });
  });
  
  // Helper function to create a mock ExecutionContext
  function createMockExecutionContext(request: any): ExecutionContext {
    const mockContext = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue({}),
      }),
    };
    
    return mockContext as unknown as ExecutionContext;
  }
});