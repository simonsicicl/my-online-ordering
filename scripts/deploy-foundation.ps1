# deploy-foundation.ps1
# Builds and deploys the foundation stack (VPC, RDS, Redis, Cognito, EventBridge, S3).
# Run this FIRST when setting up a new AWS account.
# Safe to re-run — CloudFormation will only update changed resources.
#
# Usage:
#   .\scripts\deploy-foundation.ps1 -Env dev -Profile myordering-dev
#
# You will be prompted for DBMasterPassword on first run.
# On subsequent runs (updates), provide the same password.

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Env,

    [Parameter(Mandatory = $false)]
    [string]$Profile = "default",

    [Parameter(Mandatory = $false)]
    [string]$Region = "us-east-1"
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$msg) Write-Host "    [OK] $msg" -ForegroundColor Green }

$stackName    = "myordering-foundation-$Env"
$templatePath = "infrastructure/foundation/template.yaml"
$outputFile   = "infrastructure/params/$Env.outputs.json"

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Foundation Deploy — Environment: $Env" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# ── PROMPT FOR DB PASSWORD ────────────────────────────────────────────────────
Write-Step "DB Master Password..."
Write-Host "    IMPORTANT: Use the same password every time you deploy this environment."
Write-Host "    Store it somewhere safe (e.g. password manager). This is the only place it's entered."
$dbPassword = Read-Host "    Enter DB Master Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)

# ── SAM BUILD ─────────────────────────────────────────────────────────────────
Write-Step "Building foundation stack..."
sam build `
    --template-file $templatePath `
    --profile $Profile `
    --region $Region

if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] sam build failed." -ForegroundColor Red; exit 1 }
Write-OK "Build complete"

# ── SAM DEPLOY ────────────────────────────────────────────────────────────────
Write-Step "Deploying foundation stack to AWS ($Env)..."
Write-Host "    Stack name: $stackName"
Write-Host "    This may take 10-20 minutes on first run (RDS takes time to provision)."
Write-Host ""

sam deploy `
    --template-file $templatePath `
    --stack-name $stackName `
    --parameter-overrides "AppEnv=$Env DBMasterPassword=$dbPasswordPlain" `
    --capabilities CAPABILITY_IAM `
    --profile $Profile `
    --region $Region `
    --no-fail-on-empty-changeset

if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] sam deploy failed." -ForegroundColor Red; exit 1 }
Write-OK "Deployment complete"

# ── CAPTURE OUTPUTS ───────────────────────────────────────────────────────────
Write-Step "Capturing stack outputs to $outputFile..."

New-Item -ItemType Directory -Force -Path "infrastructure/params" | Out-Null

$outputs = aws cloudformation describe-stacks `
    --stack-name $stackName `
    --profile $Profile `
    --region $Region `
    --query "Stacks[0].Outputs" `
    --output json

$outputs | Out-File -FilePath $outputFile -Encoding UTF8
Write-OK "Outputs saved to $outputFile"

# Print key outputs for reference
$outputObj = $outputs | ConvertFrom-Json
foreach ($output in $outputObj) {
    Write-Host "    $($output.OutputKey): $($output.OutputValue)" -ForegroundColor Gray
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  Foundation stack deployed successfully." -ForegroundColor Green
Write-Host "  Next step: .\scripts\bootstrap-ssm.ps1 -Env $Env -Profile $Profile" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
