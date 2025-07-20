#!/bin/bash
# Example script demonstrating API usage for the NestJS OpenTelemetry POC

# Set the base URL for the API
BASE_URL="http://localhost:3000/api"

# Function to make API requests and display the response
function make_request() {
  echo "Request: $1 $2"
  echo "Payload: $3"
  echo "---"
  
  if [ -z "$3" ]; then
    # GET or DELETE request without payload
    response=$(curl -s -X "$1" "$BASE_URL$2" -H "Content-Type: application/json")
  else
    # POST or PUT request with payload
    response=$(curl -s -X "$1" "$BASE_URL$2" -H "Content-Type: application/json" -d "$3")
  fi
  
  echo "Response:"
  echo "$response" | jq '.'
  echo "---"
  echo ""
  
  # Sleep to simulate user interaction
  sleep 1
}

# Check if the application is running
echo "Checking if the application is running..."
health_response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")

if [ "$health_response" != "200" ]; then
  echo "Error: Application is not running. Please start the application first."
  exit 1
fi

echo "Application is running. Starting API usage examples..."
echo ""

# Get health information
echo "Example 1: Get health information"
make_request "GET" "/health"

# List all products
echo "Example 2: List all products"
make_request "GET" "/products"

# Filter products by category
echo "Example 3: Filter products by category"
make_request "GET" "/products?category=electronics"

# Get a specific product
echo "Example 4: Get a specific product"
# First, get the ID of the first product
product_id=$(curl -s "$BASE_URL/products" | jq -r '.[0].id')
make_request "GET" "/products/$product_id"

# Create a new product
echo "Example 5: Create a new product"
make_request "POST" "/products" '{
  "name": "Example Product",
  "description": "This is an example product created by the API usage script",
  "price": 99.99,
  "category": "example",
  "inventory": 100
}'

# Update a product
echo "Example 6: Update a product"
# Use the ID of the product we just created
new_product_id=$(curl -s -X "POST" "$BASE_URL/products" -H "Content-Type: application/json" -d '{
  "name": "Product to Update",
  "description": "This product will be updated",
  "price": 49.99,
  "category": "example",
  "inventory": 50
}' | jq -r '.id')

make_request "PUT" "/products/$new_product_id" '{
  "name": "Updated Product",
  "price": 59.99,
  "description": "This product has been updated"
}'

# Update product inventory
echo "Example 7: Update product inventory"
make_request "PUT" "/products/$new_product_id/inventory" '{
  "change": 25,
  "reason": "restock"
}'

# List all orders
echo "Example 8: List all orders"
make_request "GET" "/orders"

# Create a new order
echo "Example 9: Create a new order"
make_request "POST" "/orders" '{
  "items": [
    {
      "productId": "'"$product_id"'",
      "productName": "Example Product",
      "quantity": 2,
      "unitPrice": 99.99
    }
  ],
  "customerId": "example-customer"
}'

# Get a specific order
echo "Example 10: Get a specific order"
# First, get the ID of the first order
order_id=$(curl -s "$BASE_URL/orders" | jq -r '.[0].id')
make_request "GET" "/orders/$order_id"

# Process an order
echo "Example 11: Process an order"
make_request "PUT" "/orders/$order_id/process"

# Cancel an order
echo "Example 12: Create and cancel an order"
# Create a new order to cancel
new_order_id=$(curl -s -X "POST" "$BASE_URL/orders" -H "Content-Type: application/json" -d '{
  "items": [
    {
      "productId": "'"$new_product_id"'",
      "productName": "Updated Product",
      "quantity": 1,
      "unitPrice": 59.99
    }
  ]
}' | jq -r '.id')

make_request "PUT" "/orders/$new_order_id/cancel"

# View metrics
echo "Example 13: View metrics"
echo "Metrics information is available at http://localhost:3000/metrics"
echo "Actual Prometheus metrics are available at http://localhost:9464/metrics"
echo "You can view them in your browser or using curl:"
echo "curl http://localhost:3000/metrics  # Metrics information"
echo "curl http://localhost:9464/metrics  # Actual Prometheus metrics"
echo ""

# Generate some errors to demonstrate error metrics
echo "Example 14: Generate errors to demonstrate error metrics"

# 404 Not Found error
echo "Generating 404 Not Found error..."
make_request "GET" "/products/nonexistent-id"

# 400 Bad Request error
echo "Generating 400 Bad Request error..."
make_request "POST" "/products" '{
  "description": "Missing required fields"
}'

# 400 Bad Request error for order processing
echo "Generating 400 Bad Request error for order processing..."
make_request "PUT" "/orders/$order_id/process"

echo "API usage examples completed."
echo "You can now view:"
echo "- Metrics information at http://localhost:3000/metrics"
echo "- Actual Prometheus metrics at http://localhost:9464/metrics"
echo "to see the impact of these API calls."