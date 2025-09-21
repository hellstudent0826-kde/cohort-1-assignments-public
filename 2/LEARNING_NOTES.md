# Assignment 2 - AMM Factory Pattern 구현

## 📚 학습 목표
- AMM(자동화된 시장 조성자) 팩토리 패턴 이해
- Uniswap V2 스타일의 토큰 페어 생성 및 관리
- LP(Liquidity Provider) 토큰 시스템 구현
- 0.3% 수수료가 있는 스왑 메커니즘

## 🏗️ 아키텍처 개요

### 핵심 컴포넌트
1. **MiniAMMFactory**: 토큰 페어 생성 및 관리
2. **MiniAMM**: 개별 토큰 페어의 AMM 로직
3. **MiniAMMLP**: ERC20 기반 LP 토큰

### 토큰 주소 정렬 규칙
- `tokenX < tokenY` (주소값 기준)
- 양방향 조회 가능: `getPair(A, B) == getPair(B, A)`

## 🔧 구현 진행 상황

### 1. MiniAMMFactory 구현 ✅
- `createPair()`: 새 토큰 페어 생성
- `getPair()`: 기존 페어 조회 (양방향)
- `allPairsLength()`: 총 페어 수 반환
- `allPairs()`: 인덱스로 페어 조회
- 토큰 주소 정렬 (tokenX < tokenY)
- 중복 페어 생성 방지
- 제로 주소 및 동일 토큰 검증

### 2. MiniAMM 확장 ✅
- 생성자에서 토큰 주소 검증 및 정렬
- 첫 번째 유동성 추가 로직 (sqrt(k) 기반 LP 토큰 발행)
- 추가 유동성 추가 로직 (비율 유지)
- 유동성 제거 로직 (비례 반환)
- 0.3% 수수료 스왑 기능 (997/1000)

### 3. 이벤트 시스템 ✅
- `PairCreated`: 새 페어 생성 시
- `AddLiquidity`: 유동성 추가 시
- `Swap`: 토큰 스왑 시

## 🧪 테스트 현황
- **총 30개 테스트 모두 통과!** 🎉
- MiniAMMFactory: 8/8 통과
- MiniAMM: 17/17 통과
- MiniAMMLP: 2/2 통과
- MockERC20: 3/3 통과

## 📝 학습 포인트

### 🏭 팩토리 패턴
- **장점**: 코드 재사용성, 가스 효율성, 중앙화된 관리
- **구현**: `createPair()`로 동적 컨트랙트 생성
- **관리**: `allPairs` 배열로 모든 페어 추적

### 🔄 토큰 주소 정렬
- **목적**: 중복 방지, 일관성 보장
- **규칙**: `tokenX < tokenY` (주소값 기준)
- **효과**: `getPair(A, B) == getPair(B, A)` 양방향 조회

### 💰 LP 토큰 시스템
- **역할**: 유동성 공급자 지분 표현
- **발행**: 첫 번째 유동성 추가 시 `sqrt(k)` 기반
- **추가**: 기존 비율 유지하며 발행
- **소각**: 유동성 제거 시 비례 소각

### 🔄 AMM 스왑 메커니즘
- **공식**: `x * y = k` (상수 곱)
- **수수료**: 0.3% (997/1000)
- **계산**: `output = (input * 997 * reserve) / (1000 * reserve + input * 997)`
- **효과**: 수수료가 유동성 공급자에게 수익 제공

### 🛡️ 보안 고려사항
- **입력 검증**: 제로 주소, 동일 토큰, 충분한 유동성
- **오버플로우 방지**: SafeMath 사용 (Solidity 0.8+)
- **재진입 공격**: 외부 호출 후 상태 변경

### 🎯 핵심 성과
- **30개 테스트 모두 통과** ✅
- **Uniswap V2 스타일 구현** 완료
- **팩토리 패턴** 성공적 적용
- **0.3% 수수료** 정확한 계산
- **FLR 네트워크 배포** 완료 ✅

## 🚀 배포 결과 (FLR Coston2 테스트넷)

### 첫 번째 배포 (기본 배포)
- **MiniAMMFactory**: `0xd6239f84a7de6354f6eA239ed8742eA825355715`
- **Token Alpha (TKA)**: `0xc5f8a7e9fA5277F91ab876A6617E035f6B37ddE1`
- **Token Beta (TKB)**: `0x31Cbb27Bb2591A57e2a2642a5B332e8E9cc75588`
- **MiniAMM Pair**: `0x2c2a41Cd3c570Eb186236Ef2C6E49E480fF7F747`

### 두 번째 배포 (검증 시도)
- **MiniAMMFactory**: `0x8F356f1E66E299cdA68cAc72726dF298e5A9e346`
- **Token Alpha (TKA)**: `0x929C2F067C4920392F576F98A1D5516a19744Dd5`
- **Token Beta (TKB)**: `0x68871dEE36Ce53c519E47bf9fd464081a92c253e`
- **MiniAMM Pair**: `0xAd1e95D99348aEA80a4282eB88dC6e5e80d69f76`

### 크로스 시스템 페어 (첫 번째 팩토리로 생성)
- **크로스 페어**: `0x88eab613af8347baba440c1a2be16bf5355fbfbd`
- **Token X**: `0x68871dEE36Ce53c519E47bf9fd464081a92c253e` (두 번째 시스템의 Token Beta)
- **Token Y**: `0xc5f8a7e9fA5277F91ab876A6617E035f6B37ddE1` (첫 번째 시스템의 Token Alpha)

### 네트워크 정보
- **체인**: FLR Coston2 테스트넷 (Chain ID: 114)
- **RPC**: https://coston2-api.flare.network/ext/bc/C/rpc
- **가스 비용**: 0.44014375 C2FLR
- **배포 시간**: 2025년 1월 15일

## 🚀 배포 방법 가이드

### 1. 환경 설정
```bash
# 환경변수 설정
export C2FLR_WL_PRIVATE_KEY="your_private_key_here"

# 환경변수 확인
echo $C2FLR_WL_PRIVATE_KEY
```

### 2. Foundry 설정 (foundry.toml)
```toml
[profile.default]
src = "src"
out = "out"
libs = ["lib"]
evm_version = "paris"  # EIP-3855 문제 해결

remappings = [
    "@openzeppelin/contracts/=lib/openzeppelin-contracts/contracts/"
]
```

### 3. 배포 명령어
```bash
# 기본 배포 (빠른 배포)
forge script script/Factory.s.sol:FactoryScript \
  --rpc-url https://coston2-api.flare.network/ext/bc/C/rpc \
  --private-key $C2FLR_WL_PRIVATE_KEY \
  --broadcast

# 안전한 배포 (권장)
forge script script/Factory.s.sol:FactoryScript \
  --rpc-url https://coston2-api.flare.network/ext/bc/C/rpc \
  --private-key $C2FLR_WL_PRIVATE_KEY \
  --broadcast \
  --slow
```

### 4. 배포 옵션 설명
- `--rpc-url`: FLR Coston2 테스트넷 RPC 엔드포인트
- `--private-key`: 배포자 개인키 (환경변수 사용 권장)
- `--broadcast`: 실제 배포 실행
- `--slow`: 안전한 순차 배포 (네트워크 부하 방지)

### 5. 배포 후 확인
```bash
# 배포 결과 확인
cat broadcast/Factory.s.sol/114/run-latest.json

# 컨트랙트 주소 추출
grep "contractAddress" broadcast/Factory.s.sol/114/run-latest.json
```

### 6. 문제 해결
- **EIP-3855 경고**: `evm_version = "paris"` 설정으로 해결
- **배포 실패**: `--slow` 옵션 사용
- **가스 부족**: 계정에 충분한 C2FLR 보유 확인

## 🔐 블록체인 보안 기초 지식

### Private Key와 주소의 관계

#### 1. Private Key = 진짜 소유자
- **Private Key**: 256비트 랜덤 숫자 (진짜 소유자)
- **주소**: Private Key에서 수학적으로 파생 (계좌번호)
- **관계**: Private Key → Public Key → 주소 (단방향)

#### 2. 복구구문(Seed Phrase) 시스템
- **BIP39 표준**: 2048개 고정 단어 목록
- **12개 단어**: 2^132 경우의 수 (상대적으로 취약)
- **24개 단어**: 2^264 경우의 수 (매우 안전)
- **변환**: 복구구문 → Private Key → 주소들

#### 3. 보안 수준 비교
```
Private Key: 2^256 (매우 안전)
24개 단어: 2^264 (매우 안전)
12개 단어: 2^132 (상대적으로 취약)
```

### 양자컴퓨터 위협

#### 1. 현재 보안 수준
- **현재 컴퓨터**: 12개 단어도 안전
- **양자컴퓨터**: 12개 단어 공격 가능 (2^66)
- **24개 단어**: 양자컴퓨터로도 여전히 안전 (2^132)

#### 2. Bitcoin 주소의 위험성
- **모든 주소 공개**: 블록체인에서 모든 주소와 잔액 확인 가능
- **고액 계좌 타겟팅**: 공격자들이 타겟을 쉽게 찾을 수 있음
- **12개 단어 사용 시**: 양자컴퓨터로 공격 가능

#### 3. 권장 보안 조치
- **24개 단어 사용**: 12개 단어보다 훨씬 안전
- **하드웨어 월렛**: 오프라인 저장, 물리적 보안
- **양자 저항 암호화**: 미래 대응 방안

### 핵심 보안 원칙

#### 1. Private Key 보호
- **절대 공개 금지**: Private Key는 절대 노출하면 안됨
- **안전한 저장**: 하드웨어 월렛 또는 암호화된 저장
- **백업**: 복구구문을 안전한 곳에 보관

#### 2. 주소 공개는 안전
- **주소 공개**: 블록체인에서 모든 주소가 공개되어 있음
- **역산 불가능**: 주소에서 Private Key 역산 불가능
- **단방향 해시**: 해시 함수의 단방향 성질

#### 3. 월렛 관리
- **하나의 Private Key**: 모든 네트워크 주소 생성
- **복구구문**: Private Key를 안전하게 복구
- **네트워크 독립성**: 같은 Private Key로 모든 EVM 체인 사용
