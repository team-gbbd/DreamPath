# OpenVidu Local Deployment
Docker Compose files to run OpenVidu locally for development purposes.

---

## DreamPath 멘토링 화상통화 설정 가이드

### 1. 환경 변수 파일 생성
```bash
cd openvidu-local-deployment/community
cp .env.example .env
```

### 2. 본인 IP 주소 확인
```bash
# Mac/Linux
ifconfig | grep "inet " | grep -v 127.0.0.1

# Windows
ipconfig
```
192.168.x.x 형태의 IP를 찾으세요.

### 3. .env 파일 수정
`.env` 파일에서 `LAN_PRIVATE_IP`를 본인 IP로 변경:
```
LAN_PRIVATE_IP=192.168.123.100  # 본인 IP
```

### 4. livekit.yaml 수정
`community/livekit.yaml`에서 `node_ip`를 본인 IP로 변경:
```yaml
rtc:
  node_ip: 192.168.123.100  # 본인 IP
```

### 5. 프론트엔드 환경 변수
`frontend/.env.local` 파일 생성:
```
VITE_LIVEKIT_URL=ws://본인IP:7882
VITE_API_URL=http://localhost:8080
```

### 6. 실행
```bash
# OpenVidu 서버
cd openvidu-local-deployment/community
docker compose up -d

# 백엔드
cd backend && ./gradlew bootRun

# 프론트엔드
cd frontend && npm run dev
```

### 서버 중지
```bash
docker compose down
```

---

## Requirements
On **Windows** and **MacOS**:
- **Docker Desktop**

On **Linux**:
- **Docker**
- **Docker Compose**

---

## OpenVidu COMMUNITY

### Install OpenVidu COMMUNITY

#### Windows

```sh
git clone https://github.com/OpenVidu/openvidu-local-deployment
cd openvidu-local-deployment/community
.\configure_lan_private_ip_windows.bat
```

#### Mac

```sh
git clone https://github.com/OpenVidu/openvidu-local-deployment
cd openvidu-local-deployment/community
./configure_lan_private_ip_mac.sh
```

#### Linux

```sh
git clone https://github.com/OpenVidu/openvidu-local-deployment
cd openvidu-local-deployment/community
./configure_lan_private_ip_linux.sh
```

### Run OpenVidu COMMUNITY

```sh
docker compose up
```

---

## OpenVidu PRO (Evaluation Mode)

> OpenVidu PRO can be executed locally in evaluation mode for free for development and testing purposes.
> Some limits apply: max 8 Participants across all Rooms and max 5 minutes duration per Room.

### Install OpenVidu PRO

#### Windows

```sh
git clone https://github.com/OpenVidu/openvidu-local-deployment
cd openvidu-local-deployment/pro
.\configure_lan_private_ip_windows.bat
```

#### Mac

```sh
git clone https://github.com/OpenVidu/openvidu-local-deployment
cd openvidu-local-deployment/pro
./configure_lan_private_ip_mac.sh
```

#### Linux

```sh
git clone https://github.com/OpenVidu/openvidu-local-deployment
cd openvidu-local-deployment/pro
./configure_lan_private_ip_linux.sh
```

### Run OpenVidu PRO

```sh
docker compose up
```
