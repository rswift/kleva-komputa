/**
 * Order status enum
 */
export enum OrderStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

/**
 * Order item model
 */
export interface OrderItem {
  /**
   * Product ID
   */
  productId: string;
  
  /**
   * Product name
   */
  productName: string;
  
  /**
   * Quantity ordered
   */
  quantity: number;
  
  /**
   * Price per unit
   */
  unitPrice: number;
}

/**
 * Order model
 */
export class Order {
  /**
   * Unique identifier for the order
   */
  id: string;
  
  /**
   * Items in the order
   */
  items: OrderItem[];
  
  /**
   * Total amount of the order
   */
  totalAmount: number;
  
  /**
   * Status of the order
   */
  status: OrderStatus;
  
  /**
   * Customer ID (optional)
   */
  customerId?: string;
  
  /**
   * Date when the order was created
   */
  createdAt: Date;
  
  /**
   * Date when the order was last updated
   */
  updatedAt: Date;
  
  /**
   * Date when the order was processed (if applicable)
   */
  processedAt?: Date;
  
  constructor(partial: Partial<Order>) {
    Object.assign(this, partial);
    
    // Set default values for dates if not provided
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    
    if (!this.updatedAt) {
      this.updatedAt = new Date();
    }
    
    // Set default status if not provided
    if (!this.status) {
      this.status = OrderStatus.PENDING;
    }
    
    // Calculate total amount if not provided
    if (!this.totalAmount && this.items) {
      this.totalAmount = this.items.reduce(
        (total, item) => total + (item.quantity * item.unitPrice),
        0
      );
    }
  }
}