import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  HttpStatus,
  HttpCode,
  Logger,
  NotFoundException,
  BadRequestException
} from '@nestjs/common';
import { ProductService } from './services/product.service';
import { Product } from './models/product.model';

/**
 * Controller for product-related endpoints
 */
@Controller('products')
export class ProductsController {
  private readonly logger = new Logger(ProductsController.name);
  
  constructor(private readonly productService: ProductService) {}
  
  /**
   * Get all products
   * 
   * @param category Optional category to filter by
   * @returns Array of products
   */
  @Get()
  async getAllProducts(@Query('category') category?: string): Promise<Product[]> {
    this.logger.log(`Getting all products${category ? ` in category: ${category}` : ''}`);
    return this.productService.getAllProducts(category);
  }
  
  /**
   * Get a product by ID
   * 
   * @param id Product ID
   * @returns Product if found
   */
  @Get(':id')
  async getProductById(@Param('id') id: string): Promise<Product> {
    this.logger.log(`Getting product with ID: ${id}`);
    return this.productService.getProductById(id);
  }
  
  /**
   * Create a new product
   * 
   * @param productData Product data
   * @returns Created product
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createProduct(@Body() productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    this.logger.log(`Creating new product: ${productData.name}`);
    
    // Validate required fields
    if (!productData.name || !productData.price) {
      throw new BadRequestException('Product name and price are required');
    }
    
    return this.productService.createProduct(productData);
  }
  
  /**
   * Update an existing product
   * 
   * @param id Product ID
   * @param productData Updated product data
   * @returns Updated product
   */
  @Put(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() productData: Partial<Product>
  ): Promise<Product> {
    this.logger.log(`Updating product with ID: ${id}`);
    
    // Prevent updating ID, createdAt, or updatedAt
    const { id: _, createdAt, updatedAt, ...validData } = productData as any;
    
    return this.productService.updateProduct(id, validData);
  }
  
  /**
   * Delete a product
   * 
   * @param id Product ID
   * @returns Deleted product
   */
  @Delete(':id')
  async deleteProduct(@Param('id') id: string): Promise<Product> {
    this.logger.log(`Deleting product with ID: ${id}`);
    return this.productService.deleteProduct(id);
  }
  
  /**
   * Update product inventory
   * 
   * @param id Product ID
   * @param data Inventory update data
   * @returns Updated product
   */
  @Put(':id/inventory')
  async updateInventory(
    @Param('id') id: string,
    @Body() data: { change: number; reason: string }
  ): Promise<Product> {
    this.logger.log(`Updating inventory for product with ID: ${id}, change: ${data.change}`);
    
    // Validate input
    if (data.change === undefined) {
      throw new BadRequestException('Inventory change amount is required');
    }
    
    if (!data.reason) {
      throw new BadRequestException('Reason for inventory change is required');
    }
    
    return this.productService.updateInventory(id, data.change, data.reason);
  }
}