@echo off
echo ========================================
echo   DreamPath 개발 서버 시작
echo   %date% %time%
echo ========================================
echo.

cd C:\projects\DreamPath

echo [1/3] 최신 코드 가져오기...
git fetch origin
git pull origin main

echo [2/3] Docker 컨테이너 시작...
docker-compose up -d --build

echo [3/3] 상태 확인...
timeout /t 10 >nul
docker-compose ps

echo.
echo Frontend: http://localhost:3000
echo Backend:  http://localhost:8080
echo.
pause
