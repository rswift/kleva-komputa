import { Test } from '@nestjs/testing';
import { BusinessMetricsService } from '../../../src/common/telemetry/business-metrics';
import { MetricsService } from '../../../src/common/telemetry/metrics.service';
import { Logger } from '@nestjs/common';

// Mock the MetricsService
const mockMetricsService = {
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
  recordBusinessMetric: jest.fn(),
};

describe('BusinessMetricsService', () => {
  let businessMetricsService: BusinessMetricsService;
  let metricsService: MetricsService;
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const moduleRef = await Test.createTestingModule({
      providers: [
        BusinessMetricsService,
        {
          provide: MetricsService,
          useValue: mockMetricsService,
        },
      ],
    }).compile();
    
    // Get the services from the testing module
    businessMetricsService = moduleRef.get<BusinessMetricsService>(BusinessMetricsService);
    metricsService = moduleRef.get<MetricsService>(MetricsService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  describe('initialization', () => {
    it('should create pre-defined metrics during initialization', () => {
      // Assert
      expect(mockMetricsService.createCounter).toHaveBeenCalledWith(
        'business.product.views.total',
        'Total number of product views'
      );
      
      expect(mockMetricsService.createCounter).toHaveBeenCalledWith(
        'business.orders.created.total',
        'Total number of orders created'
      );
      
      expect(mockMetricsService.createHistogram).toHaveBeenCalledWith(
        'business.order.processing.time',
        'Time taken to process an order in milliseconds',
        'ms'
      );
      
      expect(mockMetricsService.createObservableGauge).toHaveBeenCalledWith(
        'business.product.inventory.current',
        'Current product inventory levels',
        expect.any(Function),
        'items'
      );
      
      expect(mockMetricsService.createObservableGauge).toHaveBeenCalledWith(
        'business.orders.active.current',
        'Current number of active orders',
        expect.any(Function),
        'orders'
      );
    });
  });
  
  describe('recordProductView', () => {
    it('should record a product view with the correct attributes', () => {
      // Arrange
      const addSpy = jest.fn();
      (businessMetricsService as any).productViewCounter = { add: addSpy };
      
      // Act
      businessMetricsService.recordProductView('product-123', 'electronics', 'user-456');
      
      // Assert
      expect(addSpy).toHaveBeenCalledWith(1, {
        productId: 'product-123',
        category: 'electronics',
        userId: 'user-456',
      });
    });
    
    it('should handle missing userId', () => {
      // Arrange
      const addSpy = jest.fn();
      (businessMetricsService as any).productViewCounter = { add: addSpy };
      
      // Act
      businessMetricsService.recordProductView('product-123', 'electronics');
      
      // Assert
      expect(addSpy).toHaveBeenCalledWith(1, {
        productId: 'product-123',
        category: 'electronics',
      });
      
      // userId should not be included
      const attributes = addSpy.mock.calls[0][1];
      expect(attributes.userId).toBeUndefined();
    });
    
    it('should handle errors when recording product views', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      (businessMetricsService as any).productViewCounter = {
        add: jest.fn().mockImplementationOnce(() => {
          throw new Error('Test error');
        }),
      };
      
      // Act & Assert
      expect(() => businessMetricsService.recordProductView('product-123', 'electronics')).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
  
  describe('recordOrderCreation', () => {
    it('should record order creation with the correct attributes', () => {
      // Arrange
      const addSpy = jest.fn();
      (businessMetricsService as any).orderCreationCounter = { add: addSpy };
      
      // Act
      businessMetricsService.recordOrderCreation('order-123', 3, 99.99, 'user-456');
      
      // Assert
      expect(addSpy).toHaveBeenCalledWith(1, {
        orderId: 'order-123',
        productCount: 3,
        totalAmount: 99.99,
        userId: 'user-456',
      });
    });
    
    it('should also record the order amount as a separate business metric', () => {
      // Arrange
      const addSpy = jest.fn();
      (businessMetricsService as any).orderCreationCounter = { add: addSpy };
      
      // Act
      businessMetricsService.recordOrderCreation('order-123', 3, 99.99);
      
      // Assert
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'business.orders.amount.total',
        99.99,
        expect.objectContaining({
          orderId: 'order-123',
          productCount: 3,
          totalAmount: 99.99,
        })
      );
    });
  });
  
  describe('recordOrderProcessing', () => {
    it('should record order processing time with the correct attributes', () => {
      // Arrange
      const recordSpy = jest.fn();
      (businessMetricsService as any).orderProcessingTime = { record: recordSpy };
      
      // Act
      businessMetricsService.recordOrderProcessing('order-123', 1500, 'completed');
      
      // Assert
      expect(recordSpy).toHaveBeenCalledWith(1500, {
        orderId: 'order-123',
        status: 'completed',
      });
    });
  });
  
  describe('recordInventoryChange', () => {
    it('should record inventory change with the correct attributes', () => {
      // Act
      businessMetricsService.recordInventoryChange('product-123', 10, 'restock');
      
      // Assert
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'business.product.inventory.change',
        10,
        {
          productId: 'product-123',
          reason: 'restock',
        }
      );
    });
  });
  
  describe('recordCustomMetric', () => {
    it('should record a custom business metric with the correct name and attributes', () => {
      // Act
      businessMetricsService.recordCustomMetric('custom.metric', 42, { attr1: 'value1' });
      
      // Assert
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'business.custom.metric',
        42,
        { attr1: 'value1' }
      );
    });
    
    it('should add the business prefix if not present', () => {
      // Act
      businessMetricsService.recordCustomMetric('custom.metric', 42);
      
      // Assert
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'business.custom.metric',
        42,
        undefined
      );
    });
    
    it('should not add the business prefix if already present', () => {
      // Act
      businessMetricsService.recordCustomMetric('business.custom.metric', 42);
      
      // Assert
      expect(mockMetricsService.recordBusinessMetric).toHaveBeenCalledWith(
        'business.custom.metric',
        42,
        undefined
      );
    });
    
    it('should handle errors when recording custom metrics', () => {
      // Arrange
      const errorSpy = jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
      mockMetricsService.recordBusinessMetric.mockImplementationOnce(() => {
        throw new Error('Test error');
      });
      
      // Act & Assert
      expect(() => businessMetricsService.recordCustomMetric('custom.metric', 42)).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();
    });
  });
});