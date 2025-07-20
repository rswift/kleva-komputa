import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductService } from './services/product.service';
import { ProductRepository } from './repositories/product.repository';

/**
 * Module for product-related functionality
 */
@Module({
  controllers: [ProductsController],
  providers: [ProductService, ProductRepository],
  exports: [ProductService],
})
export class ProductsModule {}