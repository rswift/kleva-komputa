# NestJS OpenTelemetry POC

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic)  
> Date: 19/07/2025  
> Version: 1.2  
> AI/LLM Details: This document was created using Claude 3 Opus by Anthropic (version 2023-08-22)

A proof of concept (POC) application demonstrating how OpenTelemetry counters and metrics can be used to instrument a simple API built with NestJS.

## Overview

This project showcases the integration of OpenTelemetry with NestJS to provide comprehensive application monitoring through metrics and counters. The focus is on demonstrating telemetry implementation rather than complex API functionality.

The application implements a simple e-commerce API with products and orders, fully instrumented with OpenTelemetry metrics to track API usage, business operations, and system health.

## Features

- **OpenTelemetry Integration**: Seamless integration with NestJS using a custom module
- **Automatic Instrumentation**: Automatic tracking of HTTP requests, responses, and errors
- **Custom Business Metrics**: Domain-specific metrics for products and orders
- **Multiple Exporters**: Support for Console and Prometheus exporters
- **Environment-based Configuration**: Flexible configuration through environment variables
- **Comprehensive Documentation**: Detailed explanations of design decisions and implementation
- **Test Coverage**: Extensive unit tests for all components

## Project Structure

```plain
nestjs-opentelemetry-poc/
├── src/
│   ├── common/
│   │   ├── filters/           # Global exception filters
│   │   └── telemetry/         # OpenTelemetry integration
│   │       ├── instrumentation/  # Automatic instrumentation
│   │       ├── interceptors/     # Metrics interceptors
│   │       └── interfaces/       # Telemetry interfaces
│   ├── config/                # Application configuration
│   ├── modules/               # Feature modules
│   │   ├── health/           # Health check endpoints
│   │   ├── metrics/          # Metrics endpoints
│   │   ├── orders/           # Orders API
│   │   └── products/         # Products API
│   ├── app.module.ts         # Main application module
│   └── main.ts               # Application entry point
├── test/                     # Test files
├── RATIONALE.md              # Design decisions and rationale
└── README.md                 # This file
```

## Getting Started

### Prerequisites

- Node.js (v16 or later)
- npm or yarn

### Installation

```bash
# Clone the repository
git clone [repository-url]

# Install dependencies
npm install
```

### Configuration

The application can be configured through environment variables:

```bash
# Core configuration
PORT=3000
NODE_ENV=development

# OpenTelemetry configuration
OTEL_SERVICE_NAME=nestjs-opentelemetry-poc
OTEL_SERVICE_VERSION=0.1.0
OTEL_ENABLED=true
OTEL_ENVIRONMENT=development

# Exporter configuration
OTEL_EXPORTER_CONSOLE=true
OTEL_EXPORTER_PROMETHEUS_ENABLED=true
OTEL_EXPORTER_PROMETHEUS_PORT=9464
OTEL_EXPORTER_PROMETHEUS_ENDPOINT=/metrics

# Metrics configuration
OTEL_HOST_METRICS_ENABLED=true
OTEL_API_METRICS_ENABLED=true
OTEL_CUSTOM_METRICS_ENABLED=true

# Resource attributes
OTEL_RESOURCE_ATTRIBUTES=deployment.region=eu-west-1,host.name=my-host

# Export intervals
OTEL_EXPORT_INTERVAL_MS=60000
OTEL_EXPORT_TIMEOUT_MS=30000
```

### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

## API Endpoints

The application provides the following API endpoints:

### Products API

- `GET /api/products` - List all products
  - Query parameters:
    - `category` - Filter products by category
- `GET /api/products/:id` - Get a specific product
- `POST /api/products` - Create a new product
  - Required fields: `name`, `price`
  - Optional fields: `description`, `category`, `inventory`
- `PUT /api/products/:id` - Update a product
- `DELETE /api/products/:id` - Delete a product
- `PUT /api/products/:id/inventory` - Update product inventory
  - Required fields: `change`, `reason`

### Orders API

- `GET /api/orders` - List all orders
  - Query parameters:
    - `status` - Filter orders by status (`pending`, `processing`, `completed`, `cancelled`)
- `GET /api/orders/:id` - Get a specific order
- `POST /api/orders` - Create a new order
  - Required fields: `items` (array of order items)
  - Optional fields: `customerId`
- `PUT /api/orders/:id/process` - Process an order
- `PUT /api/orders/:id/cancel` - Cancel an order

### Health API

- `GET /api/health` - Check application health
  - Returns system information, memory usage, and telemetry status

### Metrics API

- `GET /metrics` - View current metrics in Prometheus format

## Telemetry

### Available Metrics

The application provides the following metrics:

#### API Metrics

- `api.request.count` - Total number of API requests
  - Attributes: `endpoint`, `method`, `status`
- `api.request.duration` - API request duration in milliseconds
  - Attributes: `endpoint`, `method`, `status`
- `api.error.count` - Total number of API errors
  - Attributes: `endpoint`, `method`, `status`, `errorType`
- `api.error.client.count` - Total number of client errors (4xx)
- `api.error.server.count` - Total number of server errors (5xx)
- `api.health.check.count` - Total number of health check requests

#### Business Metrics

- `business.product.views.total` - Total number of product views
  - Attributes: `productId`, `category`, `userId` (optional)
- `business.product.created.count` - Total number of products created
  - Attributes: `category`, `price`
- `business.product.updated.count` - Total number of products updated
  - Attributes: `category`
- `business.product.deleted.count` - Total number of products deleted
  - Attributes: `category`
- `business.product.inventory.current` - Current product inventory levels
- `business.product.inventory.change` - Changes to product inventory
  - Attributes: `productId`, `reason`
- `business.orders.created.total` - Total number of orders created
  - Attributes: `orderId`, `productCount`, `totalAmount`, `userId` (optional)
- `business.orders.amount.total` - Total amount of orders
  - Attributes: `orderId`, `productCount`, `userId` (optional)
- `business.orders.active.current` - Current number of active orders
- `business.order.processing.time` - Time taken to process an order in milliseconds
  - Attributes: `orderId`, `status`
- `business.order.cancelled.count` - Total number of cancelled orders
  - Attributes: `itemCount`, `totalAmount`

### Viewing Metrics

Metrics can be viewed in the following ways:

- **Console Output**: If the console exporter is enabled, metrics will be periodically printed to the console.
- **Prometheus Endpoint**: If the Prometheus exporter is enabled, metrics will be available at the `/metrics` endpoint in Prometheus format.
- **Grafana Integration**: The Prometheus metrics can be visualised in Grafana by configuring a Prometheus data source.

Example Prometheus configuration:

```yaml
scrape_configs:
  - job_name: 'nestjs-opentelemetry-poc'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9464']
```

## OpenTelemetry Module

The application includes a custom OpenTelemetry module that provides:

- **Dynamic Configuration**: Support for both static and dynamic configuration
- **Multiple Registration Methods**:
  - `forRoot`: For static configuration known at compile time
  - `forRootAsync`: For dynamic configuration loaded at runtime
  - `forFeature`: For registering the module without initializing the SDK
- **Metrics Service**: A simplified API for creating and recording metrics
- **Business Metrics Service**: Domain-specific metrics for business operations
- **Automatic Instrumentation**: Interceptors and filters for automatic metrics collection

### Usage Example

```typescript
// Static configuration
@Module({
  imports: [
    OpenTelemetryModule.forRoot({
      serviceName: 'my-service',
      serviceVersion: '1.0.0',
      environment: 'production',
      exporters: {
        console: true,
        prometheus: {
          enabled: true,
          port: 9464,
          endpoint: '/metrics',
        },
      },
    }),
  ],
})
export class AppModule {}

// Async configuration
@Module({
  imports: [
    OpenTelemetryModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        serviceName: configService.get('OTEL_SERVICE_NAME'),
        serviceVersion: configService.get('OTEL_SERVICE_VERSION'),
        environment: configService.get('NODE_ENV'),
        exporters: {
          console: configService.get('OTEL_EXPORTER_CONSOLE') === 'true',
          prometheus: {
            enabled: configService.get('OTEL_EXPORTER_PROMETHEUS_ENABLED') === 'true',
            port: parseInt(configService.get('OTEL_EXPORTER_PROMETHEUS_PORT') || '9464', 10),
            endpoint: configService.get('OTEL_EXPORTER_PROMETHEUS_ENDPOINT') || '/metrics',
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
```

## Testing

The application includes comprehensive unit tests for all components:

```bash
# Run unit tests
npm run test

# Run unit tests with coverage
npm run test:cov

# Run end-to-end tests
npm run test:e2e
```

## Documentation

For more detailed information about the design decisions and implementation approach, please refer to the following documents:

- [RATIONALE.md](./RATIONALE.md) - Detailed explanation of design decisions and trade-offs

## License

This project is licensed under the [MIT](LICENSE.md) license.

## Acknowledgements

- [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications
- [OpenTelemetry](https://opentelemetry.io/) - An observability framework for cloud-native software
- [Prometheus](https://prometheus.io/) - An open-source monitoring system with a dimensional data model
