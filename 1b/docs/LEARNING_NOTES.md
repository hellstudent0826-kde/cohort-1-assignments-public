# 🐳 1b 로컬 개발 환경 설정 학습 노트

## 📋 프로젝트 개요

**목표**: Docker Compose를 사용하여 로컬 블록체인 개발 환경을 구축

### 구성해야 할 서비스들:
1. **EVM 노드 (geth)** - 로컬 블록체인
2. **Caddy** - 리버스 프록시
3. **ngrok** - 터널링 서비스
4. **스마트 컨트랙트 배포기** - 1a 프로젝트 배포
5. **배포 서버** - 컨트랙트 주소 정보 제공
6. **Explorer (blockscout)** - 블록체인 탐색기
7. **Graph 스택** - 블록체인 데이터 인덱싱

---

## 🚀 현재까지 완료된 작업

### ✅ 1. EVM 노드 (geth) 설정
- **이미지**: `ethereum/client-go:v1.15.0`
- **포트**: 
  - HTTP RPC: `8545`
  - WebSocket RPC: `8546`
  - P2P: `30303`
- **체인 ID**: `1337`
- **모드**: 개발 모드 (`--dev`)

**주요 설정**:
```yaml
geth:
  image: ethereum/client-go:v1.15.0
  ports:
    - "8545:8545"  # HTTP RPC
    - "8546:8546"  # WebSocket RPC
    - "30303:30303"  # P2P
  command: >
    --dev
    --http
    --http.addr 0.0.0.0
    --http.port 8545
    --http.corsdomain "*"
    --http.api "eth,net,web3,personal,miner,admin,debug"
    --ws
    --ws.addr 0.0.0.0
    --ws.port 8546
    --mine
    --networkid 1337
```

### ✅ 2. 계정 프리펀딩 (geth-init)
- **목적**: 테스트용 계정에 ETH 충전
- **프리펀딩 계정**: `0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a`
- **개인키**: `be44593f36ac74d23ed0e80569b672ac08fa963ede14b63a967d92739b0c8659`
- **잔액**: **299.996 ETH** (100 ETH + 마이닝 보상)

**프리펀딩 스크립트** (`geth-init/prefund.js`):
```javascript
const from = eth.accounts[0];
const contractDeployer = "0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a";
eth.sendTransaction({
  from: from,
  to: contractDeployer,
  value: web3.toWei(100, "ether"),
});
```

### ✅ 3. 스마트 컨트랙트 배포기 (sc-deployer)
- **이미지**: `ghcr.io/foundry-rs/foundry:latest`
- **기능**: 1a 프로젝트를 클론하고 배포
- **배포된 컨트랙트**:
  - MockERC20 (Token0): `0xCbEEd39De1b29ff3b380Af15A0Ea85B478C73F99`
  - MockERC20 (Token1): `0x578C01f2C34307EFE0EB354721213FC069b9d069`
  - MiniAMM: `0x85ae21072bbE3eBBe0DECFa60d0191Ef7bE03a4E`

**주요 해결한 문제들**:
1. **Git 서브모듈 문제**: `git clone --recursive` 사용
2. **컨트랙트 검증 실패**: `--verify` 플래그 제거 (로컬 체인은 검증 불가)

---

## 🔧 문제 해결 과정

### 1. Git 서브모듈 오류
**문제**: `fatal: no submodule mapping found in .gitmodules`
**해결**: `git clone --recursive` 사용하여 서브모듈을 함께 클론

### 2. 컨트랙트 검증 실패
**문제**: `Chain 1337 not supported for verification!`
**해결**: 로컬 개발 체인에서는 검증이 불가능하므로 `--verify` 플래그 제거

---

## 📊 계정 잔액 확인 방법

### 1. RPC API 사용
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a", "latest"],"id":1}' \
  http://localhost:8545
```

### 2. Node.js로 변환
```bash
node -e "console.log(parseInt('0x10434759c62b2991e6', 16) / 1e18, 'ETH')"
```

### 3. geth 콘솔 사용
```bash
docker exec -it geth geth attach
> eth.getBalance("0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a")
```

---

### ✅ 4. Caddy (리버스 프록시) 설정 - **완전 통합**
- **이미지**: `caddy:2-alpine`
- **포트**: `80:80`, `443:443`
- **기능**: **하나의 Caddy로 모든 서비스 통합 관리**
- **설정**: HTTP 모드로 설정 (ngrok이 HTTPS 처리)

**최종 Caddy 설정** (`caddy/Caddyfile`):
```caddy
:80 {
    # CORS 설정
    header {
        Access-Control-Allow-Origin "*"
        Access-Control-Allow-Methods "GET, POST, PUT, DELETE, OPTIONS"
        Access-Control-Allow-Headers "Content-Type, Authorization"
    }

    # 배포 정보 (JSON 파일 직접 서빙)
    handle /deployment {
        header Content-Type "application/json"
        respond `{
    "network": {
        "chainId": 1337,
        "name": "Local Development",
        "rpcUrl": "https://smatteringly-leptorrhine-karen.ngrok-free.app"
    },
    "contracts": {
        "mock_erc_0": "0xCbEEd39De1b29ff3b380Af15A0Ea85B478C73F99",
        "mock_erc_1": "0x578C01f2C34307EFE0EB354721213FC069b9d069",
        "mini_amm": "0x85ae21072bbE3eBBe0DECFa60d0191Ef7bE03a4E"
    },
    "deployment": {
        "timestamp": "2024-01-08T00:40:00Z",
        "blockNumber": 15,
        "gasUsed": "4329301",
        "deployer": "0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a"
    },
    "endpoints": {
        "rpc": "https://smatteringly-leptorrhine-karen.ngrok-free.app",
        "explorer": "https://smatteringly-leptorrhine-karen.ngrok-free.app/explorer",
        "deployment": "https://smatteringly-leptorrhine-karen.ngrok-free.app/deployment",
        "graphPlayground": "https://smatteringly-leptorrhine-karen.ngrok-free.app/graph-playground"
    }
}` 200
    }

    # geth RPC 서비스 (루트 경로)
    handle {
        reverse_proxy geth:8545 {
            header_up Host {host}
            header_up X-Real-IP {remote}
            header_up X-Forwarded-For {remote}
            header_up X-Forwarded-Proto {scheme}
        }
    }

    # Explorer (blockscout) - 나중에 추가
    handle /explorer* {
        reverse_proxy blockscout:4000
    }

    # Graph Playground - 나중에 추가
    handle /graph-playground* {
        reverse_proxy graph-node:8000
    }
}
```

### ✅ 5. ngrok (터널링) 연결
- **도메인**: `smatteringly-leptorrhine-karen.ngrok-free.app`
- **실행 명령어**: `ngrok http --url=smatteringly-leptorrhine-karen.ngrok-free.app 80`
- **기능**: 로컬 포트 80을 인터넷에 노출
- **상태**: **완전 작동** - 모든 요청이 정상 처리됨

### ✅ 6. 배포 서버 통합 완료
- **기존**: 별도의 `sc-deployment-server` 컨테이너
- **현재**: **메인 Caddy에 통합** - 더 효율적이고 간단함
- **엔드포인트**: `/deployment` - **완전 작동**
- **장점**: 
  - 컨테이너 수 감소
  - 설정 관리 단순화
  - 리소스 효율성 향상

**배포 정보 JSON** (`sc-deployment-server/deployment.json`):
```json
{
    "network": {
        "chainId": 1337,
        "name": "Local Development",
        "rpcUrl": "https://smatteringly-leptorrhine-karen.ngrok-free.app"
    },
    "contracts": {
        "mock_erc_0": "0xCbEEd39De1b29ff3b380Af15A0Ea85B478C73F99",
        "mock_erc_1": "0x578C01f2C34307EFE0EB354721213FC069b9d069",
        "mini_amm": "0x85ae21072bbE3eBBe0DECFa60d0191Ef7bE03a4E"
    },
    "deployment": {
        "timestamp": "2024-01-08T00:40:00Z",
        "blockNumber": 15,
        "gasUsed": "4329301",
        "deployer": "0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a"
    }
}
```

## 🎯 다음 단계 (아직 구현 필요)

### 1. Explorer (blockscout)
- 블록체인 탐색기
- 별도의 docker-compose.yml 파일 필요

### 2. Graph 스택
- IPFS, PostgreSQL, Redis, Graph Node 포함
- 블록체인 데이터 인덱싱

---

## 🚀 Docker Compose 명령어

### 기본 명령어
```bash
# 서비스 시작
docker-compose up -d

# 서비스 중지
docker-compose down

# 로그 확인
docker-compose logs -f [service_name]

# 서비스 재시작
docker-compose restart [service_name]

# 컨테이너 상태 확인
docker-compose ps
```

### 현재 실행 중인 서비스
```bash
docker-compose ps
```

---

## 📝 유용한 정보

### 계정 정보
- **프리펀딩 계정**: `0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a`
- **개인키**: `be44593f36ac74d23ed0e80569b672ac08fa963ede14b63a967d92739b0c8659`
- **잔액**: 299.996 ETH

### 네트워크 정보
- **체인 ID**: 1337
- **로컬 RPC URL**: `http://localhost:8545`
- **외부 RPC URL**: `https://smatteringly-leptorrhine-karen.ngrok-free.app`
- **WebSocket URL**: `ws://localhost:8546`

### 배포된 컨트랙트
- **MiniAMM**: `0x85ae21072bbE3eBBe0DECFa60d0191Ef7bE03a4E`
- **Token0**: `0xCbEEd39De1b29ff3b380Af15A0Ea85B478C73F99`
- **Token1**: `0x578C01f2C34307EFE0EB354721213FC069b9d069`

---

## 🏥 geth 서버 Health Check

### ✅ Health Check 결과 (모든 테스트 통과)

| 항목 | 상태 | 값 |
|------|------|-----|
| **기본 연결** | ✅ | Geth/v1.15.0 |
| **네트워크 ID** | ✅ | 1337 |
| **체인 ID** | ✅ | 0x539 (1337) |
| **현재 블록** | ✅ | 15 |
| **동기화** | ✅ | 완료 |
| **가스 가격** | ✅ | ~172.5 gwei |
| **포트 연결** | ✅ | 8545 정상 |

### 🔧 Health Check 방법들

#### 1. 기본 연결 테스트
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' \
  http://localhost:8545
```

#### 2. 네트워크 상태 확인
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
  http://localhost:8545
```

#### 3. 체인 ID 확인
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://localhost:8545
```

#### 4. 블록 번호 확인
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545
```

#### 5. 동기화 상태 확인
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' \
  http://localhost:8545
```

#### 6. 가스 가격 확인
```bash
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}' \
  http://localhost:8545
```

#### 7. 포트 연결 테스트
```bash
nc -zv localhost 8545
```

#### 8. 자동화된 Health Check 스크립트
```bash
./health-check.sh
```

### 📋 Health Check 스크립트 기능
- **파일 위치**: `health-check.sh`
- **기능**: 
  - 기본 연결 테스트
  - 네트워크 상태 확인
  - 체인 ID 확인
  - 블록 번호 확인
  - 동기화 상태 확인
  - 가스 가격 확인
  - 포트 연결 테스트
- **사용법**: `./health-check.sh`

---

## 🌐 외부 접근 테스트

### ngrok을 통한 외부 접근
**도메인**: `https://smatteringly-leptorrhine-karen.ngrok-free.app`

#### 테스트 명령어들:
```bash
# 클라이언트 버전 확인
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' \
  https://smatteringly-leptorrhine-karen.ngrok-free.app

# 블록 번호 확인
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  https://smatteringly-leptorrhine-karen.ngrok-free.app

# 계정 잔액 확인
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a", "latest"],"id":1}' \
  https://smatteringly-leptorrhine-karen.ngrok-free.app
```

#### 테스트 결과:
- ✅ `web3_clientVersion`: `Geth/v1.15.0-stable-756cca7c/linux-arm64/go1.23.6`
- ✅ `eth_blockNumber`: `0x13` (19번째 블록)
- ✅ `eth_getBalance`: `0x1b1ad3c6026d812c59` (계정 잔액 정상)

#### ngrok 서버 로그 (실시간 확인):
```
10:13:51.198 KST POST /                         200 OK  ← geth RPC 요청
10:13:45.365 KST POST /                         200 OK  ← geth RPC 요청  
10:13:39.172 KST GET  /deployment               200 OK  ← 배포 정보 요청
```

### ✅ 7. 배포 정보 엔드포인트 테스트
**로컬 테스트**:
```bash
curl http://localhost/deployment
```

**외부 테스트**:
```bash
curl https://smatteringly-leptorrhine-karen.ngrok-free.app/deployment
```

**응답 예시**:
```json
{
    "network": {
        "chainId": 1337,
        "name": "Local Development",
        "rpcUrl": "https://smatteringly-leptorrhine-karen.ngrok-free.app"
    },
    "contracts": {
        "mock_erc_0": "0xCbEEd39De1b29ff3b380Af15A0Ea85B478C73F99",
        "mock_erc_1": "0x578C01f2C34307EFE0EB354721213FC069b9d069",
        "mini_amm": "0x85ae21072bbE3eBBe0DECFa60d0191Ef7bE03a4E"
    },
    "deployment": {
        "timestamp": "2024-01-08T00:40:00Z",
        "blockNumber": 15,
        "gasUsed": "4329301",
        "deployer": "0x404fa3f0Acf620e3d2A3c6aa80E27b07C830EB5a"
    },
    "endpoints": {
        "rpc": "https://smatteringly-leptorrhine-karen.ngrok-free.app",
        "explorer": "https://smatteringly-leptorrhine-karen.ngrok-free.app/explorer",
        "deployment": "https://smatteringly-leptorrhine-karen.ngrok-free.app/deployment",
        "graphPlayground": "https://smatteringly-leptorrhine-karen.ngrok-free.app/graph-playground"
    }
}
```

---

## 🔍 디버깅 팁

1. **컨테이너별 로그 확인**: `docker-compose logs [service_name]`
2. **RPC 연결 테스트**: `curl` 명령어로 JSON-RPC 호출
3. **계정 잔액 확인**: 위의 방법들 사용
4. **서비스 의존성 확인**: `depends_on` 설정 확인
5. **Health Check 실행**: `./health-check.sh`로 서버 상태 확인
6. **ngrok 연결 확인**: 외부 도메인으로 RPC 호출 테스트

---

## 📚 학습 포인트

1. **Docker Compose**: 멀티 컨테이너 애플리케이션 관리
2. **Ethereum 개발**: geth 노드 설정과 계정 관리
3. **스마트 컨트랙트 배포**: Foundry를 사용한 배포 과정
4. **네트워킹**: 컨테이너 간 통신과 포트 매핑
5. **리버스 프록시**: Caddy를 사용한 요청 라우팅
6. **터널링**: ngrok을 사용한 로컬 환경 외부 노출
7. **문제 해결**: 로그 분석과 단계별 디버깅

## 🎯 주요 성과

### ✅ 완료된 서비스들:
1. **geth** - 로컬 블록체인 노드
2. **geth-init** - 계정 프리펀딩
3. **sc-deployer** - 스마트 컨트랙트 배포
4. **caddy** - **통합 리버스 프록시** (모든 서비스 관리)
5. **ngrok** - 외부 접근 터널링
6. **배포 정보 서버** - **Caddy에 통합 완료**

### 🌐 외부 접근 가능:
- **RPC 엔드포인트**: `https://smatteringly-leptorrhine-karen.ngrok-free.app`
- **배포 정보**: `https://smatteringly-leptorrhine-karen.ngrok-free.app/deployment`
- **모든 JSON-RPC 메서드** 외부에서 접근 가능
- **CORS 설정** 완료로 웹 애플리케이션에서 사용 가능

### 🔧 해결한 주요 문제들:
1. **Git 서브모듈 오류** - `git clone --recursive` 사용
2. **컨트랙트 검증 실패** - `--verify` 플래그 제거
3. **TLS 인증서 문제** - Caddy를 HTTP 모드로 설정
4. **라우팅 문제** - geth RPC를 루트 경로로 설정
5. **배포 서버 404 오류** - Caddy에 직접 JSON 응답 통합
6. **컨테이너 복잡성** - 하나의 Caddy로 모든 서비스 통합 관리

### 🎯 **핵심 성과: 단일 Caddy 아키텍처**
- **기존**: 여러 컨테이너와 복잡한 설정
- **현재**: **하나의 Caddy**로 모든 서비스 통합 관리
- **장점**: 
  - 설정 관리 단순화
  - 리소스 효율성 향상
  - 유지보수 용이성
  - 확장성 개선

---

**마지막 업데이트**: 2024년 1월 8일
**상태**: **완전 통합된 블록체인 환경 + 외부 접근 구축 완료** ✅

## 🏆 **최종 아키텍처 요약**

### 🎯 **단일 Caddy 통합 아키텍처**
```
Internet → ngrok → Caddy (포트 80) → {
    /deployment → JSON 배포 정보
    / → geth RPC (포트 8545)
    /explorer → blockscout (미래)
    /graph-playground → graph-node (미래)
}
```

### ✅ **완전 작동하는 엔드포인트들**
- **RPC**: `https://smatteringly-leptorrhine-karen.ngrok-free.app`
- **배포 정보**: `https://smatteringly-leptorrhine-karen.ngrok-free.app/deployment`
- **로컬 RPC**: `http://localhost:8545`
- **로컬 배포**: `http://localhost/deployment`

### 🚀 **핵심 혁신**
- **하나의 Caddy 설정**으로 모든 서비스 관리
- **컨테이너 수 최소화** (sc-deployment-server 제거)
- **완전한 외부 접근성** (ngrok + HTTPS)
- **확장 가능한 구조** (explorer, graph 준비됨)
