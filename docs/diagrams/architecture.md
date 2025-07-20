# Architecture Diagram

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic), Updated by: Claude 3.5 Sonnet (Anthropic)  
> Date: 19/07/2025  
> Version: 2.0  
> AI/LLM Details: Originally created using Claude 3 Opus, updated after refactoring by Claude 3.5 Sonnet (claude-3-5-sonnet-20241022)

## Refactoring Notice

**Important**: This architecture has been significantly simplified based on the refactoring documented in [`../40_REFACTOR.md`](../40_REFACTOR.md). The original complex architecture with multiple service layers has been replaced with a streamlined approach.

## Simplified System Architecture

The following diagram illustrates the simplified architecture of the refactored NestJS OpenTelemetry POC application:

```mermaid
graph TD
    subgraph "NestJS Application"
        A[Client Request] --> B[NestJS HTTP Server]
        B --> C[Telemetry Interceptor]
        C --> D[API Controllers]
        D --> E[Services]
        E --> F[Repositories]
        
        subgraph "Telemetry Module"
            G[Telemetry Service]
        end
        
        C --> G
        E --> G
        
        subgraph "OpenTelemetry SDK"
            H[Prometheus Exporter]
            I[Console Exporter]
        end
        
        G --> H
        G --> I
    end
    
    J[Prometheus Server] <--> H
    K[Grafana] <--> J
    
    style "Telemetry Module" fill:#f9f,stroke:#333,stroke-width:2px
    style "OpenTelemetry SDK" fill:#bbf,stroke:#333,stroke-width:1px
```

## Simplified Component Interactions

The refactored architecture shows the following streamlined components and their interactions:

1. **Client Request**: External requests to the API endpoints.

2. **NestJS HTTP Server**: The core NestJS server that handles incoming HTTP requests.

3. **Telemetry Interceptor**: A simplified global interceptor that captures essential metrics for all API requests (method, route, status, duration).

4. **API Controllers**: The controllers that handle specific API endpoints for products, orders, health, and metrics.

5. **Services**: Business logic services that implement the application functionality and record business metrics directly.

6. **Repositories**: Data access layer that simulates database operations.

7. **Telemetry Module**: A simplified NestJS module that provides OpenTelemetry integration:
   - **Telemetry Service**: Single unified service that handles all telemetry concerns including SDK initialization, metric creation, and recording.

8. **OpenTelemetry SDK**: The standard OpenTelemetry SDK with direct configuration:
   - **Prometheus Exporter**: Exports metrics in Prometheus format via HTTP endpoint on port 9464.
   - **Console Exporter**: Optional console output for debugging.

9. **Prometheus Server**: External Prometheus server that scrapes metrics from the application.

10. **Grafana**: External Grafana instance that visualises metrics from Prometheus.

## Simplified Data Flow

1. A client sends an HTTP request to the NestJS application.
2. The request passes through the Telemetry Interceptor, which records the start time.
3. The request is routed to the appropriate controller and handler.
4. The handler calls the necessary services and repositories to process the request.
5. During processing, business metrics are recorded directly using the Telemetry Service.
6. The response is generated and passed back through the Telemetry Interceptor.
7. The Telemetry Interceptor calculates the request duration and records HTTP metrics directly.
8. The Telemetry Service uses pre-created OpenTelemetry instruments to record metrics efficiently.
9. The OpenTelemetry SDK automatically exports metrics via the Prometheus exporter.
10. External systems like Prometheus and Grafana can access and visualise the exported metrics.

## Simplified Configuration Flow

```mermaid
graph TD
    A[Environment Variables] --> B[TelemetryService Constructor]
    B --> C[Simple Config Object]
    C --> D[TelemetryModule Import]
    D --> E[onModuleInit]
    E --> F[NodeSDK Creation]
    F --> G[SDK Start]
    G --> H[Prometheus Exporter Ready]
    
    style TelemetryService fill:#f9f,stroke:#333,stroke-width:2px
    style "Simple Config Object" fill:#bbf,stroke:#333,stroke-width:1px
```

This simplified configuration flow shows how the application directly reads environment variables, creates a simple configuration object, and initialises the OpenTelemetry SDK without complex validation or factory patterns.

## Key Architectural Changes

The refactored architecture eliminates:

- **Multiple service layers** (OpenTelemetryService, MetricsService, BusinessMetricsService → TelemetryService)
- **Complex configuration factory** (Direct environment variable reading)
- **Custom interfaces** (Direct OpenTelemetry API usage)
- **Error metrics filter** (Simplified error handling through logging)
- **Complex validation** (Simple, fail-fast configuration)

This results in:

- **67% fewer services** (3 → 1)
- **80% less configuration code**
- **Direct API usage** for better performance
- **Easier maintenance** and understanding
