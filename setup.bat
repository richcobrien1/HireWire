@echo off
REM HireWire - Quick Setup Script (Windows)
REM This script sets up the complete local development environment

echo ==========================================
echo HireWire - Local Development Setup
echo ==========================================
echo.

REM Check if Docker is running
echo Checking prerequisites...
docker info >nul 2>&1
if errorlevel 1 (
    echo X Docker is not running. Please start Docker Desktop.
    exit /b 1
)
echo + Docker is running
echo.

REM Start all databases
echo Starting databases...
docker-compose up -d

REM Wait for services to be ready
echo.
echo Waiting for services to initialize...

REM Wait for PostgreSQL
echo   PostgreSQL...
:wait_postgres
docker exec hirewire-postgres pg_isready -U hirewire >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_postgres
)
echo   + PostgreSQL ready

REM Wait for Redis
echo   Redis...
:wait_redis
docker exec hirewire-redis redis-cli -a hirewire_redis_password ping >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_redis
)
echo   + Redis ready

REM Wait for Neo4j
echo   Neo4j (this may take 60+ seconds)...
set /a counter=0
:wait_neo4j
docker exec hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password "RETURN 1" >nul 2>&1
if errorlevel 1 (
    timeout /t 2 /nobreak >nul
    set /a counter+=1
    if %counter% LSS 30 goto wait_neo4j
    echo   ! Neo4j timeout (may still be starting)
    goto skip_neo4j
)
echo   + Neo4j ready
:skip_neo4j

REM Wait for Qdrant
echo   Qdrant...
:wait_qdrant
curl -s http://localhost:6333/healthz >nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak >nul
    goto wait_qdrant
)
echo   + Qdrant ready

REM Initialize Neo4j schema
echo.
echo Initializing Neo4j graph schema...
docker exec -i hirewire-neo4j cypher-shell -u neo4j -p hirewire_neo4j_password < database\neo4j\001_init_schema.cypher >nul 2>&1
if errorlevel 1 (
    echo ! Neo4j schema initialization failed (you can run it manually)
) else (
    echo + Neo4j schema initialized
)

REM Load sample data
echo.
echo Loading sample data to PostgreSQL...
docker exec -i hirewire-postgres psql -U hirewire -d hirewire_dev < database\seeds\002_sample_data.sql >nul 2>&1
if errorlevel 1 (
    echo ! Sample data loading failed (you can run it manually)
) else (
    echo + Sample data loaded
)

REM Initialize Qdrant
echo.
echo Initializing Qdrant collections...
where python >nul 2>&1
if errorlevel 1 (
    echo ! Python not found. Run manually: python database\seeds\setup_qdrant.py
) else (
    python database\seeds\setup_qdrant.py >nul 2>&1
    if errorlevel 1 (
        echo ! Qdrant setup failed (run manually: python database\seeds\setup_qdrant.py)
    ) else (
        echo + Qdrant collections created
    )
)

REM Summary
echo.
echo ==========================================
echo + Setup Complete!
echo ==========================================
echo.
echo Your HireWire development environment is ready!
echo.
echo Access Points:
echo   PostgreSQL:  localhost:5432 (user: hirewire, pass: hirewire_dev_password)
echo   Redis:       localhost:6379 (pass: hirewire_redis_password)
echo   Neo4j:       http://localhost:7474 (user: neo4j, pass: hirewire_neo4j_password)
echo   Qdrant:      http://localhost:6333
echo.
echo Management UIs (optional):
echo   Start with: docker-compose --profile tools up -d
echo   pgAdmin:     http://localhost:5050
echo   Redis UI:    http://localhost:8081
echo.
echo Next steps:
echo   1. Explore the databases (see DEV_SETUP.md)
echo   2. Try sample queries (see DATABASE_SCHEMA.md)
echo   3. Start building the API!
echo.
echo To stop: docker-compose down
echo To reset: docker-compose down -v ^&^& setup.bat
echo.
pause
