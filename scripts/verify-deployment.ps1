# verify-deployment.ps1
# Smoke-tests the deployed environment to confirm all services are running.
# Checks Lambda function states and API Gateway 401 responses (expected without JWT).
#
# Usage:
#   .\scripts\verify-deployment.ps1 -Environment dev -Profile myordering-dev

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

function Write-Step  { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK    { param([string]$msg) Write-Host "    [OK]   $msg" -ForegroundColor Green }
function Write-Fail  { param([string]$msg) Write-Host "    [FAIL] $msg" -ForegroundColor Red; $script:failures++ }
function Write-Warn  { param([string]$msg) Write-Host "    [WARN] $msg" -ForegroundColor Yellow }

$script:failures = 0

# All Lambda functions that should exist after full deployment
$expectedFunctions = @(
    "auth-pre-signup-trigger-$Environment",
    "auth-post-confirmation-trigger-$Environment",
    "auth-token-validator-$Environment",
    "auth-register-handler-$Environment",
    "auth-login-handler-$Environment",
    "auth-refresh-handler-$Environment",
    "auth-logout-handler-$Environment",
    "store-get-handler-$Environment",
    "store-create-handler-$Environment",
    "store-update-handler-$Environment",
    "store-update-status-handler-$Environment",
    "menu-get-handler-$Environment",
    "menu-create-handler-$Environment",
    "menu-update-handler-$Environment",
    "menu-delete-handler-$Environment",
    "menu-availability-handler-$Environment",
    "order-create-handler-$Environment",
    "order-get-handler-$Environment",
    "order-list-handler-$Environment",
    "order-update-status-handler-$Environment",
    "order-cancel-handler-$Environment",
    "order-payment-update-$Environment",
    "inventory-get-handler-$Environment",
    "inventory-update-handler-$Environment",
    "inventory-reserve-handler-$Environment",
    "inventory-commit-handler-$Environment",
    "payment-create-intent-$Environment",
    "payment-charge-handler-$Environment",
    "payment-refund-handler-$Environment",
    "payment-webhook-handler-$Environment",
    "profile-get-handler-$Environment",
    "profile-update-handler-$Environment",
    "profile-orders-handler-$Environment",
    "device-register-handler-$Environment",
    "device-print-job-handler-$Environment",
    "notification-send-handler-$Environment",
    "notification-dispatcher-$Environment",
    "notification-websocket-connect-$Environment",
    "notification-websocket-disconnect-$Environment"
)

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Deployment Verification -- Environment: $Environment" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# ── CHECK LAMBDA FUNCTIONS ────────────────────────────────────────────────────
Write-Step "Checking Lambda function states..."

foreach ($fnName in $expectedFunctions) {
    try {
        $state = aws lambda get-function-configuration `
            --function-name $fnName `
            --profile $Profile `
            --region $Region `
            --query "State" `
            --output text 2>$null

        if ($state -eq "Active") {
            Write-OK $fnName
        } else {
            Write-Fail "$fnName — state: $state (expected Active)"
        }
    } catch {
        Write-Fail "$fnName — NOT FOUND"
    }
}

# ── CHECK API GATEWAY ENDPOINTS ───────────────────────────────────────────────
Write-Step "Checking API Gateway endpoints (expect HTTP 401 without JWT)..."

$services = @("auth-service", "store-service", "menu-service", "order-service", "inventory-service", "payment-service")

foreach ($svc in $services) {
    $stackName  = "myordering-$svc-$Environment"
    $outputKey  = ($svc -replace "-service", "").Substring(0,1).ToUpper() + ($svc -replace "-service", "").Substring(1) + "ApiUrl"

    try {
        $apiUrl = (aws cloudformation describe-stacks `
            --stack-name $stackName `
            --profile $Profile `
            --region $Region `
            --query "Stacks[0].Outputs[?OutputKey=='${outputKey}'].OutputValue" `
            --output text 2>$null).Trim()

        if ($apiUrl) {
            # Hit a known endpoint — expect 401 (no JWT)
            $testUrl = "$apiUrl/api/v1/test-probe"
            try {
                $response = Invoke-WebRequest -Uri $testUrl -Method GET -ErrorAction SilentlyContinue
                Write-Warn "$svc API returned $($response.StatusCode) — expected 401 for unauthenticated request"
            } catch {
                $statusCode = $_.Exception.Response.StatusCode.value__
                if ($statusCode -eq 401 -or $statusCode -eq 403) {
                    Write-OK "$svc API responding at $apiUrl (HTTP $statusCode — correct)"
                } else {
                    Write-Warn "$svc API returned HTTP $statusCode (expected 401/403)"
                }
            }
        } else {
            Write-Warn "$svc — could not retrieve API URL from stack outputs"
        }
    } catch {
        Write-Warn "$svc — stack not found or outputs unavailable"
    }
}

# ── CHECK SSM PARAMETERS ──────────────────────────────────────────────────────
Write-Step "Checking critical SSM parameters..."

$criticalParams = @(
    "/myordering/$Environment/db/host",
    "/myordering/$Environment/redis/host",
    "/myordering/$Environment/cognito/user-pool-id",
    "/myordering/$Environment/eventbridge/bus-name",
    "/myordering/$Environment/stripe/secret-key"
)

foreach ($param in $criticalParams) {
    try {
        aws ssm get-parameter --name $param --profile $Profile --region $Region | Out-Null
        Write-OK $param
    } catch {
        Write-Fail "$param — NOT FOUND"
    }
}

# ── SUMMARY ───────────────────────────────────────────────────────────────────
Write-Host ""
if ($script:failures -eq 0) {
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "  All checks passed. Deployment looks good." -ForegroundColor Green
    Write-Host "============================================`n" -ForegroundColor Green
} else {
    Write-Host "============================================" -ForegroundColor Red
    Write-Host "  $($script:failures) check(s) failed. Review errors above." -ForegroundColor Red
    Write-Host "============================================`n" -ForegroundColor Red
    exit 1
}
