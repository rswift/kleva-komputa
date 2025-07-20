#!/bin/bash
# Quick test script to verify metrics endpoints are working

echo "Testing metrics endpoints..."
echo ""

# Test the NestJS metrics info endpoint
echo "1. Testing NestJS metrics info endpoint: http://localhost:3000/metrics"
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/metrics")
if [ "$response" = "200" ]; then
    echo "✅ NestJS metrics info endpoint is working (HTTP $response)"
    echo "Content preview:"
    curl -s "http://localhost:3000/metrics" | head -5
else
    echo "❌ NestJS metrics info endpoint failed (HTTP $response)"
fi
echo ""

# Test the Prometheus metrics endpoint
echo "2. Testing Prometheus metrics endpoint: http://localhost:9464/metrics"
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:9464/metrics")
if [ "$response" = "200" ]; then
    echo "✅ Prometheus metrics endpoint is working (HTTP $response)"
    echo "Content preview:"
    curl -s "http://localhost:9464/metrics" | head -5
else
    echo "❌ Prometheus metrics endpoint failed (HTTP $response)"
fi
echo ""

# Test the health endpoint for comparison
echo "3. Testing health endpoint: http://localhost:3000/api/health"
response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/api/health")
if [ "$response" = "200" ]; then
    echo "✅ Health endpoint is working (HTTP $response)"
else
    echo "❌ Health endpoint failed (HTTP $response)"
fi
echo ""

echo "Endpoint testing complete!"
echo ""
echo "Summary:"
echo "- NestJS metrics info: http://localhost:3000/metrics"
echo "- Prometheus metrics: http://localhost:9464/metrics"
echo "- Health check: http://localhost:3000/api/health"