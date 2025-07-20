import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../../src/modules/health/health.controller';
import { OpenTelemetryService } from '../../../src/common/telemetry/opentelemetry.service';
import { MetricsService } from '../../../src/common/telemetry/metrics.service';

// Mock the OpenTelemetryService
const mockOpenTelemetryService = {
  getConfiguration: jest.fn().mockReturnValue({
    serviceName: 'test-service',
    serviceVersion: '1.0.0',
    enabled: true,
    environment: 'test',
    exporters: {
      console: true,
      prometheus: {
        enabled: true,
        endpoint: '/metrics',
      },
    },
  }),
};

// Mock the MetricsService
const mockMetricsService = {
  createCounter: jest.fn().mockReturnValue({
    add: jest.fn(),
  }),
};

describe('HealthController', () => {
  let controller: HealthController;
  
  beforeEach(async () => {
    // Mock process.memoryUsage with only the properties used in the controller
    jest.spyOn(process, 'memoryUsage').mockReturnValue({
      rss: 100 * 1024 * 1024, // 100 MB
      heapTotal: 50 * 1024 * 1024, // 50 MB
      heapUsed: 30 * 1024 * 1024, // 30 MB
      external: 10 * 1024 * 1024, // 10 MB
    } as any);
    
    // Create a testing module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: OpenTelemetryService,
          useValue: mockOpenTelemetryService,
        },
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();
    
    // Get the controller from the testing module
    controller = module.get<HealthController>(HealthController);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  
  describe('getHealth', () => {
    it('should return health check information', async () => {
      // Arrange
      const mockDate = new Date('2025-07-19T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);
      
      // Mock the startTime property
      const startTime = Date.now() - 3600000; // 1 hour ago
      Object.defineProperty(controller, 'startTime', { value: startTime });
      
      // Mock the healthCheckCounter
      const addSpy = jest.fn();
      Object.defineProperty(controller, 'healthCheckCounter', {
        value: { add: addSpy },
      });
      
      // Act
      const result = await controller.getHealth();
      
      // Assert
      expect(result).toEqual({
        status: 'ok',
        timestamp: mockDate.toISOString(),
        uptime: 3600, // 3600 seconds = 1 hour
        version: expect.any(String),
        environment: 'test',
        telemetry: {
          enabled: true,
          serviceName: 'test-service',
          exporters: {
            console: true,
            prometheus: {
              enabled: true,
              endpoint: '/metrics',
            },
          },
        },
        memory: {
          rss: 100,
          heapTotal: 50,
          heapUsed: 30,
          external: 10,
        },
      });
      
      // Should record a health check metric
      expect(addSpy).toHaveBeenCalledWith(1);
    });
    
    it('should create a counter for health checks during initialization', () => {
      // Assert
      expect(mockMetricsService.createCounter).toHaveBeenCalledWith(
        'api.health.check.count',
        'Count of health check requests'
      );
    });
  });
});