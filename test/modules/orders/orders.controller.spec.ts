import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from '../../../src/modules/orders/orders.controller';
import { OrderService } from '../../../src/modules/orders/services/order.service';
import { Order, OrderStatus, OrderItem } from '../../../src/modules/orders/models/order.model';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock the OrderService
const mockOrderService = {
  getAllOrders: jest.fn(),
  getOrderById: jest.fn(),
  createOrder: jest.fn(),
  processOrder: jest.fn(),
  cancelOrder: jest.fn(),
};

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrderService;
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrderService,
          useValue: mockOrderService,
        },
      ],
    }).compile();
    
    // Get the controller and service from the testing module
    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrderService>(OrderService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  
  describe('getAllOrders', () => {
    it('should return an array of orders', async () => {
      // Arrange
      const mockOrders: Order[] = [
        {
          id: '1',
          items: [
            { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 10.99 },
          ],
          totalAmount: 21.98,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          items: [
            { productId: 'p2', productName: 'Product 2', quantity: 1, unitPrice: 20.99 },
          ],
          totalAmount: 20.99,
          status: OrderStatus.COMPLETED,
          createdAt: new Date(),
          updatedAt: new Date(),
          processedAt: new Date(),
        },
      ];
      
      mockOrderService.getAllOrders.mockResolvedValue(mockOrders);
      
      // Act
      const result = await controller.getAllOrders();
      
      // Assert
      expect(result).toBe(mockOrders);
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith(undefined);
    });
    
    it('should filter orders by status', async () => {
      // Arrange
      const mockOrders: Order[] = [
        {
          id: '1',
          items: [
            { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 10.99 },
          ],
          totalAmount: 21.98,
          status: OrderStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockOrderService.getAllOrders.mockResolvedValue(mockOrders);
      
      // Act
      const result = await controller.getAllOrders(OrderStatus.PENDING);
      
      // Assert
      expect(result).toBe(mockOrders);
      expect(mockOrderService.getAllOrders).toHaveBeenCalledWith(OrderStatus.PENDING);
    });
  });
  
  describe('getOrderById', () => {
    it('should return an order by ID', async () => {
      // Arrange
      const mockOrder: Order = {
        id: '1',
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 10.99 },
        ],
        totalAmount: 21.98,
        status: OrderStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockOrderService.getOrderById.mockResolvedValue(mockOrder);
      
      // Act
      const result = await controller.getOrderById('1');
      
      // Assert
      expect(result).toBe(mockOrder);
      expect(mockOrderService.getOrderById).toHaveBeenCalledWith('1');
    });
    
    it('should throw NotFoundException when order is not found', async () => {
      // Arrange
      mockOrderService.getOrderById.mockRejectedValue(new NotFoundException('Order not found'));
      
      // Act & Assert
      await expect(controller.getOrderById('999')).rejects.toThrow(NotFoundException);
    });
  });
  
  describe('createOrder', () => {
    it('should create a new order', async () => {
      // Arrange
      const orderData = {
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 10.99 },
        ],
        customerId: 'c1',
      };
      
      const mockOrder: Order = {
        id: '1',
        items: orderData.items,
        totalAmount: 21.98,
        status: OrderStatus.PENDING,
        customerId: 'c1',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockOrderService.createOrder.mockResolvedValue(mockOrder);
      
      // Act
      const result = await controller.createOrder(orderData);
      
      // Assert
      expect(result).toBe(mockOrder);
      expect(mockOrderService.createOrder).toHaveBeenCalledWith(orderData);
    });
    
    it('should throw BadRequestException when items are missing', async () => {
      // Arrange
      const invalidOrderData = {
        customerId: 'c1',
        // Missing items
      };
      
      // Act & Assert
      await expect(controller.createOrder(invalidOrderData as any)).rejects.toThrow(BadRequestException);
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });
    
    it('should throw BadRequestException when items array is empty', async () => {
      // Arrange
      const invalidOrderData = {
        items: [],
        customerId: 'c1',
      };
      
      // Act & Assert
      await expect(controller.createOrder(invalidOrderData)).rejects.toThrow(BadRequestException);
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });
    
    it('should throw BadRequestException when item is missing required fields', async () => {
      // Arrange
      const invalidOrderData = {
        items: [
          { productId: 'p1', productName: 'Product 1' }, // Missing quantity and unitPrice
        ],
        customerId: 'c1',
      };
      
      // Act & Assert
      await expect(controller.createOrder(invalidOrderData as any)).rejects.toThrow(BadRequestException);
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });
    
    it('should throw BadRequestException when quantity is not positive', async () => {
      // Arrange
      const invalidOrderData = {
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 0, unitPrice: 10.99 },
        ],
        customerId: 'c1',
      };
      
      // Act & Assert
      await expect(controller.createOrder(invalidOrderData)).rejects.toThrow(BadRequestException);
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });
    
    it('should throw BadRequestException when unitPrice is not positive', async () => {
      // Arrange
      const invalidOrderData = {
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 0 },
        ],
        customerId: 'c1',
      };
      
      // Act & Assert
      await expect(controller.createOrder(invalidOrderData)).rejects.toThrow(BadRequestException);
      expect(mockOrderService.createOrder).not.toHaveBeenCalled();
    });
  });
  
  describe('processOrder', () => {
    it('should process an order', async () => {
      // Arrange
      const mockOrder: Order = {
        id: '1',
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 10.99 },
        ],
        totalAmount: 21.98,
        status: OrderStatus.COMPLETED, // Updated status
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: new Date(), // Added processedAt
      };
      
      mockOrderService.processOrder.mockResolvedValue(mockOrder);
      
      // Act
      const result = await controller.processOrder('1');
      
      // Assert
      expect(result).toBe(mockOrder);
      expect(mockOrderService.processOrder).toHaveBeenCalledWith('1');
    });
    
    it('should throw BadRequestException when order cannot be processed', async () => {
      // Arrange
      mockOrderService.processOrder.mockRejectedValue(new BadRequestException('Cannot process order'));
      
      // Act & Assert
      await expect(controller.processOrder('1')).rejects.toThrow(BadRequestException);
    });
  });
  
  describe('cancelOrder', () => {
    it('should cancel an order', async () => {
      // Arrange
      const mockOrder: Order = {
        id: '1',
        items: [
          { productId: 'p1', productName: 'Product 1', quantity: 2, unitPrice: 10.99 },
        ],
        totalAmount: 21.98,
        status: OrderStatus.CANCELLED, // Updated status
        createdAt: new Date(),
        updatedAt: new Date(),
        processedAt: new Date(), // Added processedAt
      };
      
      mockOrderService.cancelOrder.mockResolvedValue(mockOrder);
      
      // Act
      const result = await controller.cancelOrder('1');
      
      // Assert
      expect(result).toBe(mockOrder);
      expect(mockOrderService.cancelOrder).toHaveBeenCalledWith('1');
    });
    
    it('should throw BadRequestException when order cannot be cancelled', async () => {
      // Arrange
      mockOrderService.cancelOrder.mockRejectedValue(new BadRequestException('Cannot cancel order'));
      
      // Act & Assert
      await expect(controller.cancelOrder('1')).rejects.toThrow(BadRequestException);
    });
  });
});