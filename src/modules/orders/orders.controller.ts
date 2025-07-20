import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query, 
  HttpStatus,
  HttpCode,
  Logger,
  BadRequestException
} from '@nestjs/common';
import { OrderService } from './services/order.service';
import { Order, OrderStatus, OrderItem } from './models/order.model';

/**
 * Controller for order-related endpoints
 */
@Controller('orders')
export class OrdersController {
  private readonly logger = new Logger(OrdersController.name);
  
  constructor(private readonly orderService: OrderService) {}
  
  /**
   * Get all orders
   * 
   * @param status Optional status to filter by
   * @returns Array of orders
   */
  @Get()
  async getAllOrders(@Query('status') status?: OrderStatus): Promise<Order[]> {
    this.logger.log(`Getting all orders${status ? ` with status: ${status}` : ''}`);
    return this.orderService.getAllOrders(status);
  }
  
  /**
   * Get an order by ID
   * 
   * @param id Order ID
   * @returns Order if found
   */
  @Get(':id')
  async getOrderById(@Param('id') id: string): Promise<Order> {
    this.logger.log(`Getting order with ID: ${id}`);
    return this.orderService.getOrderById(id);
  }
  
  /**
   * Create a new order
   * 
   * @param orderData Order data
   * @returns Created order
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(@Body() orderData: {
    items: OrderItem[];
    customerId?: string;
  }): Promise<Order> {
    this.logger.log(`Creating new order with ${orderData.items?.length || 0} items`);
    
    // Validate required fields
    if (!orderData.items || orderData.items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }
    
    // Validate each item
    for (const item of orderData.items) {
      if (!item.productId || !item.productName || !item.quantity || !item.unitPrice) {
        throw new BadRequestException('Each order item must have productId, productName, quantity, and unitPrice');
      }
      
      if (item.quantity <= 0) {
        throw new BadRequestException('Item quantity must be greater than zero');
      }
      
      if (item.unitPrice <= 0) {
        throw new BadRequestException('Item unit price must be greater than zero');
      }
    }
    
    return this.orderService.createOrder(orderData);
  }
  
  /**
   * Process an order
   * 
   * @param id Order ID
   * @returns Processed order
   */
  @Put(':id/process')
  async processOrder(@Param('id') id: string): Promise<Order> {
    this.logger.log(`Processing order with ID: ${id}`);
    return this.orderService.processOrder(id);
  }
  
  /**
   * Cancel an order
   * 
   * @param id Order ID
   * @returns Cancelled order
   */
  @Put(':id/cancel')
  async cancelOrder(@Param('id') id: string): Promise<Order> {
    this.logger.log(`Cancelling order with ID: ${id}`);
    return this.orderService.cancelOrder(id);
  }
}