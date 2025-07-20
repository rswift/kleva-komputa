import { Test, TestingModule } from '@nestjs/testing';
import { MetricsController } from '../../../src/modules/metrics/metrics.controller';
import { TelemetryService } from '../../../src/common/telemetry/telemetry.service';
import { Response } from 'express';

// Mock the TelemetryService
const mockTelemetryService = {
  getConfig: jest.fn().mockReturnValue({
    serviceName: 'test-service',
    environment: 'test',
    prometheusPort: 9464,
    consoleExporter: false,
  }),
};

describe('MetricsController', () => {
  let controller: MetricsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetricsController],
      providers: [
        {
          provide: TelemetryService,
          useValue: mockTelemetryService,
        },
      ],
    }).compile();

    controller = module.get<MetricsController>(MetricsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getMetrics', () => {
    it('should return metrics information', async () => {
      // Arrange
      const mockResponse = {
        send: jest.fn(),
      } as unknown as Response;

      // Act
      await controller.getMetrics(mockResponse);

      // Assert
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('NestJS OpenTelemetry POC Metrics')
      );
      expect(mockResponse.send).toHaveBeenCalledWith(
        expect.stringContaining('http://localhost:9464/metrics')
      );
      expect(mockTelemetryService.getConfig).toHaveBeenCalled();
    });
  });
});