# NestJS OpenTelemetry POC Examples

> **Document Information**  
> Created by: Claude 3 Opus (Anthropic)  
> Date: 19/07/2025  
> Version: 1.1  
> AI/LLM Details: This document was created using Claude 3 Opus by Anthropic (version 2023-08-22)

This directory contains example scripts that demonstrate how to use the NestJS OpenTelemetry POC application and interpret its metrics.

## Prerequisites

- The NestJS OpenTelemetry POC application must be running
- `curl` and `jq` must be installed on your system
- Bash shell environment

## Example Scripts

### API Usage Example

The `api-usage.sh` script demonstrates how to use the API endpoints provided by the application. It makes requests to various endpoints and displays the responses.

To run the script:

```bash
# Make the script executable
chmod +x api-usage.sh

# Run the script
./api-usage.sh
```

The script performs the following operations:

1. Checks if the application is running
2. Gets health information
3. Lists all products
4. Filters products by category
5. Gets a specific product
6. Creates a new product
7. Updates a product
8. Updates product inventory
9. Lists all orders
10. Creates a new order
11. Gets a specific order
12. Processes an order
13. Creates and cancels an order
14. Generates some errors to demonstrate error metrics

### View Metrics Example

The `view-metrics.sh` script demonstrates how to view and interpret the metrics exported by the application.

To run the script:

```bash
# Make the script executable
chmod +x view-metrics.sh

# Run the script
./view-metrics.sh
```

The script covers the following topics:

1. Viewing all metrics
2. Viewing API request metrics
3. Viewing API error metrics
4. Viewing business metrics
5. Viewing host metrics
6. Interpreting metrics
7. Using Prometheus and Grafana

## Using with Prometheus and Grafana

To use the application with Prometheus and Grafana:

1. Create a `prometheus.yml` file with the following content:

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nestjs-opentelemetry-poc'
    static_configs:
      - targets: ['localhost:3000']
```

2. Start Prometheus with this configuration:

```bash
prometheus --config.file=prometheus.yml
```

3. Access the Prometheus UI at http://localhost:9090

4. To visualise metrics in Grafana:
   - Add Prometheus as a data source in Grafana
   - Create dashboards using PromQL queries like:
     - `rate(api_request_count_total[5m])`
     - `histogram_quantile(0.95, sum(rate(api_request_duration_bucket[5m])) by (le, endpoint))`
     - `sum(business_orders_created_total) by (customerId)`

## Example Grafana Dashboard

Here's an example of a Grafana dashboard that visualises the metrics exported by the application:

1. API Request Overview:
   - Request Rate: `sum(rate(api_request_count_total[5m]))`
   - Error Rate: `sum(rate(api_error_count_total[5m]))`
   - Request Duration (p95): `histogram_quantile(0.95, sum(rate(api_request_duration_bucket[5m])) by (le))`

2. API Endpoints:
   - Top Endpoints by Request Count: `topk(5, sum(api_request_count_total) by (endpoint))`
   - Endpoint Request Rate: `sum(rate(api_request_count_total[5m])) by (endpoint)`
   - Endpoint Error Rate: `sum(rate(api_error_count_total[5m])) by (endpoint)`
   - Endpoint Request Duration (p95): `histogram_quantile(0.95, sum(rate(api_request_duration_bucket[5m])) by (le, endpoint))`

3. Business Metrics:
   - Product Views: `sum(business_product_views_total) by (productId)`
   - Orders Created: `sum(business_orders_created_total)`
   - Order Processing Time (p95): `histogram_quantile(0.95, sum(rate(business_order_processing_time_bucket[5m])) by (le))`
   - Inventory Changes: `sum(business_product_inventory_change_total) by (productId)`

4. System Metrics:
   - CPU Usage: `rate(process_cpu_seconds_total[5m])`
   - Memory Usage: `process_resident_memory_bytes`
   - Heap Usage: `nodejs_heap_size_used_bytes`
   - Event Loop Lag: `nodejs_eventloop_lag_seconds`