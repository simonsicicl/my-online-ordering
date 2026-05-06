# bootstrap-iam.ps1
# One-time IAM setup for a new AWS account.
# Creates a dedicated CI/CD IAM user + policy with least-privilege permissions
# needed to run SAM deploys and manage the foundation stack.
#
# Usage:
#   .\scripts\bootstrap-iam.ps1 -Environment dev -Profile myordering-dev
#
# Run this ONCE per account before any other scripts.
# After this runs, set the output access keys as GitHub Secrets:
#   AWS_ACCESS_KEY_ID_DEV / AWS_SECRET_ACCESS_KEY_DEV

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

$userName   = "myordering-cicd-$Environment"
$policyName = "myordering-cicd-policy-$Environment"

Write-Host "`n============================================" -ForegroundColor Magenta
Write-Host "  IAM Bootstrap -- Environment: $Environment" -ForegroundColor Magenta
Write-Host "============================================`n" -ForegroundColor Magenta

# Get AWS Account ID
$accountId = (aws sts get-caller-identity --profile $Profile --query "Account" --output text).Trim()
Write-OK "AWS Account ID: $accountId"

# ── CREATE IAM USER ──────────────────────────────────────────────────────────

Write-Step "Creating IAM user: $userName..."

$ErrorActionPreference = "SilentlyContinue"
$existingUser = aws iam get-user --user-name $userName --profile $Profile 2>$null
$userExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"

if ($userExists) {
    Write-Warn "User '$userName' already exists -- skipping creation."
} else {
    aws iam create-user --user-name $userName --profile $Profile | Out-Null
    Write-OK "Created IAM user: $userName"
}

# ── CREATE IAM POLICY ────────────────────────────────────────────────────────

Write-Step "Creating IAM policy: $policyName..."

$policyDocument = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudFormationSAM",
      "Effect": "Allow",
      "Action": ["cloudformation:*", "serverlessrepo:*"],
      "Resource": "*"
    },
    {
      "Sid": "S3SAMArtifacts",
      "Effect": "Allow",
      "Action": ["s3:CreateBucket","s3:GetObject","s3:PutObject","s3:ListBucket","s3:DeleteObject","s3:GetBucketLocation","s3:GetBucketVersioning","s3:PutBucketVersioning","s3:GetEncryptionConfiguration","s3:PutEncryptionConfiguration"],
      "Resource": [
        "arn:aws:s3:::my-ordering-$Environment-sam-artifacts",
        "arn:aws:s3:::my-ordering-$Environment-sam-artifacts/*"
      ]
    },
    {
      "Sid": "IAMForSAM",
      "Effect": "Allow",
      "Action": ["iam:CreateRole","iam:DeleteRole","iam:AttachRolePolicy","iam:DetachRolePolicy","iam:PutRolePolicy","iam:DeleteRolePolicy","iam:GetRole","iam:PassRole","iam:TagRole","iam:UntagRole","iam:UpdateRole","iam:CreateInstanceProfile","iam:DeleteInstanceProfile","iam:AddRoleToInstanceProfile","iam:RemoveRoleFromInstanceProfile"],
      "Resource": "*"
    },
    {
      "Sid": "LambdaForSAM",
      "Effect": "Allow",
      "Action": ["lambda:*"],
      "Resource": "*"
    },
    {
      "Sid": "APIGatewayForSAM",
      "Effect": "Allow",
      "Action": ["apigateway:*"],
      "Resource": "*"
    },
    {
      "Sid": "FoundationResources",
      "Effect": "Allow",
      "Action": ["ec2:*","rds:*","elasticache:*","cognito-idp:*","events:*","sqs:*","sns:*","cloudwatch:*","logs:*","ssm:GetParameter","ssm:PutParameter","ssm:DeleteParameter","ssm:DescribeParameters","cloudfront:*"],
      "Resource": "*"
    }
  ]
}
"@

# Write to temp file (ASCII, no BOM) to avoid PowerShell encoding issues with AWS CLI
$tempPolicyFile = [System.IO.Path]::GetTempFileName() + ".json"
[System.IO.File]::WriteAllText($tempPolicyFile, $policyDocument, [System.Text.Encoding]::ASCII)

$policyArn = "arn:aws:iam::${accountId}:policy/$policyName"

$ErrorActionPreference = "SilentlyContinue"
$existingPolicy = aws iam get-policy --policy-arn $policyArn --profile $Profile 2>$null
$policyExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"

if ($policyExists) {
    Write-Warn "Policy '$policyName' already exists -- creating new version..."
    aws iam create-policy-version `
        --policy-arn $policyArn `
        --policy-document "file://$tempPolicyFile" `
        --set-as-default `
        --profile $Profile | Out-Null
} else {
    aws iam create-policy `
        --policy-name $policyName `
        --policy-document "file://$tempPolicyFile" `
        --profile $Profile | Out-Null
    Write-OK "Created policy: $policyName"
}

Remove-Item $tempPolicyFile -ErrorAction SilentlyContinue

# ── ATTACH POLICY TO USER ────────────────────────────────────────────────────

Write-Step "Attaching policy to user..."

aws iam attach-user-policy `
    --user-name $userName `
    --policy-arn $policyArn `
    --profile $Profile | Out-Null
Write-OK "Policy attached"

# ── CREATE ACCESS KEYS ───────────────────────────────────────────────────────

Write-Step "Creating access keys for $userName..."

$keys = aws iam create-access-key `
    --user-name $userName `
    --profile $Profile `
    --output json | ConvertFrom-Json

$accessKeyId     = $keys.AccessKey.AccessKeyId
$secretAccessKey = $keys.AccessKey.SecretAccessKey

# ── CREATE SAM ARTIFACTS BUCKET ──────────────────────────────────────────────

Write-Step "Creating SAM artifacts S3 bucket..."

$bucketName = "my-ordering-$Environment-sam-artifacts"
$ErrorActionPreference = "SilentlyContinue"
$existingBucket = aws s3api head-bucket --bucket $bucketName --profile $Profile 2>$null
$bucketExists = ($LASTEXITCODE -eq 0)
$ErrorActionPreference = "Stop"

if ($bucketExists) {
    Write-Warn "Bucket '$bucketName' already exists -- skipping."
} else {
    if ($Region -eq "us-east-1") {
        aws s3api create-bucket `
            --bucket $bucketName `
            --region $Region `
            --profile $Profile | Out-Null
    } else {
        aws s3api create-bucket `
            --bucket $bucketName `
            --region $Region `
            --create-bucket-configuration LocationConstraint=$Region `
            --profile $Profile | Out-Null
    }

    aws s3api put-bucket-versioning `
        --bucket $bucketName `
        --versioning-configuration Status=Enabled `
        --profile $Profile | Out-Null

    Write-OK "Created bucket: $bucketName"
}

# ── SUMMARY ──────────────────────────────────────────────────────────────────

Write-Host "`n============================================" -ForegroundColor Green
Write-Host "  IAM bootstrap complete." -ForegroundColor Green
Write-Host "============================================" -ForegroundColor Green
Write-Host ""
Write-Host "  ACTION REQUIRED -- Add these as GitHub Secrets:" -ForegroundColor Yellow
Write-Host ""

$secretSuffix = $Environment.ToUpper()
Write-Host "  Secret name : AWS_ACCESS_KEY_ID_$secretSuffix" -ForegroundColor White
Write-Host "  Secret value: $accessKeyId" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Secret name : AWS_SECRET_ACCESS_KEY_$secretSuffix" -ForegroundColor White
Write-Host "  Secret value: $secretAccessKey" -ForegroundColor Cyan
Write-Host ""
Write-Host "  GitHub Settings > Secrets and variables > Actions > New repository secret" -ForegroundColor Gray
Write-Host ""
Write-Host "  Next step: .\scripts\deploy-foundation.ps1 -Environment $Environment -Profile $Profile" -ForegroundColor Green
Write-Host "============================================`n" -ForegroundColor Green
