#!/bin/bash

# NCERT RAG Explorer Deployment Script

set -e

echo "🚀 Starting NCERT RAG Explorer deployment..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with your GEMINI_API_KEY"
    echo "Example:"
    echo "GEMINI_API_KEY=your_api_key_here"
    echo "PORT=3000"
    echo "STORE_NAME=ncert-rag-store"
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    echo "Please start Docker and try again."
    exit 1
fi

# Build and start services
echo "🔨 Building Docker images..."
docker-compose build --no-cache

echo "🏃 Starting services..."
docker-compose up -d

echo "⏳ Waiting for services to be healthy..."
sleep 15

# Check if services are running
if docker-compose ps | grep -q "Up"; then
    echo "✅ Services are running!"
    echo ""
    echo "🌐 Access your application:"
    echo "   Frontend: http://localhost:3102"
    echo "   Backend API: http://localhost:3101"
    echo "   Health Check: http://localhost:3101/health"
    echo ""
    echo "📊 View logs:"
    echo "   docker-compose logs -f"
    echo ""
    echo "🛑 Stop services:"
    echo "   docker-compose down"
    echo ""
    echo "🗑️  Clean up:"
    echo "   docker-compose down -v --remove-orphans"
else
    echo "❌ Error: Services failed to start!"
    echo "Check logs with: docker-compose logs"
    exit 1
fi