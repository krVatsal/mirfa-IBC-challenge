# Start Secure Transaction Service
Write-Host "Starting Secure Transaction Service..." -ForegroundColor Cyan
Write-Host ""
Write-Host "Installing dependencies..." -ForegroundColor Yellow
pnpm install
Write-Host ""
Write-Host "Building packages..." -ForegroundColor Yellow
Set-Location packages\crypto
pnpm build
Set-Location ..\..
Write-Host ""
Write-Host "Starting development servers..." -ForegroundColor Green
Write-Host "API will run on http://localhost:3001" -ForegroundColor Green
Write-Host "Web will run on http://localhost:3000" -ForegroundColor Green
Write-Host ""
pnpm dev
