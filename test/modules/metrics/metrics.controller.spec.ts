import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../../../src/modules/metrics/metrics.controller';
import { OpenTelemetryService } from '../../../src/common/telemetry/opentelemetry.service';
import { Response } from 'express';
import * as http from 'http';

// Mock the OpenTelemetryService
const mockOpenTelemetryService = {
  getConfiguration: jest.fn(),
};

// Mock http.get
jest.mock('http', () => ({
  get: jest.fn(),
}));

describe('MetricsController', () => {
  let controller: MetricsController;
  let openTelemetryService: OpenTelemetryService;
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: OpenTelemetryService,
          useValue: mockOpenTelemetryService,
        },
      ],
    }).compile();
    
    // Get the controller and service from the testing module
    controller = module.get<MetricsController>(MetricsController);
    openTelemetryService = module.get<OpenTelemetryService>(OpenTelemetryService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  
  describe('getMetrics', () => {
    it('should proxy metrics from Prometheus exporter when enabled', async () => {
      // Arrange
      mockOpenTelemetryService.getConfiguration.mockReturnValue({
        exporters: {
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '/metrics',
          },
        },
      });
      
      // Mock the response object
      const mockResponse = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      
      // Mock http.get to simulate a successful response
      const mockHttpResponse = {
        statusCode: 200,
        on: jest.fn((event, callback) => {
          if (event === 'data') {
            callback(Buffer.from('metric1{label="value"} 1.0'));
          } else if (event === 'end') {
            callback();
          }
          return mockHttpResponse;
        }),
      };
      
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            // Do nothing for error event
          }
          return mockRequest;
        }),
      };
      
      (http.get as jest.Mock).mockImplementation((url, callback) => {
        callback(mockHttpResponse);
        return mockRequest;
      });
      
      // Act
      await controller.getMetrics(mockResponse);
      
      // Assert
      expect(mockResponse.send).toHaveBeenCalledWith('metric1{label="value"} 1.0');
      expect(http.get).toHaveBeenCalledWith(
        'http://localhost:9464/metrics',
        expect.any(Function)
      );
    });
    
    it('should return a message when Prometheus exporter is not enabled', async () => {
      // Arrange
      mockOpenTelemetryService.getConfiguration.mockReturnValue({
        exporters: {
          prometheus: {
            enabled: false,
          },
        },
      });
      
      // Mock the response object
      const mockResponse = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      
      // Act
      await controller.getMetrics(mockResponse);
      
      // Assert
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Prometheus exporter is not enabled')
      );
      expect(http.get).not.toHaveBeenCalled();
    });
    
    it('should handle errors when fetching metrics', async () => {
      // Arrange
      mockOpenTelemetryService.getConfiguration.mockReturnValue({
        exporters: {
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '/metrics',
          },
        },
      });
      
      // Mock the response object
      const mockResponse = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      
      // Mock http.get to simulate an error
      const mockRequest = {
        on: jest.fn((event, callback) => {
          if (event === 'error') {
            callback(new Error('Connection refused'));
          }
          return mockRequest;
        }),
      };
      
      (http.get as jest.Mock).mockImplementation((url, callback) => {
        return mockRequest;
      });
      
      // Act
      await controller.getMetrics(mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Error fetching metrics')
      );
    });
    
    it('should handle non-200 status codes when fetching metrics', async () => {
      // Arrange
      mockOpenTelemetryService.getConfiguration.mockReturnValue({
        exporters: {
          prometheus: {
            enabled: true,
            port: 9464,
            endpoint: '/metrics',
          },
        },
      });
      
      // Mock the response object
      const mockResponse = {
        send: jest.fn(),
        status: jest.fn().mockReturnThis(),
      } as unknown as Response;
      
      // Mock http.get to simulate a non-200 response
      const mockHttpResponse = {
        statusCode: 404,
        statusMessage: 'Not Found',
      };
      
      const mockRequest = {
        on: jest.fn((event, callback) => {
          return mockRequest;
        }),
      };
      
      (http.get as jest.Mock).mockImplementation((url, callback) => {
        callback(mockHttpResponse);
        return mockRequest;
      });
      
      // Act
      await controller.getMetrics(mockResponse);
      
      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('Failed to fetch metrics: 404 Not Found')
      );
    });
  });
});