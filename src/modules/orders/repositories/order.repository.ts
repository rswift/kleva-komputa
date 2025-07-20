import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Order, OrderStatus } from '../models/order.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for managing orders
 * 
 * This is a simple in-memory repository for orders.
 * In a real application, this would be replaced with a database repository.
 */
@Injectable()
export class OrderRepository {
  private readonly logger = new Logger(OrderRepository.name);
  private orders: Map<string, Order> = new Map();
  
  constructor() {
    this.logger.log('Initialized order repository');
  }
  
  /**
   * Find all orders
   * 
   * @param status Optional status to filter by
   * @returns Array of orders
   */
  async findAll(status?: OrderStatus): Promise<Order[]> {
    // Convert Map values to array
    let orders = Array.from(this.orders.values());
    
    // Filter by status if provided
    if (status) {
      orders = orders.filter(order => order.status === status);
    }
    
    return orders;
  }
  
  /**
   * Find an order by ID
   * 
   * @param id Order ID
   * @returns Order if found
   * @throws NotFoundException if order not found
   */
  async findById(id: string): Promise<Order> {
    const order = this.orders.get(id);
    
    if (!order) {
      throw new NotFoundException(`Order with ID ${id} not found`);
    }
    
    return order;
  }
  
  /**
   * Create a new order
   * 
   * @param orderData Order data
   * @returns Created order
   */
  async create(orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const id = uuidv4();
    const now = new Date();
    
    const order = new Order({
      ...orderData,
      id,
      createdAt: now,
      updatedAt: now,
    });
    
    this.orders.set(id, order);
    this.logger.log(`Created order with ID ${id}`);
    
    return order;
  }
  
  /**
   * Update an existing order
   * 
   * @param id Order ID
   * @param orderData Updated order data
   * @returns Updated order
   * @throws NotFoundException if order not found
   */
  async update(id: string, orderData: Partial<Order>): Promise<Order> {
    const existingOrder = await this.findById(id);
    
    const updatedOrder = new Order({
      ...existingOrder,
      ...orderData,
      id, // Ensure ID doesn't change
      createdAt: existingOrder.createdAt, // Preserve creation date
      updatedAt: new Date(), // Update the updatedAt timestamp
    });
    
    this.orders.set(id, updatedOrder);
    this.logger.log(`Updated order with ID ${id}`);
    
    return updatedOrder;
  }
  
  /**
   * Delete an order
   * 
   * @param id Order ID
   * @returns Deleted order
   * @throws NotFoundException if order not found
   */
  async delete(id: string): Promise<Order> {
    const order = await this.findById(id);
    
    this.orders.delete(id);
    this.logger.log(`Deleted order with ID ${id}`);
    
    return order;
  }
  
  /**
   * Update order status
   * 
   * @param id Order ID
   * @param status New status
   * @returns Updated order
   * @throws NotFoundException if order not found
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findById(id);
    
    const updatedOrder = new Order({
      ...order,
      status,
      updatedAt: new Date(),
      // Set processedAt if the status is COMPLETED or CANCELLED
      processedAt: [OrderStatus.COMPLETED, OrderStatus.CANCELLED].includes(status)
        ? new Date()
        : order.processedAt,
    });
    
    this.orders.set(id, updatedOrder);
    this.logger.log(`Updated order status to ${status} for order with ID ${id}`);
    
    return updatedOrder;
  }
}