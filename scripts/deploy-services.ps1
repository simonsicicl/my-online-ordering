# deploy-services.ps1
# Deploys all microservice SAM stacks in the correct dependency order.
# Run this AFTER migrate.ps1.
#
# Usage:
#   .\scripts\deploy-services.ps1 -Env dev -Profile myordering-dev
#
# To deploy a single service only:
#   .\scripts\deploy-services.ps1 -Env dev -Profile myordering-dev -Service menu-service

param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("dev", "staging", "prod")]
    [string]$Env,

    [Parameter(Mandatory = $false)]
    [string]$Profile = "default",

    [Parameter(Mandatory = $false)]
    [string]$Region = "us-east-1",

    # Optional: deploy only one service (must still respect dependency order manually)
    [Parameter(Mandatory = $false)]
    [string]$Service = ""
)

$ErrorActionPreference = "Stop"

function Write-Step { param([string]$msg) Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Write-OK   { param([string]$msg) Write-Host "    [OK] $msg" -ForegroundColor Green }

# Deployment order — auth-service MUST be first (exports AuthorizerArn used by all others)
$serviceOrder = @(
    "auth-service",
    "store-service",
    "menu-service",
    "inventory-service",
    "order-service",
    "payment-service",
    "user-profile-service",
    "device-service",
    "notification-service"
)

function Get-CFOutput {
    param([string]$StackName, [string]$OutputKey)
    return (aws cloudformation describe-stacks `
        --stack-name $StackName `
        --profile $Profile `
        --region $Region `
        --query "Stacks[0].Outputs[?OutputKey=='$OutputKey'].OutputValue" `
        --output text).Trim()
}

function Deploy-Service {
    param([string]$ServiceName)

    Write-Step "Deploying $ServiceName..."
    $stackName    = "myordering-$ServiceName-$Env"
    $templatePath = "services/$ServiceName/template.yaml"

    if (-not (Test-Path $templatePath)) {
        Write-Host "    [SKIP] $templatePath not found — skipping." -ForegroundColor Yellow
        return
    }

    # Get the Lambda Authorizer ARN from auth-service stack (needed by all API-facing services)
    $authorizerArn = ""
    if ($ServiceName -ne "auth-service") {
        $authorizerArn = Get-CFOutput -StackName "myordering-auth-service-$Env" -OutputKey "TokenValidatorArn"
        if (-not $authorizerArn) {
            Write-Host "    [ERROR] Could not get AuthorizerArn from auth-service stack." -ForegroundColor Red
            Write-Host "            Deploy auth-service first." -ForegroundColor Red
            exit 1
        }
    }

    # Build
    sam build `
        --template-file $templatePath `
        --profile $Profile `
        --region $Region
    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Build failed for $ServiceName" -ForegroundColor Red; exit 1 }

    # Deploy
    $paramOverrides = "AppEnv=$Env NodeEnv=production"
    if ($authorizerArn) { $paramOverrides += " AuthorizerArn=$authorizerArn" }

    sam deploy `
        --template-file $templatePath `
        --stack-name $stackName `
        --parameter-overrides $paramOverrides `
        --capabilities CAPABILITY_IAM `
        --profile $Profile `
        --region $Region `
        --no-fail-on-empty-changeset

    if ($LASTEXITCODE -ne 0) { Write-Host "[ERROR] Deploy failed for $ServiceName" -ForegroundColor Red; exit 1 }
    Write-OK "$ServiceName deployed — stack: $stackName"
}

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  Services Deploy — Environment: $Env" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

if ($Service) {
    # Single service deploy
    Deploy-Service -ServiceName $Service
} else {
    # Full deploy in order
    foreach ($svc in $serviceOrder) {
        Deploy-Service -ServiceName $svc
    }
}

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  All services deployed." -ForegroundColor Green
Write-Host "  Next step: .\scripts\verify-deployment.ps1 -Env $Env -Profile $Profile" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
