#!/bin/bash
# Example script demonstrating how to view and interpret metrics from the NestJS OpenTelemetry POC

# Set the base URLs
API_URL="http://localhost:3000"
METRICS_URL="http://localhost:9464"

# Function to fetch and filter metrics
function fetch_metrics() {
  local filter=$1
  
  if [ -z "$filter" ]; then
    # Fetch all metrics from Prometheus endpoint
    curl -s "$METRICS_URL/metrics"
  else
    # Fetch and filter metrics from Prometheus endpoint
    curl -s "$METRICS_URL/metrics" | grep -E "$filter"
  fi
}

# Function to show metrics info
function show_metrics_info() {
  echo "Metrics information from NestJS:"
  curl -s "$API_URL/metrics"
  echo ""
}

# Check if the application is running
echo "Checking if the application is running..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/health")

if [ "$health_response" != "200" ]; then
  echo "Error: Application is not running. Please start the application first."
  exit 1
fi

echo "Application is running. Starting metrics examples..."
echo ""

# View metrics information
echo "Example 1: View metrics information"
echo "This will show information about available metrics."
show_metrics_info
echo ""
echo "To view actual Prometheus metrics, run:"
echo "curl $METRICS_URL/metrics"
echo ""
echo "Press Enter to continue..."
read

# View API request metrics
echo "Example 2: View API request metrics"
echo "This will show metrics related to API requests."
echo ""
echo "API request count metrics:"
fetch_metrics "api_request_count"
echo ""
echo "API request duration metrics:"
fetch_metrics "api_request_duration"
echo ""
echo "Press Enter to continue..."
read

# View API error metrics
echo "Example 3: View API error metrics"
echo "This will show metrics related to API errors."
echo ""
echo "API error count metrics:"
fetch_metrics "api_error_count"
echo ""
echo "Press Enter to continue..."
read

# View business metrics
echo "Example 4: View business metrics"
echo "This will show business-specific metrics."
echo ""
echo "Product view metrics:"
fetch_metrics "business_product_views_total"
echo ""
echo "Order creation metrics:"
fetch_metrics "business_orders_created_total"
echo ""
echo "Order processing time metrics:"
fetch_metrics "business_order_processing_time"
echo ""
echo "Press Enter to continue..."
read

# View host metrics
echo "Example 5: View host metrics"
echo "This will show host-level metrics like CPU and memory usage."
echo ""
echo "CPU usage metrics:"
fetch_metrics "process_cpu"
echo ""
echo "Memory usage metrics:"
fetch_metrics "process_memory"
echo ""
echo "Press Enter to continue..."
read

# Interpreting metrics
echo "Example 6: Interpreting metrics"
echo ""
echo "1. API Request Count:"
echo "   - Look for 'api_request_count' metrics to see how many requests have been made to each endpoint."
echo "   - Filter by method, endpoint, and status code to analyze specific API usage patterns."
echo ""
echo "2. API Request Duration:"
echo "   - Look for 'api_request_duration' metrics to see how long requests take to process."
echo "   - The histogram provides percentiles (0.5, 0.9, 0.99) to understand the distribution of request times."
echo "   - High p99 values indicate that some requests are taking much longer than others."
echo ""
echo "3. API Error Count:"
echo "   - Look for 'api_error_count' metrics to see how many errors have occurred."
echo "   - Filter by error type to identify common error patterns."
echo "   - Compare 'api_error_client_count' and 'api_error_server_count' to distinguish between client and server errors."
echo ""
echo "4. Business Metrics:"
echo "   - Look for 'business_product_views_total' to see which products are being viewed most often."
echo "   - Look for 'business_orders_created_total' to track order creation rates."
echo "   - Look for 'business_order_processing_time' to monitor order processing performance."
echo ""
echo "5. Host Metrics:"
echo "   - Look for 'process_cpu_seconds_total' to monitor CPU usage."
echo "   - Look for 'process_resident_memory_bytes' to monitor memory usage."
echo ""

# Using Prometheus and Grafana
echo "Example 7: Using Prometheus and Grafana"
echo ""
echo "To use Prometheus to scrape and store these metrics:"
echo ""
echo "1. Create a prometheus.yml file with the following content:"
echo "---"
cat << 'EOF'
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'nestjs-opentelemetry-poc'
    static_configs:
      - targets: ['localhost:9464']
EOF
echo "---"
echo ""
echo "2. Start Prometheus with this configuration:"
echo "   prometheus --config.file=prometheus.yml"
echo ""
echo "3. Access the Prometheus UI at http://localhost:9090"
echo ""
echo "4. To visualize metrics in Grafana:"
echo "   - Add Prometheus as a data source in Grafana"
echo "   - Create dashboards using PromQL queries like:"
echo "     - rate(api_request_count_total[5m])"
echo "     - histogram_quantile(0.95, sum(rate(api_request_duration_bucket[5m])) by (le, endpoint))"
echo "     - sum(business_orders_created_total) by (customerId)"
echo ""

echo "Metrics examples completed."