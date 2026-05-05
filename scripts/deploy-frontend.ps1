# deploy-frontend.ps1
# Builds and deploys a frontend app to S3 + invalidates CloudFront cache.
#
# Usage:
#   .\scripts\deploy-frontend.ps1 -App user-client -Env dev -Profile myordering-dev
#   .\scripts\deploy-frontend.ps1 -App merchant-dashboard -Env dev -Profile myordering-dev
#   .\scripts\deploy-frontend.ps1 -App kds -Env dev -Profile myordering-dev
#
# Supported apps (web-only — kiosk and pos are Electron, not deployed here):
#   user-client | merchant-dashboard | kds

param(
    [Parameter(Mandatory)]
    [ValidateSet("user-client", "merchant-dashboard", "kds")]
    [string]$App,

    [Parameter(Mandatory)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Env,

    [string]$Profile = "default"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Frontend Deploy: $App -> $Env" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# ── 1. Read outputs from foundation stack ─────────────────────────────────────

$outputsFile = "infrastructure/params/$Env.outputs.json"
if (-not (Test-Path $outputsFile)) {
    Write-Error "Foundation outputs not found at $outputsFile. Run deploy-foundation.ps1 first."
}

$outputs = Get-Content $outputsFile | ConvertFrom-Json

$frontendBucket    = $outputs.FrontendBucketName
$distributionId    = $outputs.CloudFrontDistributionId
$apiGatewayUrl     = $outputs.ApiGatewayUrl   # set by deploy-services.ps1

if (-not $frontendBucket) {
    Write-Error "FrontendBucketName not found in $outputsFile. Re-run deploy-foundation.ps1."
}
if (-not $distributionId) {
    Write-Error "CloudFrontDistributionId not found in $outputsFile. Re-run deploy-foundation.ps1."
}

Write-Host "Frontend bucket  : $frontendBucket"
Write-Host "Distribution ID  : $distributionId"
Write-Host ""

# ── 2. Build the app ──────────────────────────────────────────────────────────

$appDir = "frontend/$App"
if (-not (Test-Path $appDir)) {
    Write-Error "App directory not found: $appDir"
}

Write-Host "Building $App..." -ForegroundColor Yellow

Push-Location $appDir
try {
    # Inject runtime env vars for the Vite build
    $env:VITE_API_BASE_URL   = $apiGatewayUrl
    $env:VITE_APP_ENV        = $Env

    npm ci --silent
    npm run build
} finally {
    Pop-Location
}

$distDir = "$appDir/dist"
if (-not (Test-Path $distDir)) {
    Write-Error "Build output not found at $distDir. Check the build output above."
}

Write-Host "Build complete." -ForegroundColor Green
Write-Host ""

# ── 3. Sync to S3 (under app-specific prefix) ─────────────────────────────────
# Each app lives under its own prefix so a single bucket hosts all three apps:
#   s3://bucket/user-client/
#   s3://bucket/merchant-dashboard/
#   s3://bucket/kds/

$s3Prefix = "s3://$frontendBucket/$App/"

Write-Host "Syncing to $s3Prefix ..." -ForegroundColor Yellow

aws s3 sync $distDir $s3Prefix `
    --delete `
    --cache-control "public,max-age=31536000,immutable" `
    --exclude "index.html" `
    --profile $Profile

# Upload index.html separately with no-cache so CloudFront always serves fresh HTML
aws s3 cp "$distDir/index.html" "$s3Prefix`index.html" `
    --cache-control "no-cache,no-store,must-revalidate" `
    --profile $Profile

Write-Host "S3 sync complete." -ForegroundColor Green
Write-Host ""

# ── 4. CloudFront cache invalidation ─────────────────────────────────────────

Write-Host "Invalidating CloudFront cache for /$App/* ..." -ForegroundColor Yellow

aws cloudfront create-invalidation `
    --distribution-id $distributionId `
    --paths "/$App/*" `
    --profile $Profile | Out-Null

Write-Host "Cache invalidation submitted." -ForegroundColor Green
Write-Host ""

# ── 5. Print access URL ───────────────────────────────────────────────────────

$cloudfrontDomain = $outputs.CloudFrontDomain
Write-Host "========================================" -ForegroundColor Green
Write-Host "  Deploy complete!" -ForegroundColor Green
Write-Host "  URL: https://$cloudfrontDomain/$App/" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "NOTE: CloudFront invalidation may take 30-60 seconds to propagate." -ForegroundColor DarkYellow
Write-Host ""
