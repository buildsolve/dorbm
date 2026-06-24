@echo off
set DATABASE_URL=file:./dev.db
set JWT_SECRET=cakeerp-secret-key
set JWT_EXPIRES_IN=24h
set PORT=4000
set FRONTEND_URL=http://localhost:3000
set NODE_ENV=development
set PATH=C:\Users\User\nodejs-portable\node-v20.11.1-win-x64;%PATH%
cd /d C:\Users\Public\cakeerp\backend
npx ts-node -r tsconfig-paths/register src/main.ts
