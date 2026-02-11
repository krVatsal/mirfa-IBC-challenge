@echo off
echo Starting Secure Transaction Service...
echo.
echo Installing dependencies...
call pnpm install
echo.
echo Building packages...
cd packages\crypto
call pnpm build
cd ..\..
echo.
echo Starting development servers...
echo API will run on http://localhost:3001
echo Web will run on http://localhost:3000
echo.
call pnpm dev
