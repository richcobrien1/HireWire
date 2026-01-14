#!/bin/bash
# HireWire - Quick Setup Script
# This script sets up the complete local development environment

set -e  # Exit on error

echo "=========================================="
echo "HireWire - Local Development Setup"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if Docker is running
echo "Checking prerequisites..."
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}✗ Docker is not running. Please start Docker Desktop.${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker is running${NC}"

# Start all databases
echo ""
echo "Starting databases..."
docker-compose up -d

# Wait for services to be ready
echo ""
echo "Waiting for services to initialize..."

# Wait for PostgreSQL
echo -n "  PostgreSQL..."
until docker exec hirewire-postgres pg_isready -U hirewire > /dev/null 2>&1; do
    sleep 1
    echo -n "."
done
echo -e " ${GREEN}✓${NC}"

# Wait for Redis
echo -n "  Redis..."
until docker exec hirewire-redis redis-cli -a hirewire_redis_password ping > /dev/null 2>&1; do
    sleep 1
    echo -n "."
done
echo -e " ${GREEN}✓${NC}"

# Wait for Neo4j (takes longer)
echo -n "  Neo4j..."
for i in {1..60}; do
    if docker exec hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password "RETURN 1" > /dev/null 2>&1; then
        echo -e " ${GREEN}✓${NC}"
        break
    fi
    sleep 2
    echo -n "."
    if [ $i -eq 60 ]; then
        echo -e " ${YELLOW}⚠ Timeout (Neo4j may still be starting)${NC}"
    fi
done

# Wait for Qdrant
echo -n "  Qdrant..."
until curl -s http://localhost:6333/healthz > /dev/null 2>&1; do
    sleep 1
    echo -n "."
done
echo -e " ${GREEN}✓${NC}"

# Initialize Neo4j schema
echo ""
echo "Initializing Neo4j graph schema..."
if docker exec -i hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password < database/neo4j/001_init_schema.cypher > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Neo4j schema initialized${NC}"
else
    echo -e "${YELLOW}⚠ Neo4j schema initialization failed (you can run it manually)${NC}"
fi

# Load sample data
echo ""
echo "Loading sample data to PostgreSQL..."
if docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < database/seeds/002_sample_data.sql > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Sample data loaded${NC}"
else
    echo -e "${YELLOW}⚠ Sample data loading failed (you can run it manually)${NC}"
fi

# Initialize Qdrant (optional, requires Python)
echo ""
echo "Initializing Qdrant collections..."
if command -v python3 &> /dev/null; then
    if python3 database/seeds/setup_qdrant.py > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Qdrant collections created${NC}"
    else
        echo -e "${YELLOW}⚠ Qdrant setup failed (run manually: python database/seeds/setup_qdrant.py)${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Python3 not found. Run manually: python database/seeds/setup_qdrant.py${NC}"
fi

# Summary
echo ""
echo "=========================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Your HireWire development environment is ready!"
echo ""
echo "Access Points:"
echo "  PostgreSQL:  localhost:5432 (user: hirewire, pass: hirewire_dev_password)"
echo "  Redis:       localhost:6379 (pass: hirewire_redis_password)"
echo "  Neo4j:       http://localhost:7474 (user: neo4j, pass: hirewire_neo4j_password)"
echo "  Qdrant:      http://localhost:6333"
echo ""
echo "Management UIs (optional):"
echo "  Start with: docker-compose --profile tools up -d"
echo "  pgAdmin:     http://localhost:5050"
echo "  Redis UI:    http://localhost:8081"
echo ""
echo "Next steps:"
echo "  1. Explore the databases (see DEV_SETUP.md)"
echo "  2. Try sample queries (see DATABASE_SCHEMA.md)"
echo "  3. Start building the API!"
echo ""
echo "To stop: docker-compose down"
echo "To reset: docker-compose down -v && ./setup.sh"
echo ""
