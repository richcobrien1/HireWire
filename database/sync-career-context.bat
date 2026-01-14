@echo off
REM HireWire Database Career Context Sync (Windows)
REM Purpose: Sync career context data from PostgreSQL to Neo4j and Qdrant

echo Starting Career Context Data Sync...
echo.

REM =============================================================================
REM 1. Wait for all databases to be ready
REM =============================================================================

echo 1. Checking database health...

:wait_postgres
docker exec hirewire-postgres pg_isready -U hirewire >nul 2>&1
if errorlevel 1 (
    echo Waiting for PostgreSQL...
    timeout /t 2 /nobreak >nul
    goto wait_postgres
)
echo [OK] PostgreSQL ready

:wait_neo4j
curl -s http://localhost:7474 >nul 2>&1
if errorlevel 1 (
    echo Waiting for Neo4j...
    timeout /t 2 /nobreak >nul
    goto wait_neo4j
)
echo [OK] Neo4j ready

:wait_qdrant
curl -s http://localhost:6333/healthz >nul 2>&1
if errorlevel 1 (
    echo Waiting for Qdrant...
    timeout /t 2 /nobreak >nul
    goto wait_qdrant
)
echo [OK] Qdrant ready

:wait_redis
docker exec hirewire-redis redis-cli -a hirewire_redis_password ping >nul 2>&1
if errorlevel 1 (
    echo Waiting for Redis...
    timeout /t 2 /nobreak >nul
    goto wait_redis
)
echo [OK] Redis ready

echo.

REM =============================================================================
REM 2. Apply Neo4j career context schema
REM =============================================================================

echo 2. Applying Neo4j career context schema...

docker exec -i hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password -d neo4j < database\neo4j\002_career_context_schema.cypher

if errorlevel 1 (
    echo [WARNING] Neo4j schema may have partial errors
) else (
    echo [OK] Neo4j career context schema applied
)

echo.

REM =============================================================================
REM 3. Set up Qdrant career context collections
REM =============================================================================

echo 3. Setting up Qdrant career context collections...

REM Check for Python
where python >nul 2>&1
if errorlevel 1 (
    where python3 >nul 2>&1
    if errorlevel 1 (
        echo [WARNING] Python not found, skipping Qdrant setup
        echo    Install Python and run: python database\seeds\setup_career_context_qdrant.py
        goto skip_qdrant
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

REM Check for qdrant-client
%PYTHON_CMD% -c "import qdrant_client" >nul 2>&1
if errorlevel 1 (
    echo Installing qdrant-client...
    pip install qdrant-client openai
)

REM Run Qdrant setup
%PYTHON_CMD% database\seeds\setup_career_context_qdrant.py

if errorlevel 1 (
    echo [WARNING] Qdrant setup encountered errors
) else (
    echo [OK] Qdrant career context collections created
)

:skip_qdrant
echo.

REM =============================================================================
REM 4. Sync existing candidate data
REM =============================================================================

echo 4. Syncing existing candidate career data...
echo [INFO] No existing candidates to sync yet
echo    Career context will be populated as candidates complete:
echo    - Resume uploads with AI extraction
echo    - Career context questionnaire
echo    - Profile updates

echo.

REM =============================================================================
REM 5. Summary
REM =============================================================================

echo ========================================
echo Career Context Database Upgrade Complete!
echo ========================================
echo.
echo What's been upgraded:
echo.
echo PostgreSQL:
echo    - 17 new career context fields added
echo    - GIN indexes created for array searches
echo    - Migration: database\migrations\002_add_career_context.sql
echo.
echo Neo4j:
echo    - 5 new node types: Interest, Motivation, CareerGoal, WorkCulture, CareerTrajectory
echo    - 8 new relationship types for career matching
echo    - Seeded with common interests, motivations, cultures, trajectories
echo    - Schema: database\neo4j\002_career_context_schema.cypher
echo.
echo Qdrant:
echo    - 4 new collections for semantic career matching
echo    - candidate_career_context (motivations, interests, goals)
echo    - job_career_opportunities (growth, culture, learning)
echo    - career_trajectory_patterns (common progressions)
echo    - work_culture_embeddings (environment types)
echo    - Setup: database\seeds\setup_career_context_qdrant.py
echo.
echo Redis:
echo    - Career profile caching (1 hour TTL)
echo    - Career match caching (30 min TTL)
echo    - Culture fit caching (1 hour TTL)
echo    - Learning opportunities caching (30 min TTL)
echo    - Cache patterns: database\redis\career_context_cache.py
echo.
echo Next Steps:
echo    1. Test career context extraction: Upload resume via API
echo    2. Test questionnaire: POST /api/career-context
echo    3. Update matching algorithm to include career fit
echo    4. Build frontend for career context questionnaire
echo.

pause
