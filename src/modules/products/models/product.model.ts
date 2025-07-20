/**
 * Product model
 * 
 * This model represents a product in the system.
 */
export class Product {
  /**
   * Unique identifier for the product
   */
  id: string;
  
  /**
   * Name of the product
   */
  name: string;
  
  /**
   * Description of the product
   */
  description: string;
  
  /**
   * Price of the product
   */
  price: number;
  
  /**
   * Category of the product
   */
  category: string;
  
  /**
   * Current inventory level
   */
  inventory: number;
  
  /**
   * Date when the product was created
   */
  createdAt: Date;
  
  /**
   * Date when the product was last updated
   */
  updatedAt: Date;
  
  constructor(partial: Partial<Product>) {
    Object.assign(this, partial);
    
    // Set default values for dates if not provided
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    
    if (!this.updatedAt) {
      this.updatedAt = new Date();
    }
  }
}