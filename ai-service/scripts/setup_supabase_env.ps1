# Supabase 환경 변수 설정 스크립트 (PowerShell)
# 이 스크립트를 실행하여 .env 파일을 자동으로 생성합니다

Write-Host "=== Supabase 환경 설정 ===" -ForegroundColor Green
Write-Host ""

# .env 파일 경로
$envFile = Join-Path $PSScriptRoot ".env"

# 기존 .env 파일 백업
if (Test-Path $envFile) {
    $backupFile = "$envFile.backup.$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    Write-Host "기존 .env 파일을 백업합니다: $backupFile" -ForegroundColor Yellow
    Copy-Item $envFile $backupFile
}

# Supabase 설정
$dbType = Read-Host "DB 타입을 입력하세요 (기본값: postgres)"
if ([string]::IsNullOrWhiteSpace($dbType)) {
    $dbType = "postgres"
}

$dbHost = Read-Host "DB 호스트를 입력하세요 (기본값: aws-1-ap-northeast-1.pooler.supabase.com)"
if ([string]::IsNullOrWhiteSpace($dbHost)) {
    $dbHost = "aws-1-ap-northeast-1.pooler.supabase.com"
}

$dbPort = Read-Host "DB 포트를 입력하세요 (기본값: 6543)"
if ([string]::IsNullOrWhiteSpace($dbPort)) {
    $dbPort = "6543"
}

$dbName = Read-Host "DB 이름을 입력하세요 (기본값: postgres)"
if ([string]::IsNullOrWhiteSpace($dbName)) {
    $dbName = "postgres"
}

$dbUser = Read-Host "DB 사용자명을 입력하세요 (기본값: postgres.ssindowhjsowftiglvsz)"
if ([string]::IsNullOrWhiteSpace($dbUser)) {
    $dbUser = "postgres.ssindowhjsowftiglvsz"
}

$dbPassword = Read-Host "DB 비밀번호를 입력하세요 (기본값: dreampath1118)" -AsSecureString
$dbPasswordPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($dbPassword)
)
if ([string]::IsNullOrWhiteSpace($dbPasswordPlain)) {
    $dbPasswordPlain = "dreampath1118"
}

$dbSslMode = Read-Host "DB SSL 모드를 입력하세요 (기본값: require)"
if ([string]::IsNullOrWhiteSpace($dbSslMode)) {
    $dbSslMode = "require"
}

Write-Host ""
$openaiKey = Read-Host "OpenAI API 키를 입력하세요" -AsSecureString
$openaiKeyPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($openaiKey)
)

$openaiModel = Read-Host "OpenAI 모델을 입력하세요 (기본값: gpt-4o-mini)"
if ([string]::IsNullOrWhiteSpace($openaiModel)) {
    $openaiModel = "gpt-4o-mini"
}

# .env 파일 생성
$envContent = @"
# Supabase Database 설정
DB_TYPE=$dbType
DB_HOST=$dbHost
DB_PORT=$dbPort
DB_NAME=$dbName
DB_USER=$dbUser
DB_PASSWORD=$dbPasswordPlain
DB_SSLMODE=$dbSslMode

# OpenAI API 설정
OPENAI_API_KEY=$openaiKeyPlain
OPENAI_MODEL=$openaiModel
"@

$envContent | Out-File -FilePath $envFile -Encoding UTF8
Write-Host ""
Write-Host "✅ .env 파일이 생성되었습니다: $envFile" -ForegroundColor Green

# 연결 테스트
Write-Host ""
$testConnection = Read-Host "Supabase 연결을 테스트하시겠습니까? (Y/N)"
if ($testConnection -eq "Y" -or $testConnection -eq "y") {
    Write-Host "연결 테스트를 시작합니다..." -ForegroundColor Cyan
    python test_supabase_connection.py
}

Write-Host ""
Write-Host "=== 설정 완료 ===" -ForegroundColor Green
Write-Host "서비스를 시작하려면: python main.py" -ForegroundColor Yellow

