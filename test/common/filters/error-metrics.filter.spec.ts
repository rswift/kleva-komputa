import { Test } from '@nestjs/testing';
import { ErrorMetricsFilter } from '../../../src/common/filters/error-metrics.filter';
import { MetricsService } from '../../../src/common/telemetry/metrics.service';
import { HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

// Mock the MetricsService
const mockMetricsService = {
  createCounter: jest.fn().mockReturnValue({
    add: jest.fn(),
  }),
  recordBusinessMetric: jest.fn(),
};

describe('ErrorMetricsFilter', () => {
  let filter: ErrorMetricsFilter;
  let metricsService: MetricsService;
  let errorCounter: { add: jest.Mock };
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const moduleRef = await Test.createTestingModule({
      providers: [
        ErrorMetricsFilter,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();
    
    // Get the filter and service from the testing module
    filter = moduleRef.get<ErrorMetricsFilter>(ErrorMetricsFilter);
    metricsService = moduleRef.get<MetricsService>(MetricsService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock the error counter
    errorCounter = { add: jest.fn() };
    (filter as any).errorCounter = errorCounter;
    
    // Mock the logger to prevent error output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });
  
  it('should be defined', () => {
    expect(filter).toBeDefined();
  });
  
  describe('catch', () => {
    it('should handle HttpException with proper status code', () => {
      // Arrange
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost({
        url: '/api/test',
        method: 'GET',
      });
      
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(host.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Act
      filter.catch(exception, host);
      
      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'BadRequestException',
        message: 'Test error',
      }));
      
      expect(errorCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        path: '/api/test',
        method: 'GET',
        status: HttpStatus.BAD_REQUEST,
        errorType: 'BadRequestException',
      }));
      
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'api.error.client.count',
        1,
        expect.any(Object)
      );
    });
    
    it('should handle HttpException with response object', () => {
      // Arrange
      const exception = new HttpException(
        {
          error: 'Custom error',
          message: 'Custom error message',
        },
        HttpStatus.BAD_REQUEST
      );
      
      const host = createMockArgumentsHost({
        url: '/api/test',
        method: 'GET',
      });
      
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(host.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Act
      filter.catch(exception, host);
      
      // Assert
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Custom error',
        message: 'Custom error message',
      }));
      
      expect(errorCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        errorType: 'Custom error',
      }));
    });
    
    it('should handle non-HttpException errors with 500 status code', () => {
      // Arrange
      const exception = new Error('Test error');
      const host = createMockArgumentsHost({
        url: '/api/test',
        method: 'GET',
      });
      
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(host.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Act
      filter.catch(exception, host);
      
      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Error',
        message: 'Test error',
      }));
      
      expect(errorCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        errorType: 'Error',
      }));
      
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'api.error.server.count',
        1,
        expect.any(Object)
      );
    });
    
    it('should handle non-Error objects', () => {
      // Arrange
      const exception = 'String error';
      const host = createMockArgumentsHost({
        url: '/api/test',
        method: 'GET',
      });
      
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(host.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Act
      filter.catch(exception, host);
      
      // Assert
      expect(response.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(response.json).toHaveBeenCalledWith(expect.objectContaining({
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'InternalServerError',
        message: 'An unexpected error occurred',
      }));
      
      expect(errorCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        errorType: 'InternalServerError',
      }));
    });
    
    it('should include query parameters as attributes', () => {
      // Arrange
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost({
        url: '/api/test',
        method: 'GET',
        query: {
          param1: 'value1',
          param2: 'value2',
        },
      });
      
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(host.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Act
      filter.catch(exception, host);
      
      // Assert
      expect(errorCounter.add).toHaveBeenCalledWith(1, expect.objectContaining({
        hasQueryParams: true,
        'query.param1': 'value1',
        'query.param2': 'value2',
      }));
    });
    
    it('should handle errors during metrics recording', () => {
      // Arrange
      const exception = new HttpException('Test error', HttpStatus.BAD_REQUEST);
      const host = createMockArgumentsHost({
        url: '/api/test',
        method: 'GET',
      });
      
      const response = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      jest.spyOn(host.switchToHttp(), 'getResponse').mockReturnValue(response);
      
      // Make the error counter throw an error
      errorCounter.add.mockImplementationOnce(() => {
        throw new Error('Metrics error');
      });
      
      // Act & Assert
      expect(() => filter.catch(exception, host)).not.toThrow();
      expect(response.json).toHaveBeenCalled();
    });
  });
  
  // Helper function to create a mock ArgumentsHost
  function createMockArgumentsHost(request: any): ArgumentsHost {
    const mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
        getResponse: jest.fn().mockReturnValue({}),
      }),
      getType: jest.fn().mockReturnValue('http'),
      getArgs: jest.fn().mockReturnValue([]),
    };
    
    return mockHost as unknown as ArgumentsHost;
  }
});