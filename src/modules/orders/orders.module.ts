import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrderService } from './services/order.service';
import { OrderRepository } from './repositories/order.repository';
import { ProductsModule } from '../products/products.module';

/**
 * Module for order-related functionality
 */
@Module({
  imports: [ProductsModule], // Import ProductsModule to use ProductService
  controllers: [OrdersController],
  providers: [OrderService, OrderRepository],
  exports: [OrderService],
})
export class OrdersModule {}