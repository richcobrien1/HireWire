@echo off
REM HireWire Development Setup Script for Windows
REM Sets up the complete development environment with all services

echo 🚀 Starting HireWire Development Environment...
echo.

REM Check if .env exists
if not exist .env (
    echo ⚠️  .env file not found
    echo Creating .env from .env.example...
    copy .env.example .env
    echo ❌ Please edit .env and add your OPENAI_API_KEY
    echo    Then run this script again.
    exit /b 1
)

REM Check if OPENAI_API_KEY is set
findstr /C:"OPENAI_API_KEY=sk-" .env >nul
if errorlevel 1 (
    echo ❌ OPENAI_API_KEY not set in .env file
    echo    Please add your OpenAI API key to .env
    exit /b 1
)

echo 📦 Building and starting all services...
docker-compose up -d --build

echo.
echo ⏳ Waiting for services to be healthy...

REM Wait for services (simplified for Windows)
timeout /t 10 /nobreak >nul

echo.
echo ✅ HireWire development environment is ready!
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo 🎯 Service Access Points:
echo.
echo   📡 API Gateway:        http://localhost:4000
echo   🤖 Resume Parser:      http://localhost:8000
echo   🐘 PostgreSQL:         localhost:5432
echo   📊 Neo4j Browser:      http://localhost:7474
echo   🔍 Qdrant Dashboard:   http://localhost:6333/dashboard
echo   💾 Redis:              localhost:6379
echo.
echo 🛠️  Management Tools (optional):
echo   Run: docker-compose --profile tools up -d
echo   📊 pgAdmin:            http://localhost:5050
echo   💾 Redis Commander:    http://localhost:8081
echo.
echo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
echo.
echo 📝 Quick Commands:
echo   View logs:         docker-compose logs -f
echo   Stop services:     docker-compose down
echo   Reset everything:  docker-compose down -v
echo.
echo Happy coding! 🚀
