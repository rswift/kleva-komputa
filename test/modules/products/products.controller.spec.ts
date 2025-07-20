import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from '../../../src/modules/products/products.controller';
import { ProductService } from '../../../src/modules/products/services/product.service';
import { Product } from '../../../src/modules/products/models/product.model';
import { BadRequestException, NotFoundException } from '@nestjs/common';

// Mock the ProductService
const mockProductService = {
  getAllProducts: jest.fn(),
  getProductById: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  updateInventory: jest.fn(),
};

describe('ProductsController', () => {
  let controller: ProductsController;
  let service: ProductService;
  
  beforeEach(async () => {
    // Create a testing module with mocked dependencies
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: ProductService,
          useValue: mockProductService,
        },
      ],
    }).compile();
    
    // Get the controller and service from the testing module
    controller = module.get<ProductsController>(ProductsController);
    service = module.get<ProductService>(ProductService);
    
    // Reset mocks before each test
    jest.clearAllMocks();
  });
  
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
  
  describe('getAllProducts', () => {
    it('should return an array of products', async () => {
      // Arrange
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Test Product 1',
          description: 'Test Description 1',
          price: 10.99,
          category: 'test',
          inventory: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          name: 'Test Product 2',
          description: 'Test Description 2',
          price: 20.99,
          category: 'test',
          inventory: 50,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);
      
      // Act
      const result = await controller.getAllProducts();
      
      // Assert
      expect(result).toBe(mockProducts);
      expect(mockProductService.getAllProducts).toHaveBeenCalledWith(undefined);
    });
    
    it('should filter products by category', async () => {
      // Arrange
      const mockProducts: Product[] = [
        {
          id: '1',
          name: 'Test Product 1',
          description: 'Test Description 1',
          price: 10.99,
          category: 'electronics',
          inventory: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];
      
      mockProductService.getAllProducts.mockResolvedValue(mockProducts);
      
      // Act
      const result = await controller.getAllProducts('electronics');
      
      // Assert
      expect(result).toBe(mockProducts);
      expect(mockProductService.getAllProducts).toHaveBeenCalledWith('electronics');
    });
  });
  
  describe('getProductById', () => {
    it('should return a product by ID', async () => {
      // Arrange
      const mockProduct: Product = {
        id: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 10.99,
        category: 'test',
        inventory: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockProductService.getProductById.mockResolvedValue(mockProduct);
      
      // Act
      const result = await controller.getProductById('1');
      
      // Assert
      expect(result).toBe(mockProduct);
      expect(mockProductService.getProductById).toHaveBeenCalledWith('1');
    });
    
    it('should throw NotFoundException when product is not found', async () => {
      // Arrange
      mockProductService.getProductById.mockRejectedValue(new NotFoundException('Product not found'));
      
      // Act & Assert
      await expect(controller.getProductById('999')).rejects.toThrow(NotFoundException);
    });
  });
  
  describe('createProduct', () => {
    it('should create a new product', async () => {
      // Arrange
      const productData = {
        name: 'New Product',
        description: 'New Description',
        price: 15.99,
        category: 'new',
        inventory: 200,
      };
      
      const mockProduct: Product = {
        ...productData,
        id: '3',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockProductService.createProduct.mockResolvedValue(mockProduct);
      
      // Act
      const result = await controller.createProduct(productData);
      
      // Assert
      expect(result).toBe(mockProduct);
      expect(mockProductService.createProduct).toHaveBeenCalledWith(productData);
    });
    
    it('should throw BadRequestException when required fields are missing', async () => {
      // Arrange
      const invalidProductData = {
        description: 'Invalid Product',
        // Missing name and price
      };
      
      // Act & Assert
      await expect(controller.createProduct(invalidProductData as any)).rejects.toThrow(BadRequestException);
      expect(mockProductService.createProduct).not.toHaveBeenCalled();
    });
  });
  
  describe('updateProduct', () => {
    it('should update an existing product', async () => {
      // Arrange
      const updateData = {
        name: 'Updated Product',
        price: 25.99,
      };
      
      const mockProduct: Product = {
        id: '1',
        name: 'Updated Product',
        description: 'Test Description',
        price: 25.99,
        category: 'test',
        inventory: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockProductService.updateProduct.mockResolvedValue(mockProduct);
      
      // Act
      const result = await controller.updateProduct('1', updateData);
      
      // Assert
      expect(result).toBe(mockProduct);
      expect(mockProductService.updateProduct).toHaveBeenCalledWith('1', updateData);
    });
    
    it('should prevent updating ID, createdAt, or updatedAt', async () => {
      // Arrange
      const updateData = {
        id: 'new-id',
        name: 'Updated Product',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const mockProduct: Product = {
        id: '1',
        name: 'Updated Product',
        description: 'Test Description',
        price: 10.99,
        category: 'test',
        inventory: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockProductService.updateProduct.mockResolvedValue(mockProduct);
      
      // Act
      const result = await controller.updateProduct('1', updateData);
      
      // Assert
      expect(result).toBe(mockProduct);
      // Should only pass the name to updateProduct, not id, createdAt, or updatedAt
      expect(mockProductService.updateProduct).toHaveBeenCalledWith('1', { name: 'Updated Product' });
    });
  });
  
  describe('deleteProduct', () => {
    it('should delete a product', async () => {
      // Arrange
      const mockProduct: Product = {
        id: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 10.99,
        category: 'test',
        inventory: 100,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockProductService.deleteProduct.mockResolvedValue(mockProduct);
      
      // Act
      const result = await controller.deleteProduct('1');
      
      // Assert
      expect(result).toBe(mockProduct);
      expect(mockProductService.deleteProduct).toHaveBeenCalledWith('1');
    });
  });
  
  describe('updateInventory', () => {
    it('should update product inventory', async () => {
      // Arrange
      const inventoryData = {
        change: 50,
        reason: 'restock',
      };
      
      const mockProduct: Product = {
        id: '1',
        name: 'Test Product',
        description: 'Test Description',
        price: 10.99,
        category: 'test',
        inventory: 150, // Updated inventory
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      mockProductService.updateInventory.mockResolvedValue(mockProduct);
      
      // Act
      const result = await controller.updateInventory('1', inventoryData);
      
      // Assert
      expect(result).toBe(mockProduct);
      expect(mockProductService.updateInventory).toHaveBeenCalledWith('1', 50, 'restock');
    });
    
    it('should throw BadRequestException when change is missing', async () => {
      // Arrange
      const invalidData = {
        reason: 'restock',
        // Missing change
      };
      
      // Act & Assert
      await expect(controller.updateInventory('1', invalidData as any)).rejects.toThrow(BadRequestException);
      expect(mockProductService.updateInventory).not.toHaveBeenCalled();
    });
    
    it('should throw BadRequestException when reason is missing', async () => {
      // Arrange
      const invalidData = {
        change: 50,
        // Missing reason
      };
      
      // Act & Assert
      await expect(controller.updateInventory('1', invalidData as any)).rejects.toThrow(BadRequestException);
      expect(mockProductService.updateInventory).not.toHaveBeenCalled();
    });
  });
});