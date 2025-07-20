import { Injectable, Logger } from '@nestjs/common';
import { MetricsService } from './metrics.service';

/**
 * Service for recording business-specific metrics
 * 
 * This service provides methods for recording domain-specific metrics
 * that are relevant to the business logic of the application. It uses
 * the MetricsService to record the actual metrics.
 * 
 * The service is designed to be used by business logic components like
 * services and controllers to record metrics that are specific to the
 * business domain.
 */
@Injectable()
export class BusinessMetricsService {
  private readonly logger = new Logger(BusinessMetricsService.name);
  
  // Pre-created metrics for common business operations
  private readonly productViewCounter;
  private readonly orderCreationCounter;
  private readonly orderProcessingTime;
  private readonly productInventoryGauge;
  private readonly activeOrdersGauge;
  
  constructor(private readonly metricsService: MetricsService) {
    // Create counters for product views and order creation
    this.productViewCounter = this.metricsService.createCounter(
      'business.product.views.total',
      'Total number of product views'
    );
    
    this.orderCreationCounter = this.metricsService.createCounter(
      'business.orders.created.total',
      'Total number of orders created'
    );
    
    // Create histogram for order processing time
    this.orderProcessingTime = this.metricsService.createHistogram(
      'business.order.processing.time',
      'Time taken to process an order in milliseconds',
      'ms'
    );
    
    // Create observable gauges for inventory and active orders
    this.productInventoryGauge = this.metricsService.createObservableGauge(
      'business.product.inventory.current',
      'Current product inventory levels',
      () => {
        // In a real application, this would query the database or cache
        // For this POC, we'll return a random value
        return Math.floor(Math.random() * 1000);
      },
      'items'
    );
    
    this.activeOrdersGauge = this.metricsService.createObservableGauge(
      'business.orders.active.current',
      'Current number of active orders',
      () => {
        // In a real application, this would query the database or cache
        // For this POC, we'll return a random value
        return Math.floor(Math.random() * 100);
      },
      'orders'
    );
    
    this.logger.log('Business metrics service initialized');
  }
  
  /**
   * Record a product view
   * 
   * @param productId ID of the viewed product
   * @param category Product category
   * @param userId Optional ID of the user viewing the product
   */
  recordProductView(productId: string, category: string, userId?: string): void {
    try {
      const attributes: Record<string, any> = {
        productId,
        category,
      };
      
      if (userId) {
        attributes.userId = userId;
      }
      
      this.productViewCounter.add(1, attributes);
      this.logger.debug(`Recorded product view: ${productId}`);
    } catch (error) {
      this.logger.error(`Error recording product view: ${error.message}`);
    }
  }
  
  /**
   * Record an order creation
   * 
   * @param orderId ID of the created order
   * @param productCount Number of products in the order
   * @param totalAmount Total amount of the order
   * @param userId Optional ID of the user creating the order
   */
  recordOrderCreation(
    orderId: string,
    productCount: number,
    totalAmount: number,
    userId?: string
  ): void {
    try {
      const attributes: Record<string, any> = {
        orderId,
        productCount,
        totalAmount,
      };
      
      if (userId) {
        attributes.userId = userId;
      }
      
      this.orderCreationCounter.add(1, attributes);
      
      // Also record the order amount as a separate business metric
      this.metricsService.recordBusinessMetric(
        'business.orders.amount.total',
        totalAmount,
        attributes
      );
      
      this.logger.debug(`Recorded order creation: ${orderId}`);
    } catch (error) {
      this.logger.error(`Error recording order creation: ${error.message}`);
    }
  }
  
  /**
   * Record order processing time
   * 
   * @param orderId ID of the processed order
   * @param durationMs Time taken to process the order in milliseconds
   * @param status Status of the order after processing
   */
  recordOrderProcessing(
    orderId: string,
    durationMs: number,
    status: string
  ): void {
    try {
      const attributes: Record<string, any> = {
        orderId,
        status,
      };
      
      this.orderProcessingTime.record(durationMs, attributes);
      this.logger.debug(`Recorded order processing: ${orderId} - ${durationMs}ms`);
    } catch (error) {
      this.logger.error(`Error recording order processing: ${error.message}`);
    }
  }
  
  /**
   * Record inventory change
   * 
   * @param productId ID of the product
   * @param quantity Change in quantity (positive for increase, negative for decrease)
   * @param reason Reason for the inventory change
   */
  recordInventoryChange(
    productId: string,
    quantity: number,
    reason: string
  ): void {
    try {
      const attributes: Record<string, any> = {
        productId,
        reason,
      };
      
      this.metricsService.recordBusinessMetric(
        'business.product.inventory.change',
        quantity,
        attributes
      );
      
      this.logger.debug(`Recorded inventory change: ${productId} - ${quantity}`);
    } catch (error) {
      this.logger.error(`Error recording inventory change: ${error.message}`);
    }
  }
  
  /**
   * Record a custom business metric
   * 
   * This method allows recording any custom business metric that doesn't
   * have a dedicated method in this service.
   * 
   * @param name Name of the metric
   * @param value Value to record
   * @param attributes Optional attributes to associate with the metric
   */
  recordCustomMetric(
    name: string,
    value: number,
    attributes?: Record<string, any>
  ): void {
    try {
      // Ensure the metric name has the business prefix
      const metricName = name.startsWith('business.') ? name : `business.${name}`;
      
      this.metricsService.recordBusinessMetric(metricName, value, attributes);
      this.logger.debug(`Recorded custom business metric: ${metricName} - ${value}`);
    } catch (error) {
      this.logger.error(`Error recording custom business metric: ${error.message}`);
    }
  }
}