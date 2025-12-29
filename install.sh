#!/bin/bash

# made by namar0x0309 with ❤️ at GoAIX
# Install dependencies and build the project

echo "=== Wekan MCP Server - Install ==="

npm install && npm run build

echo "Done! Run ./get-wekan-token.sh to configure your credentials."
