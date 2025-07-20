# NestJS OpenTelemetry POC

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic), Refactored by: Claude 3.5 Sonnet (Anthropic)  
> Date: 19/07/2025  
> Version: 2.0  
> AI/LLM Details: Originally created using Claude 3 Opus, refactored using Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)

A simplified proof of concept (POC) application demonstrating how OpenTelemetry can be integrated with NestJS for application monitoring.

## Overview

This project demonstrates a clean, simple integration of OpenTelemetry with NestJS. The implementation focuses on clarity and ease of understanding rather than comprehensive feature coverage, making it ideal for learning and as a foundation for production implementations.

**Note**: This implementation has been significantly refactored from the original complex version. See [`docs/SONNET_40.md`](./docs/SONNET_40.md) for the assessment that led to the refactoring and [`docs/40_REFACTOR.md`](./docs/40_REFACTOR.md) for detailed information about the changes made.

The application implements a basic e-commerce API with products and orders, instrumented with essential OpenTelemetry metrics to track HTTP requests and key business events.

## Features

- **Simple OpenTelemetry Integration**: Clean integration with NestJS using a single telemetry service
- **Automatic HTTP Instrumentation**: Automatic tracking of HTTP requests and response times
- **Business Metrics**: Key business event tracking (product views, order creation)
- **Prometheus Export**: Metrics available via Prometheus endpoint
- **Environment Configuration**: Simple environment variable configuration
- **Clear Documentation**: Focused documentation for easy understanding
- **Simplified Testing**: Straightforward test structure

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

The application can be configured through simple environment variables:

```bash
# Core configuration
PORT=3000
NODE_ENV=development

# OpenTelemetry configuration
OTEL_SERVICE_NAME=nestjs-poc
PROMETHEUS_PORT=9464
CONSOLE_EXPORTER=false
```

### Running the Application

```bash
# Development mode
npm run start:dev

# Production mode
npm run build
npm run start:prod
```

### Quick Start

1. Install dependencies: `npm install`
2. Start the application: `npm run start:dev`
3. Visit the health endpoint: <http://localhost:3000/api/health>
4. View metrics information: <http://localhost:3000/api/metrics>
5. Access Prometheus metrics: <http://localhost:9464/metrics>
6. Test the API: <http://localhost:3000/api/products>

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

The application provides the following core metrics:

#### HTTP Metrics

- `http.requests.total` - Total number of HTTP requests
  - Labels: `method`, `route`, `status`
- `http.duration` - HTTP request duration in milliseconds
  - Labels: `method`, `route`, `status`

#### Business Metrics

- `business.product.views` - Total number of product views
  - Labels: `productId`, `category`, `userId` (optional)
- `business.orders.created` - Total number of orders created
  - Labels: `orderId`, `productCount`, `totalAmount`, `userId` (optional)

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

## Telemetry Module

The application includes a simplified telemetry module that provides:

- **Single Service**: One `TelemetryService` handles all telemetry needs
- **Automatic HTTP Instrumentation**: Interceptor automatically tracks HTTP requests
- **Business Metrics**: Direct methods for recording key business events
- **Simple Configuration**: Environment variable based setup

### Usage Example

```typescript
// Simple module import
@Module({
  imports: [TelemetryModule],
})
export class AppModule {}

// Using the service in your code
@Injectable()
export class MyService {
  constructor(private telemetry: TelemetryService) {}
  
  async doSomething() {
    // Record business metrics directly
    this.telemetry.recordProductView('product-123', 'electronics');
  }
}
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

- [RATIONALE.md](./RATIONALE.md) - Original design decisions and trade-offs
- [docs/SONNET_40.md](./docs/SONNET_40.md) - Assessment of the original implementation
- [docs/40_REFACTOR.md](./docs/40_REFACTOR.md) - Detailed refactoring documentation

## License

This project is licensed under the [MIT](LICENSE.md) license.

## Acknowledgements

- [NestJS](https://nestjs.com/) - A progressive Node.js framework for building efficient and scalable server-side applications
- [OpenTelemetry](https://opentelemetry.io/) - An observability framework for cloud-native software
- [Prometheus](https://prometheus.io/) - An open-source monitoring system with a dimensional data model
