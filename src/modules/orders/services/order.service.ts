import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { OrderRepository } from '../repositories/order.repository';
import { Order, OrderStatus, OrderItem } from '../models/order.model';
import { BusinessMetricsService } from '../../../common/telemetry/business-metrics';
import { ProductService } from '../../products/services/product.service';

/**
 * Service for managing orders
 * 
 * This service provides business logic for order operations and
 * records business metrics for order-related activities.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);
  
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly productService: ProductService,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}
  
  /**
   * Get all orders
   * 
   * @param status Optional status to filter by
   * @returns Array of orders
   */
  async getAllOrders(status?: OrderStatus): Promise<Order[]> {
    // Add simulated latency to mimic database query
    await this.simulateLatency(100, 300);
    
    const orders = await this.orderRepository.findAll(status);
    
    // Record metrics for order listing
    this.businessMetrics.recordCustomMetric(
      'business.order.list.count',
      orders.length,
      { status: status || 'all' }
    );
    
    return orders;
  }
  
  /**
   * Get an order by ID
   * 
   * @param id Order ID
   * @returns Order if found
   */
  async getOrderById(id: string): Promise<Order> {
    // Add simulated latency to mimic database query
    await this.simulateLatency(50, 150);
    
    const order = await this.orderRepository.findById(id);
    
    // Record metrics for order view
    this.businessMetrics.recordCustomMetric(
      'business.order.view.count',
      1,
      {
        status: order.status,
        itemCount: order.items.length,
      }
    );
    
    return order;
  }
  
  /**
   * Create a new order
   * 
   * @param orderData Order data
   * @returns Created order
   */
  async createOrder(orderData: {
    items: OrderItem[];
    customerId?: string;
  }): Promise<Order> {
    // Add simulated latency to mimic database operation
    await this.simulateLatency(200, 500);
    
    // Validate order items
    if (!orderData.items || orderData.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }
    
    // Calculate total amount
    const totalAmount = orderData.items.reduce(
      (total, item) => total + (item.quantity * item.unitPrice),
      0
    );
    
    // Create the order
    const order = await this.orderRepository.create({
      items: orderData.items,
      totalAmount,
      status: OrderStatus.PENDING,
      customerId: orderData.customerId,
    });
    
    // Update product inventory for each item
    for (const item of order.items) {
      try {
        await this.productService.updateInventory(
          item.productId,
          -item.quantity, // Decrease inventory
          'order_created'
        );
      } catch (error) {
        this.logger.error(`Failed to update inventory for product ${item.productId}: ${error.message}`);
        // In a real application, we might want to roll back the order or mark it as problematic
      }
    }
    
    // Record metrics for order creation
    this.businessMetrics.recordOrderCreation(
      order.id,
      order.items.length,
      order.totalAmount,
      order.customerId
    );
    
    return order;
  }
  
  /**
   * Process an order
   * 
   * @param id Order ID
   * @returns Processed order
   */
  async processOrder(id: string): Promise<Order> {
    // Get the order
    const order = await this.orderRepository.findById(id);
    
    // Check if the order can be processed
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot process order with status ${order.status}`);
    }
    
    // Add simulated processing time with variable duration
    const startTime = Date.now();
    await this.simulateProcessingTime(order);
    const processingTime = Date.now() - startTime;
    
    // Update the order status
    const processedOrder = await this.orderRepository.updateStatus(id, OrderStatus.COMPLETED);
    
    // Record metrics for order processing
    this.businessMetrics.recordOrderProcessing(
      order.id,
      processingTime,
      OrderStatus.COMPLETED
    );
    
    return processedOrder;
  }
  
  /**
   * Cancel an order
   * 
   * @param id Order ID
   * @returns Cancelled order
   */
  async cancelOrder(id: string): Promise<Order> {
    // Add simulated latency to mimic database operation
    await this.simulateLatency(100, 300);
    
    // Get the order
    const order = await this.orderRepository.findById(id);
    
    // Check if the order can be cancelled
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(`Cannot cancel order with status ${order.status}`);
    }
    
    // Update the order status
    const cancelledOrder = await this.orderRepository.updateStatus(id, OrderStatus.CANCELLED);
    
    // Restore product inventory for each item
    for (const item of order.items) {
      try {
        await this.productService.updateInventory(
          item.productId,
          item.quantity, // Increase inventory
          'order_cancelled'
        );
      } catch (error) {
        this.logger.error(`Failed to restore inventory for product ${item.productId}: ${error.message}`);
      }
    }
    
    // Record metrics for order cancellation
    this.businessMetrics.recordCustomMetric(
      'business.order.cancelled.count',
      1,
      {
        itemCount: order.items.length,
        totalAmount: order.totalAmount,
      }
    );
    
    return cancelledOrder;
  }
  
  /**
   * Simulate latency to mimic real-world conditions
   * 
   * @param min Minimum latency in milliseconds
   * @param max Maximum latency in milliseconds
   */
  private async simulateLatency(min: number, max: number): Promise<void> {
    const latency = Math.floor(Math.random() * (max - min + 1)) + min;
    
    // Occasionally add extra latency to simulate slow operations
    if (Math.random() < 0.05) { // 5% chance
      const extraLatency = Math.floor(Math.random() * 1000) + 500;
      this.logger.debug(`Adding extra latency of ${extraLatency}ms to simulate slow operation`);
      await new Promise(resolve => setTimeout(resolve, extraLatency));
    } else {
      await new Promise(resolve => setTimeout(resolve, latency));
    }
  }
  
  /**
   * Simulate order processing time with variable duration based on order complexity
   * 
   * @param order Order to process
   */
  private async simulateProcessingTime(order: Order): Promise<void> {
    // Base processing time
    let processingTime = 500;
    
    // Add time based on number of items
    processingTime += order.items.length * 100;
    
    // Add time based on total amount
    processingTime += Math.floor(order.totalAmount / 100) * 50;
    
    // Add random variation
    processingTime += Math.floor(Math.random() * 500);
    
    // Occasionally simulate a slow processing operation
    if (Math.random() < 0.1) { // 10% chance
      const extraTime = Math.floor(Math.random() * 2000) + 1000;
      this.logger.debug(`Adding extra processing time of ${extraTime}ms to simulate complex processing`);
      processingTime += extraTime;
    }
    
    this.logger.debug(`Processing order ${order.id} with simulated time of ${processingTime}ms`);
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }
}