# bootstrap-ssm.ps1
# Populates all SSM Parameter Store secrets for a given environment.
# Non-secret values (DB host, Redis host, etc.) are already written by the foundation stack.
# This script handles SECRETS only — values that cannot be in CloudFormation templates.
#
# Usage:
#   .\scripts\bootstrap-ssm.ps1 -Env dev -Profile myordering-dev
#
# Run this AFTER deploy-foundation.ps1, BEFORE migrate.ps1 and deploy-services.ps1.

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
function Write-Warn { param([string]$msg) Write-Host "    [WARN] $msg" -ForegroundColor Yellow }

function Put-SSMSecret {
    param([string]$Name, [string]$Value, [string]$Description = "")
    aws ssm put-parameter `
        --name $Name `
        --value $Value `
        --type SecureString `
        --overwrite `
        --profile $Profile `
        --region $Region | Out-Null
    Write-OK "Written: $Name"
}

function Put-SSMString {
    param([string]$Name, [string]$Value)
    aws ssm put-parameter `
        --name $Name `
        --value $Value `
        --type String `
        --overwrite `
        --profile $Profile `
        --region $Region | Out-Null
    Write-OK "Written: $Name"
}

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  SSM Bootstrap -- Environment: $Environment" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# ── VERIFY FOUNDATION STACK EXISTS ────────────────────────────────────────────
Write-Step "Verifying foundation stack outputs..."
$stackName = "myordering-foundation-$Environment"
try {
    $stackStatus = aws cloudformation describe-stacks `
        --stack-name $stackName `
        --profile $Profile `
        --region $Region `
        --query "Stacks[0].StackStatus" `
        --output text
    Write-OK "Foundation stack status: $stackStatus"
} catch {
    Write-Host "`n[ERROR] Foundation stack '$stackName' not found." -ForegroundColor Red
    Write-Host "        Run deploy-foundation.ps1 first." -ForegroundColor Red
    exit 1
}

# ── DB PASSWORD ───────────────────────────────────────────────────────────────
Write-Step "Database password..."
Write-Host "    Enter the DB master password you used when deploying the foundation stack."
Write-Host "    (This must match DBMasterPassword parameter used in deploy-foundation.ps1)"
$dbPassword = Read-Host "    DB Password" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)
Put-SSMSecret -Name "/myordering/$Environment/db/password" -Value $dbPasswordPlain

# ── STRIPE ────────────────────────────────────────────────────────────────────
Write-Step "Stripe API keys..."
Write-Host "    Find these at: https://dashboard.stripe.com/apikeys"
Write-Host "    For dev/staging use TEST keys (sk_test_...)"

$stripeSecretKey = Read-Host "    Stripe Secret Key (sk_test_... or sk_live_...)" -AsSecureString
$stripeSecretKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($stripeSecretKey)
)
Put-SSMSecret -Name "/myordering/$Environment/stripe/secret-key" -Value $stripeSecretKeyPlain

$stripePublishableKey = Read-Host "    Stripe Publishable Key (pk_test_... or pk_live_...)"
Put-SSMString -Name "/myordering/$Env/stripe/publishable-key" -Value $stripePublishableKey

Write-Warn "Stripe webhook secret — set this AFTER deploying payment-service"
Write-Warn "Run: aws ssm put-parameter --name '/myordering/$Env/stripe/webhook-secret' --value 'whsec_...' --type SecureString --profile $Profile"

# ── CLOUDFRONT (OPTIONAL) ─────────────────────────────────────────────────────
Write-Step "CloudFront domain (optional — press Enter to skip)..."
$cfDomain = Read-Host "    CloudFront domain (e.g. dxxxx.cloudfront.net) or blank to skip"
if ($cfDomain) {
    Put-SSMString -Name "/myordering/$Environment/cloudfront/domain" -Value $cfDomain
} else {
    Write-Warn "Skipped. Add later: aws ssm put-parameter --name '/myordering/$Env/cloudfront/domain' ..."
}

# ── VERIFY ALL REQUIRED SSM PARAMETERS EXIST ──────────────────────────────────
Write-Step "Verifying all required SSM parameters exist..."

$required = @(
    "/myordering/$Environment/db/host",
    "/myordering/$Environment/db/port",
    "/myordering/$Environment/db/name",
    "/myordering/$Environment/db/username",
    "/myordering/$Environment/db/password",
    "/myordering/$Environment/redis/host",
    "/myordering/$Environment/redis/port",
    "/myordering/$Environment/cognito/user-pool-id",
    "/myordering/$Environment/cognito/client-id",
    "/myordering/$Environment/cognito/region",
    "/myordering/$Environment/eventbridge/bus-name",
    "/myordering/$Environment/stripe/secret-key",
    "/myordering/$Environment/stripe/publishable-key"
)

$allOk = $true
foreach ($param in $required) {
    try {
        aws ssm get-parameter --name $param --profile $Profile --region $Region | Out-Null
        Write-OK $param
    } catch {
        Write-Host "    [MISSING] $param" -ForegroundColor Red
        $allOk = $false
    }
}

if ($allOk) {
    Write-Host "`n============================================" -ForegroundColor Green
    Write-Host "  All SSM parameters verified. " -ForegroundColor Green
    Write-Host "  Next step: .\scripts\migrate.ps1 -Environment $Environment -Profile $Profile" -ForegroundColor Green
    Write-Host "============================================`n" -ForegroundColor Green
} else {
    Write-Host "`n[ERROR] Some SSM parameters are missing. Fix before proceeding." -ForegroundColor Red
    exit 1
}
