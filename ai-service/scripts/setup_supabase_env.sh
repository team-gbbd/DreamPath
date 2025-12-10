#!/bin/bash
# Supabase 환경 변수 설정 스크립트 (Bash)
# 이 스크립트를 실행하여 .env 파일을 자동으로 생성합니다

echo "=== Supabase 환경 설정 ==="
echo ""

# .env 파일 경로
ENV_FILE=".env"

# 기존 .env 파일 백업
if [ -f "$ENV_FILE" ]; then
    BACKUP_FILE="$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    echo "기존 .env 파일을 백업합니다: $BACKUP_FILE"
    cp "$ENV_FILE" "$BACKUP_FILE"
fi

# Supabase 설정
read -p "DB 타입을 입력하세요 (기본값: postgres): " DB_TYPE
DB_TYPE=${DB_TYPE:-postgres}

read -p "DB 호스트를 입력하세요 (기본값: aws-1-ap-northeast-1.pooler.supabase.com): " DB_HOST
DB_HOST=${DB_HOST:-aws-1-ap-northeast-1.pooler.supabase.com}

read -p "DB 포트를 입력하세요 (기본값: 6543): " DB_PORT
DB_PORT=${DB_PORT:-6543}

read -p "DB 이름을 입력하세요 (기본값: postgres): " DB_NAME
DB_NAME=${DB_NAME:-postgres}

read -p "DB 사용자명을 입력하세요 (기본값: postgres.ssindowhjsowftiglvsz): " DB_USER
DB_USER=${DB_USER:-postgres.ssindowhjsowftiglvsz}

read -sp "DB 비밀번호를 입력하세요 (기본값: dreampath1118): " DB_PASSWORD
echo ""
DB_PASSWORD=${DB_PASSWORD:-dreampath1118}

read -p "DB SSL 모드를 입력하세요 (기본값: require): " DB_SSLMODE
DB_SSLMODE=${DB_SSLMODE:-require}

echo ""
read -sp "OpenAI API 키를 입력하세요: " OPENAI_API_KEY
echo ""

read -p "OpenAI 모델을 입력하세요 (기본값: gpt-4o-mini): " OPENAI_MODEL
OPENAI_MODEL=${OPENAI_MODEL:-gpt-4o-mini}

# .env 파일 생성
cat > "$ENV_FILE" << EOF
# Supabase Database 설정
DB_TYPE=$DB_TYPE
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_NAME=$DB_NAME
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_SSLMODE=$DB_SSLMODE

# OpenAI API 설정
OPENAI_API_KEY=$OPENAI_API_KEY
OPENAI_MODEL=$OPENAI_MODEL
EOF

echo ""
echo "✅ .env 파일이 생성되었습니다: $ENV_FILE"

# 연결 테스트
echo ""
read -p "Supabase 연결을 테스트하시겠습니까? (Y/N): " TEST_CONNECTION
if [ "$TEST_CONNECTION" = "Y" ] || [ "$TEST_CONNECTION" = "y" ]; then
    echo "연결 테스트를 시작합니다..."
    python3 test_supabase_connection.py
fi

echo ""
echo "=== 설정 완료 ==="
echo "서비스를 시작하려면: python3 main.py"

