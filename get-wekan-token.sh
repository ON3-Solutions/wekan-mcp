#!/bin/bash

# made by namar0x0309 with ❤️ at GoAIX
# Wekan Token Generator - Cross-platform version
# Works on Linux, macOS, and Windows (WSL/Git Bash)

echo "=== Wekan Token Generator ==="
echo "made by namar0x0309 with ❤️ at GoAIX"

# Function to check if required tools are available
check_dependencies() {
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is required but not found."
        echo "Please install curl and try again."
        exit 1
    fi
}

# Function to extract JSON values using sed (fallback if jq not available)
extract_json_value() {
    local json="$1"
    local key="$2"
    # Extract value for key from JSON string
    echo "$json" | sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\"\([^\"]*\)\".*/\1/p" | head -1
}

# Function to extract numeric values
extract_json_number() {
    local json="$1"
    local key="$2"
    # Extract numeric value for key from JSON string
    echo "$json" | sed -n "s/.*\"$key\"[[:space:]]*:[[:space:]]*\([0-9]*\).*/\1/p" | head -1
}

# Check dependencies
check_dependencies

# Ask for endpoint (default if blank)
read -p "Enter Wekan endpoint (default: https://wekan.uan.com.br): " Endpoint
if [ -z "$Endpoint" ]; then
    Endpoint="https://wekan.uan.com.br"
fi

# Ask for username
read -p "Enter username: " Username
if [ -z "$Username" ]; then
    echo "Error: Username is required."
    exit 1
fi

# Secure password input
read -s -p "Enter password: " Password
echo
if [ -z "$Password" ]; then
    echo "Error: Password is required."
    exit 1
fi

echo
echo "Authenticating with Wekan..."

# Build JSON payload manually (avoiding jq dependency)
Body="{\"username\":\"$Username\",\"password\":\"$Password\"}"

# Make request using curl
Response=$(curl -s -X POST "$Endpoint/users/login" \
    -H "Content-Type: application/json" \
    -d "$Body")

# Check if curl succeeded
if [ $? -ne 0 ] || [ -z "$Response" ]; then
    echo "Error: Failed to connect to Wekan endpoint."
    echo "Please check your network connection and endpoint URL."
    exit 1
fi

# Check if response contains error
if echo "$Response" | grep -q '"error"'; then
    echo "Error: Authentication failed."
    echo "Response: $Response"
    exit 1
fi

# Extract token and other values using sed
Token=$(extract_json_value "$Response" "token")
UserId=$(extract_json_value "$Response" "id")
TokenExpires=$(extract_json_value "$Response" "tokenExpires")

# Check if we got a token
if [ -z "$Token" ]; then
    echo "Error: Login failed or no token returned."
    echo "Response: $Response"
    exit 1
fi

# Write .env file
cat > .env << EOF
# Wekan MCP Server Configuration
WEKAN_BASE_URL=$Endpoint
WEKAN_API_TOKEN=$Token
WEKAN_USER_ID=$UserId
WEKAN_TOKEN_EXPIRES=$TokenExpires
EOF

# Update mcp-inspector-config.json if it exists
if [ -f "mcp-inspector-config.json" ]; then
    # Update WEKAN_BASE_URL, WEKAN_API_TOKEN, and WEKAN_USER_ID
    sed -i.bak 's|"WEKAN_BASE_URL": "[^"]*"|"WEKAN_BASE_URL": "'"$Endpoint"'"|g' mcp-inspector-config.json
    sed -i.bak 's|"WEKAN_API_TOKEN": "[^"]*"|"WEKAN_API_TOKEN": "'"$Token"'"|g' mcp-inspector-config.json

    # Add WEKAN_USER_ID if not present, or update if present
    if grep -q "WEKAN_USER_ID" mcp-inspector-config.json; then
        sed -i.bak 's|"WEKAN_USER_ID": "[^"]*"|"WEKAN_USER_ID": "'"$UserId"'"|g' mcp-inspector-config.json
    else
        # Add WEKAN_USER_ID after WEKAN_API_TOKEN
        sed -i.bak 's|"WEKAN_API_TOKEN": "'"$Token"'"|"WEKAN_API_TOKEN": "'"$Token"'",\n        "WEKAN_USER_ID": "'"$UserId"'"|g' mcp-inspector-config.json
    fi

    # Clean up backup files
    rm -f mcp-inspector-config.json.bak

    echo "Updated mcp-inspector-config.json with WEKAN_BASE_URL, WEKAN_API_TOKEN, and WEKAN_USER_ID"
fi

echo
echo "✅ Authentication successful!"
echo "Token saved to .env"
if [ -n "$TokenExpires" ]; then
    echo "Token expires: $TokenExpires"
fi
