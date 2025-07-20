# Sequence Diagrams

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic)  
> Date: 19/07/2025  
> Version: 1.1  
> AI/LLM Details: This document was created using Claude 3 Opus by Anthropic (version 2023-08-22)

This document contains sequence diagrams for key operations in the NestJS OpenTelemetry POC application.

## API Request Flow with Metrics Recording

The following diagram illustrates the flow of an API request through the application, including metrics recording:

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant MetricsInterceptor
    participant Controller
    participant Service
    participant Repository
    participant MetricsService
    participant BusinessMetricsService
    participant OpenTelemetryService
    participant Exporters

    Client->>NestJS: HTTP Request
    NestJS->>MetricsInterceptor: intercept(request)
    MetricsInterceptor->>MetricsInterceptor: Record start time
    MetricsInterceptor->>Controller: route request
    Controller->>Service: call service method
    Service->>Repository: data operation
    Repository-->>Service: return data
    Service->>BusinessMetricsService: recordBusinessMetric()
    BusinessMetricsService->>MetricsService: recordBusinessMetric()
    MetricsService->>OpenTelemetryService: create/update metric
    Service-->>Controller: return result
    Controller-->>MetricsInterceptor: return response
    MetricsInterceptor->>MetricsInterceptor: Calculate duration
    MetricsInterceptor->>MetricsService: recordApiCall()
    MetricsService->>OpenTelemetryService: create/update metric
    MetricsInterceptor-->>NestJS: return response
    NestJS-->>Client: HTTP Response
    
    Note over OpenTelemetryService,Exporters: Periodic export (every 60s by default)
    OpenTelemetryService->>Exporters: export metrics
```

## Error Handling Flow with Metrics Recording

The following diagram illustrates how errors are handled and recorded as metrics:

```mermaid
sequenceDiagram
    participant Client
    participant NestJS
    participant ErrorMetricsFilter
    participant Controller
    participant Service
    participant MetricsService
    participant OpenTelemetryService
    participant Exporters

    Client->>NestJS: HTTP Request
    NestJS->>Controller: route request
    Controller->>Service: call service method
    Service--xController: throw exception
    Controller--xNestJS: propagate exception
    NestJS->>ErrorMetricsFilter: catch(exception)
    ErrorMetricsFilter->>ErrorMetricsFilter: Extract error details
    ErrorMetricsFilter->>MetricsService: recordApiCall() with error
    MetricsService->>OpenTelemetryService: create/update error metric
    ErrorMetricsFilter->>MetricsService: recordBusinessMetric() for error category
    MetricsService->>OpenTelemetryService: create/update error category metric
    ErrorMetricsFilter-->>NestJS: return error response
    NestJS-->>Client: HTTP Error Response
    
    Note over OpenTelemetryService,Exporters: Periodic export (every 60s by default)
    OpenTelemetryService->>Exporters: export metrics
```

## OpenTelemetry Initialisation Flow

The following diagram illustrates how the OpenTelemetry SDK is initialised:

```mermaid
sequenceDiagram
    participant Main
    participant AppModule
    participant OpenTelemetryModule
    participant OpenTelemetryConfigFactory
    participant OpenTelemetryService
    participant NodeSDK
    participant Exporters

    Main->>Main: bootstrap()
    Main->>Main: initialiseHttpInstrumentation()
    Main->>AppModule: create application
    AppModule->>OpenTelemetryModule: forRootAsync()
    OpenTelemetryModule->>OpenTelemetryConfigFactory: createOpenTelemetryOptions()
    OpenTelemetryConfigFactory->>OpenTelemetryConfigFactory: loadTelemetryConfig()
    OpenTelemetryConfigFactory->>OpenTelemetryConfigFactory: validateTelemetryConfig()
    OpenTelemetryConfigFactory-->>OpenTelemetryModule: return options
    OpenTelemetryModule->>OpenTelemetryModule: validateOptions()
    OpenTelemetryModule-->>AppModule: return module
    AppModule-->>Main: return application
    Main->>OpenTelemetryService: onModuleInit()
    OpenTelemetryService->>OpenTelemetryService: initialiseOpenTelemetry()
    OpenTelemetryService->>OpenTelemetryService: configureDiagnosticLogging()
    OpenTelemetryService->>OpenTelemetryService: createTelemetryResource()
    OpenTelemetryService->>OpenTelemetryService: configureMetricReaders()
    OpenTelemetryService->>OpenTelemetryService: configureMetricExporters()
    OpenTelemetryService->>OpenTelemetryService: createMeterProvider()
    OpenTelemetryService->>OpenTelemetryService: configureViews()
    OpenTelemetryService->>OpenTelemetryService: configureHostMetrics()
    OpenTelemetryService->>NodeSDK: create SDK
    OpenTelemetryService->>NodeSDK: start()
    NodeSDK-->>OpenTelemetryService: SDK started
    OpenTelemetryService->>OpenTelemetryService: registerShutdownHandler()
    OpenTelemetryService-->>Main: initialisation complete
    Main->>Main: app.listen()
```

## Product View Flow with Business Metrics

The following diagram illustrates how a product view is processed and recorded as a business metric:

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant ProductService
    participant ProductRepository
    participant BusinessMetricsService
    participant MetricsService
    participant OpenTelemetryService

    Client->>Controller: GET /api/products/:id
    Controller->>ProductService: getProductById(id)
    ProductService->>ProductService: simulateLatency()
    ProductService->>ProductRepository: findById(id)
    ProductRepository-->>ProductService: return product
    ProductService->>BusinessMetricsService: recordProductView(id, category)
    BusinessMetricsService->>BusinessMetricsService: Add attributes
    BusinessMetricsService->>MetricsService: productViewCounter.add(1, attributes)
    MetricsService->>OpenTelemetryService: counter.add(1, attributes)
    ProductService-->>Controller: return product
    Controller-->>Client: return product JSON
```

## Order Creation Flow with Business Metrics

The following diagram illustrates how an order is created and recorded as a business metric:

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant OrderService
    participant OrderRepository
    participant ProductService
    participant BusinessMetricsService
    participant MetricsService

    Client->>Controller: POST /api/orders
    Controller->>Controller: Validate order data
    Controller->>OrderService: createOrder(orderData)
    OrderService->>OrderService: simulateLatency()
    OrderService->>OrderRepository: create(orderData)
    OrderRepository-->>OrderService: return order
    
    loop For each order item
        OrderService->>ProductService: updateInventory(productId, -quantity, 'order_created')
        ProductService->>BusinessMetricsService: recordInventoryChange(productId, -quantity, 'order_created')
    end
    
    OrderService->>BusinessMetricsService: recordOrderCreation(orderId, itemCount, totalAmount)
    BusinessMetricsService->>MetricsService: orderCreationCounter.add(1, attributes)
    BusinessMetricsService->>MetricsService: recordBusinessMetric('business.orders.amount.total', totalAmount, attributes)
    
    OrderService-->>Controller: return order
    Controller-->>Client: return order JSON
```

## Order Processing Flow with Business Metrics

The following diagram illustrates how an order is processed and the processing time is recorded as a business metric:

```mermaid
sequenceDiagram
    participant Client
    participant Controller
    participant OrderService
    participant OrderRepository
    participant BusinessMetricsService
    participant MetricsService

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
    
    OrderService->>BusinessMetricsService: recordOrderProcessing(orderId, processingTime, 'completed')
    BusinessMetricsService->>MetricsService: orderProcessingTime.record(processingTime, attributes)
    
    OrderService-->>Controller: return updated order
    Controller-->>Client: return updated order JSON
```

These sequence diagrams illustrate the key flows in the application, focusing on how metrics are recorded during normal operations and error handling.