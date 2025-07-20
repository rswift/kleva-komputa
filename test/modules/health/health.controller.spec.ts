import { Test, TestingModule } from '@nestjs/testing';
import { HealthController } from '../../../src/modules/health/health.controller';
import { TelemetryService } from '../../../src/common/telemetry/telemetry.service';

// Mock the TelemetryService
const mockTelemetryService = {
  getConfig: jest.fn().mockReturnValue({
    serviceName: 'test-service',
    environment: 'test',
    prometheusPort: 9464,
    consoleExporter: false,
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
          provide: TelemetryService,
          useValue: mockTelemetryService,
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
      const startTime = mockDate.getTime() - 3600000; // 1 hour ago
      Object.defineProperty(controller, 'startTime', { value: startTime });
      
      // No need to mock counter since we simplified the health controller
      
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
          serviceName: 'test-service',
          prometheusPort: 9464,
          consoleExporter: false,
        },
        memory: {
          rss: 100,
          heapTotal: 50,
          heapUsed: 30,
          external: 10,
        },
      });
    });
    
    it('should use the telemetry service for configuration', async () => {
      // Act
      await controller.getHealth();
      
      // Assert
      expect(mockTelemetryService.getConfig).toHaveBeenCalled();
    });
  });
});