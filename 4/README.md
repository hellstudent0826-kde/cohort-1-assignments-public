# Assignment 2 - MiniAMM with Advanced Features

이 프로젝트는 Assignment 1A의 MiniAMM을 확장하여 다음 기능들을 추가한 것입니다:

## 구현된 기능

### 1. LP Token (MiniAMMLP.sol)
- 유동성 공급자의 지분을 추적하는 ERC20 토큰
- 첫 번째 유동성 공급 시: `sqrt(x * y)` (기하평균)
- 이후 유동성 공급 시: `(xAmountIn / xReserve) * totalLPTokens` (비율 기반)
- 민팅과 소각 기능 (오직 AMM 컨트랙트만 가능)

### 2. 유동성 제거 (removeLiquidity)
- LP 토큰을 소각하여 해당 비율만큼의 토큰을 회수
- 공식: `xAmountOut = (lpTokenAmount / totalLPTokens) * xReserve`
- 유동성 제거 후 K 값 업데이트

### 3. 스왑 수수료 (0.3%)
- 모든 스왑에 0.3% 수수료 적용
- 수수료는 풀에 남아서 LP 토큰 가치 증가
- 수정된 공식: `(x + 0.997 * Δx) * (y - Δy) = k`

### 4. Factory 컨트랙트 (MiniAMMFactory.sol)
- 여러 토큰 페어 관리
- CREATE2를 사용한 결정적 주소 생성
- 토큰 순서 정규화 (tokenA < tokenB)
- 페어 중복 생성 방지

## 파일 구조

```
src/
├── IMiniAMM.sol          # AMM 인터페이스
├── IMiniAMMFactory.sol   # Factory 인터페이스
├── IMiniAMMLP.sol        # LP 토큰 인터페이스
├── IMockERC20.sol        # Mock ERC20 인터페이스
├── MiniAMM.sol           # 메인 AMM 컨트랙트
├── MiniAMMFactory.sol    # Factory 컨트랙트
├── MiniAMMLP.sol         # LP 토큰 컨트랙트
└── MockERC20.sol         # 테스트용 ERC20 토큰

test/
├── MiniAMM.t.sol         # AMM 테스트
├── MiniAMMFactory.t.sol  # Factory 테스트
├── MiniAMMLP.t.sol       # LP 토큰 테스트
└── MockERC20.t.sol       # MockERC20 테스트

script/
└── Factory.s.sol         # 배포 스크립트
```

## 테스트 실행

```bash
forge test
```

모든 테스트가 통과합니다 (32개 테스트).

## 배포

```bash
# 환경변수 설정
export PRIVATE_KEY="your_private_key"

# 배포 실행
forge script script/Factory.s.sol --rpc-url <RPC_URL> --broadcast
```

## 주요 수식

### LP 토큰 민팅
- 첫 번째: `LP = sqrt(x * y)`
- 이후: `LP = (xAmountIn / xReserve) * totalLPTokens`

### 유동성 제거
- `xAmountOut = (lpTokenAmount / totalLPTokens) * xReserve`
- `yAmountOut = (lpTokenAmount / totalLPTokens) * yReserve`

### 스왑 (수수료 포함)
- `xAmountInWithFee = xAmountIn * (1000 - 3) / 1000`
- `yAmountOut = (yReserve * xAmountInWithFee) / (xReserve + xAmountInWithFee)`

## 특징

- **가스 효율성**: CREATE2를 사용한 최적화된 배포
- **보안**: 접근 제어 및 입력 검증
- **정밀도**: 1 wei 단위까지 정확한 계산
- **확장성**: Factory 패턴으로 무제한 페어 생성 가능
