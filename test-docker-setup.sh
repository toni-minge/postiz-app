#!/bin/bash

echo "🧪 Testing Postiz Docker Production Setup"
echo "=========================================="

# Check if Docker is running
if ! docker --version > /dev/null 2>&1; then
    echo "❌ Docker is not installed or not running"
    exit 1
fi

echo "✅ Docker is available"

# Check if docker-compose is available
if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ docker-compose is not available"
    exit 1
fi

echo "✅ docker-compose is available"

# Validate the docker-compose file
echo "🔍 Validating docker-compose.production.yml..."
if docker-compose -f docker-compose.production.yml config > /dev/null 2>&1; then
    echo "✅ docker-compose.production.yml syntax is valid"
else
    echo "❌ docker-compose.production.yml has syntax errors"
    docker-compose -f docker-compose.production.yml config
    exit 1
fi

# Check required files
echo "🔍 Checking required files..."

required_files=(
    "Dockerfile.production"
    ".env.test"
    "var/docker/supervisord.conf"
    "var/docker/Caddyfile"
    "var/docker/supervisord/caddy.conf"
    "var/docker/entrypoint.sh"
)

for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

echo ""
echo "🎉 All checks passed!"
echo "Ready to build and test the Docker setup."
echo ""
echo "To test the setup, run:"
echo "  docker-compose -f docker-compose.production.yml --env-file .env.test up --build"
echo ""
echo "The application will be available at: http://localhost:5000"
