#!/usr/bin/env bash
# generate-dev-keys.sh — Generate RSA keypair for local dev JWT signing
#
# Creates:
#   ~/.creator-os-dev/jwt_private.pem   RSA 2048-bit private key (NEVER commit this)
#   ~/.creator-os-dev/jwt_public.pem    RSA 2048-bit public key
#
# Then appends the path variables to .env (creates .env from .env.example if missing).
#
# Usage:
#   ./scripts/generate-dev-keys.sh
#
# After running:
#   JWT_ALGORITHM=RS256
#   JWT_PRIVATE_KEY_PATH and JWT_PUBLIC_KEY_PATH will be set in your .env

set -euo pipefail

KEYS_DIR="$HOME/.creator-os-dev"
PRIVATE_KEY="$KEYS_DIR/jwt_private.pem"
PUBLIC_KEY="$KEYS_DIR/jwt_public.pem"
ENV_FILE="$(dirname "$0")/../.env"
ENV_EXAMPLE="$(dirname "$0")/../.env.example"

echo "🔐 Creator OS — Dev JWT Key Generator"
echo "======================================="

# Create the keys directory (outside the repo)
mkdir -p "$KEYS_DIR"
chmod 700 "$KEYS_DIR"

# Generate RSA 2048-bit private key
if [ -f "$PRIVATE_KEY" ]; then
    echo "⚠️  Private key already exists at $PRIVATE_KEY"
    read -r -p "   Regenerate? This will invalidate existing dev tokens. [y/N] " confirm
    if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
        echo "   Skipping key generation."
    else
        openssl genrsa -out "$PRIVATE_KEY" 2048 2>/dev/null
        chmod 600 "$PRIVATE_KEY"
        echo "✅ Generated new private key: $PRIVATE_KEY"
    fi
else
    openssl genrsa -out "$PRIVATE_KEY" 2048 2>/dev/null
    chmod 600 "$PRIVATE_KEY"
    echo "✅ Generated private key: $PRIVATE_KEY"
fi

# Extract public key
openssl rsa -in "$PRIVATE_KEY" -pubout -out "$PUBLIC_KEY" 2>/dev/null
chmod 644 "$PUBLIC_KEY"
echo "✅ Extracted public key: $PUBLIC_KEY"

# Create .env from .env.example if it doesn't exist
if [ ! -f "$ENV_FILE" ]; then
    if [ -f "$ENV_EXAMPLE" ]; then
        cp "$ENV_EXAMPLE" "$ENV_FILE"
        echo "✅ Created .env from .env.example"
    else
        touch "$ENV_FILE"
        echo "✅ Created empty .env"
    fi
fi

# Update or append JWT key path variables in .env
update_env_var() {
    local key="$1"
    local value="$2"
    local file="$3"
    if grep -q "^${key}=" "$file" 2>/dev/null; then
        # Replace existing line (works on macOS and Linux)
        sed -i.bak "s|^${key}=.*|${key}=${value}|" "$file" && rm -f "${file}.bak"
    else
        echo "${key}=${value}" >> "$file"
    fi
}

update_env_var "JWT_ALGORITHM" "RS256" "$ENV_FILE"
update_env_var "JWT_PRIVATE_KEY_PATH" "$PRIVATE_KEY" "$ENV_FILE"
update_env_var "JWT_PUBLIC_KEY_PATH" "$PUBLIC_KEY" "$ENV_FILE"

# Comment out HS256 lines if they exist
if grep -q "^JWT_SECRET=" "$ENV_FILE" 2>/dev/null; then
    sed -i.bak "s|^JWT_SECRET=|# JWT_SECRET=|" "$ENV_FILE" && rm -f "${ENV_FILE}.bak"
fi

echo ""
echo "✅ .env updated with:"
echo "   JWT_ALGORITHM=RS256"
echo "   JWT_PRIVATE_KEY_PATH=$PRIVATE_KEY"
echo "   JWT_PUBLIC_KEY_PATH=$PUBLIC_KEY"
echo ""
echo "🔒 Security reminders:"
echo "   • $KEYS_DIR is outside the repo and will NOT be committed"
echo "   • Never share or commit the private key"
echo "   • For production: store keys in AWS Secrets Manager or Azure Key Vault"
echo "   • See docs/infrastructure/cloud-secrets-strategy.md"
echo ""
echo "🚀 Start the API server with: make dev"
