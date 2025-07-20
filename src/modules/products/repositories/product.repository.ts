import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Product } from '../models/product.model';
import { v4 as uuidv4 } from 'uuid';

/**
 * Repository for managing products
 * 
 * This is a simple in-memory repository for products.
 * In a real application, this would be replaced with a database repository.
 */
@Injectable()
export class ProductRepository {
  private readonly logger = new Logger(ProductRepository.name);
  private products: Map<string, Product> = new Map();
  
  constructor() {
    // Initialize with some sample products
    this.createSampleProducts();
    this.logger.log(`Initialized product repository with ${this.products.size} sample products`);
  }
  
  /**
   * Find all products
   * 
   * @param category Optional category to filter by
   * @returns Array of products
   */
  async findAll(category?: string): Promise<Product[]> {
    // Convert Map values to array
    let products = Array.from(this.products.values());
    
    // Filter by category if provided
    if (category) {
      products = products.filter(product => product.category === category);
    }
    
    return products;
  }
  
  /**
   * Find a product by ID
   * 
   * @param id Product ID
   * @returns Product if found
   * @throws NotFoundException if product not found
   */
  async findById(id: string): Promise<Product> {
    const product = this.products.get(id);
    
    if (!product) {
      throw new NotFoundException(`Product with ID ${id} not found`);
    }
    
    return product;
  }
  
  /**
   * Create a new product
   * 
   * @param productData Product data
   * @returns Created product
   */
  async create(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<Product> {
    const id = uuidv4();
    const now = new Date();
    
    const product = new Product({
      ...productData,
      id,
      createdAt: now,
      updatedAt: now,
    });
    
    this.products.set(id, product);
    this.logger.log(`Created product with ID ${id}`);
    
    return product;
  }
  
  /**
   * Update an existing product
   * 
   * @param id Product ID
   * @param productData Updated product data
   * @returns Updated product
   * @throws NotFoundException if product not found
   */
  async update(id: string, productData: Partial<Product>): Promise<Product> {
    const existingProduct = await this.findById(id);
    
    const updatedProduct = new Product({
      ...existingProduct,
      ...productData,
      id, // Ensure ID doesn't change
      createdAt: existingProduct.createdAt, // Preserve creation date
      updatedAt: new Date(), // Update the updatedAt timestamp
    });
    
    this.products.set(id, updatedProduct);
    this.logger.log(`Updated product with ID ${id}`);
    
    return updatedProduct;
  }
  
  /**
   * Delete a product
   * 
   * @param id Product ID
   * @returns Deleted product
   * @throws NotFoundException if product not found
   */
  async delete(id: string): Promise<Product> {
    const product = await this.findById(id);
    
    this.products.delete(id);
    this.logger.log(`Deleted product with ID ${id}`);
    
    return product;
  }
  
  /**
   * Update product inventory
   * 
   * @param id Product ID
   * @param change Change in inventory (positive for increase, negative for decrease)
   * @returns Updated product
   * @throws NotFoundException if product not found
   */
  async updateInventory(id: string, change: number): Promise<Product> {
    const product = await this.findById(id);
    
    const newInventory = product.inventory + change;
    
    // Ensure inventory doesn't go below zero
    if (newInventory < 0) {
      throw new Error(`Cannot reduce inventory below zero for product ${id}`);
    }
    
    return this.update(id, { inventory: newInventory });
  }
  
  /**
   * Create sample products for testing
   */
  private createSampleProducts(): void {
    const sampleProducts: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>[] = [
      {
        name: 'Laptop',
        description: 'High-performance laptop with 16GB RAM and 512GB SSD',
        price: 1299.99,
        category: 'electronics',
        inventory: 50,
      },
      {
        name: 'Smartphone',
        description: 'Latest smartphone with 128GB storage and 5G connectivity',
        price: 799.99,
        category: 'electronics',
        inventory: 100,
      },
      {
        name: 'Headphones',
        description: 'Noise-cancelling wireless headphones',
        price: 249.99,
        category: 'electronics',
        inventory: 75,
      },
      {
        name: 'Coffee Maker',
        description: 'Programmable coffee maker with thermal carafe',
        price: 89.99,
        category: 'appliances',
        inventory: 30,
      },
      {
        name: 'Blender',
        description: 'High-speed blender for smoothies and food processing',
        price: 129.99,
        category: 'appliances',
        inventory: 25,
      },
    ];
    
    // Create each sample product
    sampleProducts.forEach(productData => {
      const id = uuidv4();
      const now = new Date();
      
      const product = new Product({
        ...productData,
        id,
        createdAt: now,
        updatedAt: now,
      });
      
      this.products.set(id, product);
    });
  }
}