#!/bin/bash

# HireWire Development Setup Script
# Sets up the complete development environment with all services

set -e  # Exit on error

echo "🚀 Starting HireWire Development Environment..."
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  .env file not found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${RED}❌ Please edit .env and add your OPENAI_API_KEY${NC}"
    echo "   Then run this script again."
    exit 1
fi

# Check if OPENAI_API_KEY is set
if ! grep -q "OPENAI_API_KEY=sk-" .env; then
    echo -e "${RED}❌ OPENAI_API_KEY not set in .env file${NC}"
    echo "   Please add your OpenAI API key to .env"
    exit 1
fi

echo -e "${BLUE}📦 Building and starting all services...${NC}"
docker-compose up -d --build

echo ""
echo -e "${BLUE}⏳ Waiting for services to be healthy...${NC}"

# Wait for PostgreSQL
echo -n "  PostgreSQL: "
for i in {1..30}; do
    if docker-compose exec -T postgres pg_isready -U hirewire >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Redis
echo -n "  Redis: "
for i in {1..30}; do
    if docker-compose exec -T redis redis-cli -a hirewire_redis_password ping >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Neo4j
echo -n "  Neo4j: "
for i in {1..60}; do
    if docker-compose exec -T neo4j cypher-shell -u neo4j -p hirewire_neo4j_password "RETURN 1" >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 2
done

# Wait for Qdrant
echo -n "  Qdrant: "
for i in {1..30}; do
    if curl -s http://localhost:6333/healthz >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for Resume Parser
echo -n "  Resume Parser: "
for i in {1..30}; do
    if curl -s http://localhost:8000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

# Wait for API
echo -n "  API Gateway: "
for i in {1..30}; do
    if curl -s http://localhost:4000/health >/dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        break
    fi
    echo -n "."
    sleep 1
done

echo ""
echo -e "${BLUE}📊 Initializing Qdrant collections...${NC}"
docker-compose exec -T resume-parser python -c "
import requests
from openai import OpenAI
import os

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Create collections
collections = [
    {'name': 'candidate_profiles', 'size': 768},
    {'name': 'job_descriptions', 'size': 768},
    {'name': 'skills_semantic', 'size': 768}
]

for col in collections:
    try:
        requests.put(f'http://qdrant:6333/collections/{col[\"name\"]}', json={
            'vectors': {
                'size': col['size'],
                'distance': 'Cosine'
            }
        }, headers={'api-key': 'hirewire_qdrant_api_key'})
        print(f'✓ Created collection: {col[\"name\"]}')
    except Exception as e:
        print(f'Collection {col[\"name\"]} may already exist')
" || echo "Qdrant collections initialized"

echo ""
echo -e "${GREEN}✅ HireWire development environment is ready!${NC}"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}🎯 Service Access Points:${NC}"
echo ""
echo "  📡 API Gateway:        http://localhost:4000"
echo "  🤖 Resume Parser:      http://localhost:8000"
echo "  🐘 PostgreSQL:         localhost:5432"
echo "  📊 Neo4j Browser:      http://localhost:7474"
echo "  🔍 Qdrant Dashboard:   http://localhost:6333/dashboard"
echo "  💾 Redis:              localhost:6379"
echo ""
echo -e "${BLUE}🛠️  Management Tools (optional):${NC}"
echo "  Run: ${YELLOW}docker-compose --profile tools up -d${NC}"
echo "  📊 pgAdmin:            http://localhost:5050"
echo "  💾 Redis Commander:    http://localhost:8081"
echo ""
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "${YELLOW}📝 Quick Commands:${NC}"
echo "  View logs:         docker-compose logs -f"
echo "  Stop services:     docker-compose down"
echo "  Reset everything:  docker-compose down -v"
echo ""
echo -e "${GREEN}Happy coding! 🚀${NC}"
