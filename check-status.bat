@echo off
cd C:\projects\DreamPath
echo [컨테이너 상태]
docker-compose ps
echo.
echo [최근 커밋 5개]
git log --oneline -5
pause
