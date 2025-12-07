# HireWire Development Environment

Quick reference for local development with all 4 databases.

## One-Command Setup

**Windows:**
```bash
setup.bat
```

**Mac/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

This will:
- Start PostgreSQL, Redis, Neo4j, and Qdrant
- Initialize all schemas
- Load sample data
- Verify connections

## Manual Setup

See [DEV_SETUP.md](DEV_SETUP.md) for detailed instructions.

## Quick Commands

```bash
# Start all databases
docker-compose up -d

# Stop all databases
docker-compose down

# View logs
docker-compose logs -f

# Reset everything (WARNING: deletes all data)
docker-compose down -v
```

## Access Points

| Service | URL | Credentials |
|---------|-----|-------------|
| PostgreSQL | `localhost:5432` | User: `hirewire`<br>Pass: `hirewire_dev_password` |
| Redis | `localhost:6379` | Pass: `hirewire_redis_password` |
| Neo4j Browser | http://localhost:7474 | User: `neo4j`<br>Pass: `hirewire_neo4j_password` |
| Qdrant | http://localhost:6333 | API Key: `hirewire_qdrant_api_key` |

## Documentation

- **[DATABASE_PRIMER.md](DATABASE_PRIMER.md)** - Learn about graph & vector databases
- **[DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)** - Complete schema reference
- **[DEV_SETUP.md](DEV_SETUP.md)** - Detailed setup guide
- **[ARCHITECTURE.md](ARCHITECTURE.md)** - System architecture overview

## Sample Queries

### PostgreSQL
```sql
-- View all candidates
SELECT * FROM candidate_profiles;

-- View all jobs
SELECT * FROM jobs;

-- Count skills
SELECT COUNT(*) FROM skills;
```

### Neo4j
```cypher
// View skill graph
MATCH (s:Skill)
RETURN s
LIMIT 20;

// Find skill relationships
MATCH (s1:Skill)-[r]-(s2:Skill)
RETURN s1.name, type(r), s2.name;
```

### Qdrant
```bash
# List collections
curl http://localhost:6333/collections

# Get collection info
curl http://localhost:6333/collections/candidate_profiles
```

### Redis
```bash
# Connect to Redis CLI
docker exec -it hirewire-redis redis-cli -a hirewire_redis_password

# Test commands
PING
KEYS *
```

## Troubleshooting

**Services won't start?**
- Ensure Docker Desktop is running
- Check if ports are available (5432, 6379, 7474, 7687, 6333)
- Try: `docker-compose down -v && docker-compose up -d`

**Neo4j taking forever?**
- Neo4j needs 60+ seconds on first start
- Watch logs: `docker-compose logs -f neo4j`
- Look for: "Remote interface available"

**Need help?**
- Check logs: `docker-compose logs -f`
- See detailed guide: [DEV_SETUP.md](DEV_SETUP.md)

## Next Steps

1. ✅ Databases are running
2. Explore the sample data
3. Try the example queries
4. Start building the API services
5. Build the matching engine

Happy coding! 🚀
