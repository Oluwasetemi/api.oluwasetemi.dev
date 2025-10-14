#!/bin/bash

# websocat GraphQL Subscription Test Script
# This script demonstrates how to test GraphQL subscriptions using websocat

echo "🔌 GraphQL Subscription Test with websocat"
echo "=========================================="
echo ""
echo "Connecting to ws://localhost:4444/graphql"
echo ""
echo "Commands you can send (copy/paste these one at a time):"
echo ""
echo "1️⃣  Initialize connection:"
echo '{"type":"connection_init","payload":{}}'
echo ""
echo "2️⃣  Subscribe to product creation events:"
echo '{"id":"1","type":"subscribe","payload":{"query":"subscription { productCreated { id name price sku createdAt } }"}}'
echo ""
echo "3️⃣  Subscribe to task creation events:"
echo '{"id":"2","type":"subscribe","payload":{"query":"subscription { taskCreated { id name description status priority createdAt } }"}}'
echo ""
echo "4️⃣  Subscribe to post published events:"
echo '{"id":"3","type":"subscribe","payload":{"query":"subscription { postPublished { id title slug status createdAt } }"}}'
echo ""
echo "5️⃣  Unsubscribe (replace '1' with your subscription id):"
echo '{"id":"1","type":"complete"}'
echo ""
echo "=========================================="
echo ""
echo "💡 Tip: Open another terminal and create a product to trigger events:"
echo "   curl -X POST http://localhost:4444/products \\"
echo "     -H 'Content-Type: application/json' \\"
echo "     -d '{\"name\": \"Test\", \"price\": 99.99, \"sku\": \"TEST-001\"}'"
echo ""
echo "Starting websocat connection..."
echo "=========================================="
echo ""

# Connect to GraphQL WebSocket endpoint with the correct subprotocol
websocat --protocol graphql-transport-ws ws://localhost:4444/graphql
