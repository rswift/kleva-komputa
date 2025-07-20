# Sequence Diagrams

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic), Updated by: Claude 3.5 Sonnet (Anthropic)  
> Date: 19/07/2025  
> Version: 2.0  
> AI/LLM Details: Originally created using Claude 3 Opus, updated after refactoring by Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)

## Refactoring Notice

**Important**: These sequence diagrams have been updated to reflect the simplified architecture documented in [`../40_REFACTOR.md`](../40_REFACTOR.md). The original complex service interactions have been streamlined.

This document contains sequence diagrams for key operations in the refactored NestJS OpenTelemetry POC application.

## Simplified API Request Flow with Metrics Recording

The following diagram illustrates the simplified flow of an API request through the refactored application:

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant TelemetryInterceptor
    participant Controller
    participant Service
    participant Repository
    participant TelemetryService
    participant PrometheusExporter

    Client->>NestJS: HTTP Request
    NestJS->>TelemetryInterceptor: intercept(request)
    TelemetryInterceptor->>TelemetryInterceptor: Record start time
    TelemetryInterceptor->>Controller: route request
    Controller->>Service: call service method
    Service->>Repository: data operation
    Repository-->>Service: return data
    Service->>TelemetryService: recordProductView() [if applicable]
    Service-->>Controller: return result
    Controller-->>TelemetryInterceptor: return response
    TelemetryInterceptor->>TelemetryInterceptor: Calculate duration
    TelemetryInterceptor->>TelemetryService: recordHttpRequest()
    TelemetryService->>TelemetryService: httpRequests.add() & httpDuration.record()
    TelemetryInterceptor-->>NestJS: return response
    NestJS-->>Client: HTTP Response
    
    Note over TelemetryService,PrometheusExporter: Automatic export via OpenTelemetry SDK
    TelemetryService->>PrometheusExporter: metrics available at /metrics
```

## Simplified Error Handling Flow

The following diagram illustrates the simplified error handling in the refactored application:

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant TelemetryInterceptor
    participant Controller
    participant Service
    participant TelemetryService

    Client->>NestJS: HTTP Request
    NestJS->>TelemetryInterceptor: intercept(request)
    TelemetryInterceptor->>TelemetryInterceptor: Record start time
    TelemetryInterceptor->>Controller: route request
    Controller->>Service: call service method
    Service--xController: throw exception
    Controller--xTelemetryInterceptor: propagate exception
    TelemetryInterceptor->>TelemetryInterceptor: Calculate duration
    TelemetryInterceptor->>TelemetryService: recordHttpRequest() with error status
    TelemetryService->>TelemetryService: httpRequests.add() with error status
    TelemetryInterceptor-->>NestJS: propagate exception
    NestJS-->>Client: HTTP Error Response (handled by NestJS)
    
    Note over TelemetryService: Error metrics recorded automatically via interceptor
```

## Simplified OpenTelemetry Initialisation Flow

The following diagram illustrates the simplified OpenTelemetry SDK initialisation:

```mermaid
sequenceDiagram
    participant Main
    participant AppModule
    participant TelemetryModule
    participant TelemetryService
    participant NodeSDK
    participant PrometheusExporter

    Main->>Main: bootstrap()
    Main->>AppModule: create application
    AppModule->>TelemetryModule: import module
    TelemetryModule->>TelemetryService: create service
    TelemetryService->>TelemetryService: constructor() - read env vars
    TelemetryService->>TelemetryService: create pre-configured instruments
    AppModule-->>Main: return application
    Main->>TelemetryService: onModuleInit()
    TelemetryService->>NodeSDK: create SDK with simple config
    TelemetryService->>PrometheusExporter: configure exporter
    TelemetryService->>NodeSDK: start()
    NodeSDK-->>TelemetryService: SDK started
    TelemetryService-->>Main: initialisation complete
    Main->>Main: app.listen()
    
    Note over TelemetryService: All configuration done in constructor - no complex factory pattern
```

## Simplified Product View Flow with Business Metrics

The following diagram illustrates the simplified product view flow:

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant ProductService
    participant ProductRepository
    participant TelemetryService

    Client->>Controller: GET /api/products/:id
    Controller->>ProductService: getProductById(id)
    ProductService->>ProductService: simulateLatency()
    ProductService->>ProductRepository: findById(id)
    ProductRepository-->>ProductService: return product
    ProductService->>TelemetryService: recordProductView(id, category)
    TelemetryService->>TelemetryService: productViews.add(1, {productId, category})
    ProductService-->>Controller: return product
    Controller-->>Client: return product JSON
    
    Note over TelemetryService: Direct OpenTelemetry counter usage - no wrapper layers
```

## Simplified Order Creation Flow with Business Metrics

The following diagram illustrates the simplified order creation flow:

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant OrderService
    participant OrderRepository
    participant ProductService
    participant TelemetryService

    Client->>Controller: POST /api/orders
    Controller->>Controller: Validate order data
    Controller->>OrderService: createOrder(orderData)
    OrderService->>OrderService: simulateLatency()
    OrderService->>OrderRepository: create(orderData)
    OrderRepository-->>OrderService: return order
    
    loop For each order item
        OrderService->>ProductService: updateInventory(productId, -quantity, 'order_created')
        Note over ProductService: Simplified logging instead of complex metrics
    end
    
    OrderService->>TelemetryService: recordOrderCreation(orderId, itemCount, totalAmount)
    TelemetryService->>TelemetryService: orderCreated.add(1, {orderId, productCount, totalAmount})
    
    OrderService-->>Controller: return order
    Controller-->>Client: return order JSON
    
    Note over TelemetryService: Single service call - no service layer complexity
```

## Simplified Order Processing Flow

The following diagram illustrates the simplified order processing flow:

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant OrderService
    participant OrderRepository

    Client->>Controller: PUT /api/orders/:id/process
    Controller->>OrderService: processOrder(id)
    OrderService->>OrderRepository: findById(id)
    OrderRepository-->>OrderService: return order
    OrderService->>OrderService: Check if order can be processed
    
    OrderService->>OrderService: Record start time
    OrderService->>OrderService: simulateProcessingTime(order)
    OrderService->>OrderService: Calculate processing time
    
    OrderService->>OrderRepository: updateStatus(id, COMPLETED)
    OrderRepository-->>OrderService: return updated order
    
    Note over OrderService: Simple logging instead of complex metrics recording
    OrderService->>OrderService: logger.log('Processed order in Xms')
    
    OrderService-->>Controller: return updated order
    Controller-->>Client: return updated order JSON
```

## Key Changes in Sequence Diagrams

The refactored sequence diagrams show significant simplifications:

1. **Single Service**: `TelemetryService` replaces `OpenTelemetryService`, `MetricsService`, and `BusinessMetricsService`
2. **Direct API Usage**: Metrics are recorded directly using OpenTelemetry instruments
3. **Simplified Error Handling**: Errors are handled through the interceptor rather than a separate filter
4. **Reduced Complexity**: Fewer service calls and simpler interaction patterns
5. **Focus on Core Metrics**: Only essential business metrics are recorded

These changes result in:

- **Faster execution** due to fewer service layer calls
- **Easier debugging** with simpler call stacks
- **Better maintainability** with clearer interaction patterns
- **Reduced overhead** from eliminated wrapper methods
