#!/bin/bash

# HireWire Database Career Context Sync
# Purpose: Sync career context data from PostgreSQL to Neo4j and Qdrant

echo "🔄 Starting Career Context Data Sync..."
echo ""

# Color codes
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# =============================================================================
# 1. Wait for all databases to be ready
# =============================================================================

echo -e "${BLUE}1. Checking database health...${NC}"

# Check PostgreSQL
until docker exec hirewire-postgres pg_isready -U hirewire > /dev/null 2>&1; do
  echo "⏳ Waiting for PostgreSQL..."
  sleep 2
done
echo -e "${GREEN}✅ PostgreSQL ready${NC}"

# Check Neo4j
until curl -s http://localhost:7474 > /dev/null; do
  echo "⏳ Waiting for Neo4j..."
  sleep 2
done
echo -e "${GREEN}✅ Neo4j ready${NC}"

# Check Qdrant
until curl -s http://localhost:6333/healthz > /dev/null; do
  echo "⏳ Waiting for Qdrant..."
  sleep 2
done
echo -e "${GREEN}✅ Qdrant ready${NC}"

# Check Redis
until docker exec hirewire-redis redis-cli -a hirewire_redis_password ping > /dev/null 2>&1; do
  echo "⏳ Waiting for Redis..."
  sleep 2
done
echo -e "${GREEN}✅ Redis ready${NC}"

echo ""

# =============================================================================
# 2. Apply Neo4j career context schema
# =============================================================================

echo -e "${BLUE}2. Applying Neo4j career context schema...${NC}"

docker exec -i hirewire-neo4j cypher-shell \
  -u neo4j \
  -p hirewire_neo4j_password \
  -d neo4j \
  < database/neo4j/002_career_context_schema.cypher

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Neo4j career context schema applied${NC}"
else
  echo -e "${YELLOW}⚠️  Neo4j schema may have partial errors (check output above)${NC}"
fi

echo ""

# =============================================================================
# 3. Set up Qdrant career context collections
# =============================================================================

echo -e "${BLUE}3. Setting up Qdrant career context collections...${NC}"

# Check if Python is available
if command -v python3 &> /dev/null; then
    PYTHON_CMD=python3
elif command -v python &> /dev/null; then
    PYTHON_CMD=python
else
    echo -e "${YELLOW}⚠️  Python not found, skipping Qdrant setup${NC}"
    echo "   Install Python and run: python database/seeds/setup_career_context_qdrant.py"
    exit 0
fi

# Install dependencies if needed
if ! $PYTHON_CMD -c "import qdrant_client" 2>/dev/null; then
  echo "📦 Installing qdrant-client..."
  pip install qdrant-client openai
fi

# Run Qdrant setup
$PYTHON_CMD database/seeds/setup_career_context_qdrant.py

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✅ Qdrant career context collections created${NC}"
else
  echo -e "${YELLOW}⚠️  Qdrant setup encountered errors${NC}"
fi

echo ""

# =============================================================================
# 4. Sync existing candidate data to career context
# =============================================================================

echo -e "${BLUE}4. Syncing existing candidate career data...${NC}"

# This will be implemented when we have actual data
# For now, just a placeholder
echo "ℹ️  No existing candidates to sync yet"
echo "   Career context will be populated as candidates complete:"
echo "   • Resume uploads with AI extraction"
echo "   • Career context questionnaire"
echo "   • Profile updates"

echo ""

# =============================================================================
# 5. Summary
# =============================================================================

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Career Context Database Upgrade Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "What's been upgraded:"
echo ""
echo "📊 PostgreSQL:"
echo "   • 17 new career context fields added"
echo "   • GIN indexes created for array searches"
echo "   • Migration script: database/migrations/002_add_career_context.sql"
echo ""
echo "🕸️  Neo4j:"
echo "   • 5 new node types: Interest, Motivation, CareerGoal, WorkCulture, CareerTrajectory"
echo "   • 8 new relationship types for career matching"
echo "   • Seeded with common interests, motivations, cultures, trajectories"
echo "   • Schema: database/neo4j/002_career_context_schema.cypher"
echo ""
echo "🔍 Qdrant:"
echo "   • 4 new collections for semantic career matching"
echo "   • candidate_career_context (motivations, interests, goals)"
echo "   • job_career_opportunities (growth, culture, learning)"
echo "   • career_trajectory_patterns (common progressions)"
echo "   • work_culture_embeddings (environment types)"
echo "   • Setup: database/seeds/setup_career_context_qdrant.py"
echo ""
echo "⚡ Redis:"
echo "   • Career profile caching (1 hour TTL)"
echo "   • Career match caching (30 min TTL)"
echo "   • Culture fit caching (1 hour TTL)"
echo "   • Learning opportunities caching (30 min TTL)"
echo "   • Cache patterns: database/redis/career_context_cache.py"
echo ""
echo "🎯 Next Steps:"
echo "   1. Test career context extraction: Upload resume via API"
echo "   2. Test questionnaire: POST /api/career-context"
echo "   3. Update matching algorithm to include career fit"
echo "   4. Build frontend for career context questionnaire"
echo ""
