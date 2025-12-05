# HireWire - Local Development Setup Guide

**Last Updated:** December 5, 2025

This guide will help you set up the HireWire development environment on your local machine.

---

## Prerequisites

### Required Software

- **Docker Desktop** (20.10+) - [Download](https://www.docker.com/products/docker-desktop/)
- **Docker Compose** (2.0+) - Included with Docker Desktop
- **Git** - For version control
- **Node.js** (18+) - For running scripts and tools
- **Python** (3.10+) - For Qdrant setup script

### Optional (but recommended)

- **VS Code** - With Docker, PostgreSQL, and Python extensions
- **Postman** or **Insomnia** - For API testing
- **OpenAI API Key** - For generating embeddings (test data)

---

## Quick Start (5 Minutes)

### 1. Start All Databases

From the project root directory:

```bash
# Start all databases (PostgreSQL, Redis, Neo4j, Qdrant)
docker-compose up -d

# Check that all containers are running
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
hirewire-postgres       Up 10 seconds       0.0.0.0:5432->5432/tcp
hirewire-redis          Up 10 seconds       0.0.0.0:6379->6379/tcp
hirewire-neo4j          Up 10 seconds       0.0.0.0:7474->7474/tcp, 0.0.0.0:7687->7687/tcp
hirewire-qdrant         Up 10 seconds       0.0.0.0:6333->6333/tcp
```

### 2. Wait for Services to Initialize

All services need time to start up (especially Neo4j):

```bash
# Watch logs to see when services are ready
docker-compose logs -f

# Press Ctrl+C when you see "Started" messages from all services
```

Look for these success messages:
- **PostgreSQL:** `database system is ready to accept connections`
- **Redis:** `Ready to accept connections`
- **Neo4j:** `Remote interface available at http://localhost:7474/`
- **Qdrant:** `Qdrant gRPC listening on 6334`

### 3. Verify Database Connections

Run this quick test:

```bash
# Test PostgreSQL
docker exec hirewire-postgres pg_isready -U hirewire

# Test Redis
docker exec hirewire-redis redis-cli -a hirewire_redis_password ping

# Test Neo4j (should return "1")
docker exec hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password "RETURN 1"

# Test Qdrant
curl http://localhost:6333/healthz
```

All should return success messages!

### 4. Initialize Neo4j Graph Schema

```bash
# Run the Cypher initialization script
docker exec -i hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password < database/neo4j/001_init_schema.cypher
```

### 5. Initialize Qdrant Collections

```bash
# Install Python dependencies
pip install qdrant-client openai

# Set your OpenAI API key (optional, for sample data)
export OPENAI_API_KEY=your_key_here

# Run the setup script
python database/seeds/setup_qdrant.py
```

### 6. Load Sample Data (Optional)

```bash
# Load sample candidates, companies, and jobs
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < database/seeds/002_sample_data.sql
```

---

## Access Points

### Database Web UIs

Once everything is running, you can access:

| Service | URL | Credentials |
|---------|-----|-------------|
| **PostgreSQL (pgAdmin)** | http://localhost:5050 | Email: `admin@hirewire.local`<br>Password: `admin` |
| **Neo4j Browser** | http://localhost:7474 | Username: `neo4j`<br>Password: `hirewire_neo4j_password` |
| **Redis Commander** | http://localhost:8081 | (No auth required) |
| **Qdrant Dashboard** | http://localhost:6333/dashboard | (No auth required) |

**Note:** pgAdmin and Redis Commander are in the `tools` profile and need to be started separately:

```bash
docker-compose --profile tools up -d
```

### Direct Database Connections

Use these connection strings in your applications:

**PostgreSQL:**
```
Host: localhost
Port: 5432
Database: hirewire_dev
Username: hirewire
Password: hirewire_dev_password

Connection String:
postgresql://hirewire:hirewire_dev_password@localhost:5432/hirewire_dev
```

**Redis:**
```
Host: localhost
Port: 6379
Password: hirewire_redis_password

Connection String:
redis://:hirewire_redis_password@localhost:6379/0
```

**Neo4j:**
```
HTTP: http://localhost:7474
Bolt: bolt://localhost:7687
Username: neo4j
Password: hirewire_neo4j_password

Connection String:
bolt://neo4j:hirewire_neo4j_password@localhost:7687
```

**Qdrant:**
```
HTTP: http://localhost:6333
gRPC: localhost:6334
API Key: hirewire_qdrant_api_key

Connection String:
http://localhost:6333
```

---

## Testing the Setup

### Test PostgreSQL

```bash
# Connect to PostgreSQL
docker exec -it hirewire-postgres psql -U hirewire -d hirewire_dev

# Run some queries
SELECT COUNT(*) FROM users;
SELECT COUNT(*) FROM skills;
SELECT COUNT(*) FROM jobs;

# Exit
\q
```

### Test Neo4j

Open http://localhost:7474 in your browser, login, then run:

```cypher
// Count all nodes
MATCH (n)
RETURN labels(n)[0] as NodeType, count(n) as Count
ORDER BY Count DESC;

// View skills graph
MATCH (s:Skill)
RETURN s
LIMIT 20;

// Find skill relationships
MATCH (s1:Skill)-[r]-(s2:Skill)
RETURN s1.name, type(r), s2.name
LIMIT 10;
```

### Test Qdrant

```bash
# Check collections
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/candidate_profiles

# Search (requires sample data)
curl -X POST http://localhost:6333/collections/candidate_profiles/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.3],
    "limit": 5
  }'
```

### Test Redis

```bash
# Connect to Redis CLI
docker exec -it hirewire-redis redis-cli -a hirewire_redis_password

# Test commands
PING
SET test_key "Hello HireWire"
GET test_key
DEL test_key

# Exit
exit
```

---

## Database Schema Verification

### View PostgreSQL Tables

```sql
-- List all tables
\dt

-- View table structure
\d users
\d candidate_profiles
\d jobs
\d matches

-- View indexes
\di

-- View constraints
\d+ candidate_profiles
```

### View Neo4j Schema

```cypher
// List all constraints
SHOW CONSTRAINTS;

// List all indexes
SHOW INDEXES;

// View node labels
CALL db.labels();

// View relationship types
CALL db.relationshipTypes();
```

### View Qdrant Collections

```python
from qdrant_client import QdrantClient

client = QdrantClient(url="http://localhost:6333")

# List collections
collections = client.get_collections()
for collection in collections.collections:
    print(f"Collection: {collection.name}")
    
# Get collection details
info = client.get_collection("candidate_profiles")
print(f"Points: {info.points_count}")
print(f"Vector size: {info.config.params.vectors.size}")
```

---

## Common Tasks

### Stop All Services

```bash
docker-compose down
```

### Stop and Remove All Data (Fresh Start)

```bash
# WARNING: This deletes all data!
docker-compose down -v

# Then start fresh
docker-compose up -d
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f neo4j
docker-compose logs -f qdrant
```

### Restart a Single Service

```bash
docker-compose restart postgres
docker-compose restart neo4j
```

### Run Migrations Again

```bash
# PostgreSQL (re-run migrations)
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < database/migrations/001_initial_schema.sql

# Neo4j (re-run schema)
docker exec -i hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password < database/neo4j/001_init_schema.cypher
```

---

## Troubleshooting

### PostgreSQL won't start

```bash
# Check logs
docker-compose logs postgres

# Common issue: Port 5432 already in use
# Solution: Stop other PostgreSQL instances or change port in docker-compose.yml
```

### Neo4j takes forever to start

```bash
# Neo4j needs 60+ seconds on first start
# Watch logs to see progress
docker-compose logs -f neo4j

# Wait for: "Remote interface available at http://localhost:7474/"
```

### Can't connect to Qdrant

```bash
# Check if container is running
docker-compose ps qdrant

# Check logs
docker-compose logs qdrant

# Verify health
curl http://localhost:6333/healthz
```

### Redis connection refused

```bash
# Check if Redis is running
docker-compose ps redis

# Test connection with password
docker exec hirewire-redis redis-cli -a hirewire_redis_password ping
```

### Docker is using too much disk space

```bash
# Clean up unused Docker resources
docker system prune -a --volumes

# Then rebuild
docker-compose up -d
```

---

## Next Steps

Once your local environment is running:

1. **Explore the data** - Connect to each database and browse the sample data
2. **Test queries** - Try the example queries from `DATABASE_SCHEMA.md`
3. **Build the API** - Start building the backend services (Node.js + Python)
4. **Connect from code** - Use the connection strings to connect your applications

---

## Development Workflow

### Daily Development

```bash
# Start databases
docker-compose up -d

# Work on your code...

# Stop databases when done
docker-compose down
```

### Reset Test Data

```bash
# Drop and recreate sample data
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev -c "TRUNCATE users CASCADE;"
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < database/seeds/002_sample_data.sql
```

### Backup Local Data

```bash
# Backup PostgreSQL
docker exec hirewire-postgres pg_dump -U hirewire hirewire_dev > backup.sql

# Restore PostgreSQL
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < backup.sql
```

---

## Performance Tips

### Increase Docker Resources

If databases are slow, increase Docker Desktop resources:
- **Memory:** 4GB minimum, 8GB recommended
- **CPUs:** 2 minimum, 4 recommended
- **Disk:** 20GB minimum

### Use SSD Storage

Mount Docker volumes on SSD for better performance.

### Close Unused Services

If you're only working with PostgreSQL:

```bash
# Start only specific services
docker-compose up -d postgres redis
```

---

## Useful Commands Cheat Sheet

```bash
# Docker Compose
docker-compose up -d              # Start all services
docker-compose down               # Stop all services
docker-compose ps                 # List running services
docker-compose logs -f [service]  # View logs
docker-compose restart [service]  # Restart service

# PostgreSQL
docker exec -it hirewire-postgres psql -U hirewire -d hirewire_dev
\dt                               # List tables
\d [table]                        # Describe table
\q                                # Quit

# Neo4j
docker exec -it hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password
MATCH (n) RETURN n LIMIT 10;     # Query nodes
:exit                            # Quit

# Redis
docker exec -it hirewire-redis redis-cli -a hirewire_redis_password
KEYS *                           # List all keys
GET [key]                        # Get value
exit                             # Quit

# Qdrant
curl http://localhost:6333/collections                    # List collections
curl http://localhost:6333/collections/candidate_profiles # Collection info
```

---

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Try restarting: `docker-compose restart`
4. Fresh start: `docker-compose down -v && docker-compose up -d`

---

**Your local HireWire development environment is ready! 🚀**
