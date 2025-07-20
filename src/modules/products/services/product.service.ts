import { Injectable, Logger } from '@nestjs/common';
import { ProductRepository } from '../repositories/product.repository';
import { Product } from '../models/product.model';
import { BusinessMetricsService } from '../../../common/telemetry/business-metrics';

/**
 * Service for managing products
 * 
 * This service provides business logic for product operations and
 * records business metrics for product-related activities.
 */
@Injectable()
export class ProductService {
  private readonly logger = new Logger(ProductService.name);
  
  constructor(
    private readonly productRepository: ProductRepository,
    private readonly businessMetrics: BusinessMetricsService,
  ) {}
  
  /**
   * Get all products
   * 
   * @param category Optional category to filter by
   * @returns Array of products
   */
  async getAllProducts(category?: string): Promise<Product[]> {
    // Add simulated latency to mimic database query
    await this.simulateLatency(50, 150);
    
    const products = await this.productRepository.findAll(category);
    
    // Record metrics for product listing
    this.businessMetrics.recordCustomMetric(
      'business.product.list.count',
      products.length,
      { category: category || 'all' }
    );
    
    return products;
  }
  
  /**
   * Get a product by ID
   * 
   * @param id Product ID
   * @returns Product if found
   */
  async getProductById(id: string): Promise<Product> {
    // Add simulated latency to mimic database query
    await this.simulateLatency(20, 100);
    
    const product = await this.productRepository.findById(id);
    
    // Record metrics for product view
    this.businessMetrics.recordProductView(
      product.id,
      product.category
    );
    
    return product;
  }
  
  /**
   * Create a new product
   * 
   * @param productData Product data
   * @returns Created product
   */
  async createProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    // Add simulated latency to mimic database operation
    await this.simulateLatency(100, 300);
    
    const product = await this.productRepository.create(productData);
    
    // Record metrics for product creation
    this.businessMetrics.recordCustomMetric(
      'business.product.created.count',
      1,
      {
        category: product.category,
        price: product.price,
      }
    );
    
    // Record inventory metrics
    this.businessMetrics.recordInventoryChange(
      product.id,
      product.inventory,
      'initial_stock'
    );
    
    return product;
  }
  
  /**
   * Update an existing product
   * 
   * @param id Product ID
   * @param productData Updated product data
   * @returns Updated product
   */
  async updateProduct(id: string, productData: Partial<Product>): Promise<Product> {
    // Add simulated latency to mimic database operation
    await this.simulateLatency(80, 250);
    
    const oldProduct = await this.productRepository.findById(id);
    const updatedProduct = await this.productRepository.update(id, productData);
    
    // Record metrics for product update
    this.businessMetrics.recordCustomMetric(
      'business.product.updated.count',
      1,
      {
        category: updatedProduct.category,
      }
    );
    
    // Record inventory change if inventory was updated
    if (productData.inventory !== undefined && productData.inventory !== oldProduct.inventory) {
      const change = productData.inventory - oldProduct.inventory;
      
      this.businessMetrics.recordInventoryChange(
        id,
        change,
        'manual_adjustment'
      );
    }
    
    return updatedProduct;
  }
  
  /**
   * Delete a product
   * 
   * @param id Product ID
   * @returns Deleted product
   */
  async deleteProduct(id: string): Promise<Product> {
    // Add simulated latency to mimic database operation
    await this.simulateLatency(150, 350);
    
    const product = await this.productRepository.delete(id);
    
    // Record metrics for product deletion
    this.businessMetrics.recordCustomMetric(
      'business.product.deleted.count',
      1,
      {
        category: product.category,
      }
    );
    
    return product;
  }
  
  /**
   * Update product inventory
   * 
   * @param id Product ID
   * @param change Change in inventory (positive for increase, negative for decrease)
   * @param reason Reason for the inventory change
   * @returns Updated product
   */
  async updateInventory(id: string, change: number, reason: string): Promise<Product> {
    // Add simulated latency to mimic database operation
    await this.simulateLatency(50, 150);
    
    const updatedProduct = await this.productRepository.updateInventory(id, change);
    
    // Record inventory change metrics
    this.businessMetrics.recordInventoryChange(
      id,
      change,
      reason
    );
    
    return updatedProduct;
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
}