# verify-deployment.ps1
# Smoke-tests the deployed environment to confirm all services are running.
# Checks Lambda function states and API Gateway 401 responses (expected without JWT).
#
# Usage:
#   .\scripts\verify-deployment.ps1 -Env dev -Profile myordering-dev

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

function Write-Step  { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK    { param([string]$msg) Write-Host "    [OK]   $msg" -ForegroundColor Green }
function Write-Fail  { param([string]$msg) Write-Host "    [FAIL] $msg" -ForegroundColor Red; $script:failures++ }
function Write-Warn  { param([string]$msg) Write-Host "    [WARN] $msg" -ForegroundColor Yellow }

$script:failures = 0

# All Lambda functions that should exist after full deployment
$expectedFunctions = @(
    "auth-pre-signup-trigger-$Env",
    "auth-post-confirmation-trigger-$Env",
    "auth-token-validator-$Env",
    "auth-register-handler-$Env",
    "auth-login-handler-$Env",
    "auth-refresh-handler-$Env",
    "auth-logout-handler-$Env",
    "store-get-handler-$Env",
    "store-create-handler-$Env",
    "store-update-handler-$Env",
    "store-update-status-handler-$Env",
    "menu-get-handler-$Env",
    "menu-create-handler-$Env",
    "menu-update-handler-$Env",
    "menu-delete-handler-$Env",
    "menu-availability-handler-$Env",
    "order-create-handler-$Env",
    "order-get-handler-$Env",
    "order-list-handler-$Env",
    "order-update-status-handler-$Env",
    "order-cancel-handler-$Env",
    "order-payment-update-$Env",
    "inventory-get-handler-$Env",
    "inventory-update-handler-$Env",
    "inventory-reserve-handler-$Env",
    "inventory-commit-handler-$Env",
    "payment-create-intent-$Env",
    "payment-charge-handler-$Env",
    "payment-refund-handler-$Env",
    "payment-webhook-handler-$Env",
    "profile-get-handler-$Env",
    "profile-update-handler-$Env",
    "profile-orders-handler-$Env",
    "device-register-handler-$Env",
    "device-print-job-handler-$Env",
    "notification-send-handler-$Env",
    "notification-dispatcher-$Env",
    "notification-websocket-connect-$Env",
    "notification-websocket-disconnect-$Env"
)

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Deployment Verification — Env: $Env" -ForegroundColor Magenta
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
    $stackName  = "myordering-$svc-$Env"
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
    "/myordering/$Env/db/host",
    "/myordering/$Env/redis/host",
    "/myordering/$Env/cognito/user-pool-id",
    "/myordering/$Env/eventbridge/bus-name",
    "/myordering/$Env/stripe/secret-key"
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
