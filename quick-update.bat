@echo off
cd C:\projects\DreamPath
git pull origin main
docker-compose restart
pause
