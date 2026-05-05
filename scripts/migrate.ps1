# migrate.ps1
# Runs Drizzle ORM migrations against the target environment's RDS instance.
# Reads DB connection details from SSM Parameter Store — no hardcoded values.
#
# Usage:
#   .\scripts\migrate.ps1 -Environment dev -Profile myordering-dev
#
# Prerequisites:
#   - Foundation stack deployed (RDS is running)
#   - SSM parameters bootstrapped (bootstrap-ssm.ps1 completed)
#   - npm install has been run at repo root

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Environment,

    [Parameter(Mandatory = $false)]
    [string]$Profile = "default",

    [Parameter(Mandatory = $false)]
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$msg) Write-Host "    [OK] $msg" -ForegroundColor Green }

function Get-SSMValue {
    param([string]$Name, [switch]$WithDecryption)
    $args = @("ssm", "get-parameter", "--name", $Name, "--profile", $Profile, "--region", $Region, "--query", "Parameter.Value", "--output", "text")
    if ($WithDecryption) { $args += "--with-decryption" }
    return (& aws @args).Trim()
}

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  DB Migration -- Environment: $Environment" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# ── FETCH DB CONNECTION FROM SSM ──────────────────────────────────────────────
Write-Step "Fetching DB connection details from SSM..."

$dbHost     = Get-SSMValue -Name "/myordering/$Environment/db/host"
$dbPort     = Get-SSMValue -Name "/myordering/$Environment/db/port"
$dbName     = Get-SSMValue -Name "/myordering/$Environment/db/name"
$dbUser     = Get-SSMValue -Name "/myordering/$Environment/db/username"
$dbPassword = Get-SSMValue -Name "/myordering/$Environment/db/password" -WithDecryption

Write-OK "DB Host: $dbHost"
Write-OK "DB Port: $dbPort"
Write-OK "DB Name: $dbName"
Write-OK "DB User: $dbUser"

# ── SET ENV VARS FOR DRIZZLE ──────────────────────────────────────────────────
Write-Step "Setting environment variables for Drizzle..."

$env:DATABASE_HOST     = $dbHost
$env:DATABASE_PORT     = $dbPort
$env:DATABASE_NAME     = $dbName
$env:DATABASE_USER     = $dbUser
$env:DATABASE_PASSWORD = $dbPassword
$env:DATABASE_SSL      = if ($Environment -eq "dev") { "true" } else { "true" }
# Allow self-signed certs (RDS uses AWS CA — trust it without validating chain locally)
$env:NODE_TLS_REJECT_UNAUTHORIZED = "0"

# ── RUN DRIZZLE-KIT PUSH ──────────────────────────────────────────────────────
Write-Step "Running Drizzle migration (drizzle-kit push)..."
Write-Host "    Target: ${dbHost}:${dbPort}/${dbName}"
Write-Host ""

# drizzle-kit push applies schema changes directly (no migration files needed for early dev)
# Switch to drizzle-kit migrate when moving to staging/prod
# Note: drizzle-kit v0.20.x uses 'push:pg' — v0.21+ uses 'push'
npx drizzle-kit push:pg --config=drizzle.config.ts

if ($LASTEXITCODE -ne 0) {
    Write-Host "`n[ERROR] Migration failed. Check the error above." -ForegroundColor Red
    exit 1
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  Migration complete." -ForegroundColor Green
Write-Host "  Next step: .\scripts\deploy-services.ps1 -Environment $Environment -Profile $Profile" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
