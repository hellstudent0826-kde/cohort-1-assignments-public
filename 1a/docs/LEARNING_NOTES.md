# 📝 MiniAMM 프로젝트 학습 메모

## 🎯 프로젝트 개요

### MiniAMM이란?
- **AMM (Automated Market Maker)**: 자동화된 시장 제작자
- **목적**: 두 토큰 간의 자동 거래를 위한 스마트 컨트랙트
- **핵심 공식**: `k = x × y` (상수 곱)

### 주요 기능
1. **유동성 추가 (Add Liquidity)**: 두 토큰을 동시에 공급
2. **토큰 스왑 (Swap)**: 한 토큰을 다른 토큰으로 교환

## 🏗️ 프로젝트 구조

### 컨트랙트들
- **MiniAMM.sol**: 메인 AMM 컨트랙트 (우리가 구현)
- **MockERC20.sol**: 테스트용 토큰 (우리가 구현)
- **IMiniAMM.sol**: 인터페이스 (이미 작성됨)

### 테스트
- **MiniAMM.t.sol**: AMM 테스트 (이미 작성됨)
- **MockERC20.t.sol**: 토큰 테스트 (이미 작성됨)

## 🧪 테스트 주도 개발 (TDD)

### 개념
- **테스트 코드**: 이미 작성되어 있음 (21개 테스트)
- **우리 할 일**: 테스트를 통과시키는 실제 코드 구현
- **목표**: 모든 테스트 통과

### 현재 상태
- ✅ **성공**: 13개 테스트 (생성자 + 유동성 추가 + 스왑 가격 영향)
- ❌ **실패**: 7개 테스트 (토큰 스왑 관련)

## 🪙 MockERC20 이해

### Mock의 의미
- **Mock**: "가짜", "모의", "테스트용"
- **목적**: 실제 환경을 시뮬레이션

### ERC20이란?
- **ERC20**: 이더리움 표준 토큰 인터페이스
- **예시**: USDT, USDC, DAI 등

### MockERC20의 역할
```solidity
// 테스트용 토큰 생성
token0 = new MockERC20("Token A", "TKA");
token1 = new MockERC20("Token B", "TKB");

// 누구나 민팅 가능 (테스트용)
function freeMintTo(uint256 amount, address to) external {
    _mint(to, amount);
}
```

## 🏠 주소 개념 이해

### 개인 지갑 주소 vs 컨트랙트 주소

#### 개인 지갑 주소 (EOA)
- **예시**: `0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6`
- **소유자**: 개인 (프라이빗 키)
- **용도**: 사람이 사용하는 계정
- **특징**: 직접 트랜잭션 서명 가능

#### 컨트랙트 주소 (CA)
- **예시**: `0x5991A2dF15A8F6A256D3Ec51E99254Cd3fb576A9`
- **소유자**: 없음 (프로그램)
- **용도**: 스마트 컨트랙트 실행
- **특징**: 코드로 제어

### 비유
- **개인 지갑 주소** = 집 주소 (사람이 사는 곳)
- **컨트랙트 주소** = 공장 주소 (자동화된 기계가 작동하는 곳)

## 🔧 MiniAMM 생성자 구현

### 완성된 기능
```solidity
constructor(address _tokenX, address _tokenY) {
    // 1. 제로 주소 체크
    if (_tokenX == address(0)) revert("tokenX cannot be zero address");
    if (_tokenY == address(0)) revert("tokenY cannot be zero address");
    
    // 2. 같은 토큰 체크
    if (_tokenX == _tokenY) revert("Tokens must be different");
    
    // 3. 토큰 순서 정렬 (주소가 작은 것을 tokenX로)
    if (_tokenX < _tokenY) {
        tokenX = _tokenX;
        tokenY = _tokenY;
    } else {
        tokenX = _tokenY;
        tokenY = _tokenX;
    }
}
```

### 통과한 테스트들
1. **test_Constructor()**: 기본 생성자 기능
2. **test_ConstructorTokenOrdering()**: 토큰 순서 정렬
3. **test_ConstructorRevertZeroAddress()**: 제로 주소 체크
4. **test_ConstructorRevertSameToken()**: 같은 토큰 체크

## 💧 유동성 추가 기능 구현

### 완성된 기능
```solidity
function addLiquidity(uint256 xAmountIn, uint256 yAmountIn) external {
    // 제로 금액 체크
    require(xAmountIn > 0 && yAmountIn > 0, "Amounts must be greater than 0");
    
    if (k == 0) {
        _addLiquidityFirstTime(xAmountIn, yAmountIn);
    } else {
        _addLiquidityNotFirstTime(xAmountIn, yAmountIn);
    }
}
```

### 첫 번째 유동성 추가
```solidity
function _addLiquidityFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
    // 1. 토큰 전송
    IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
    IERC20(tokenY).transferFrom(msg.sender, address(this), yAmountIn);
    
    // 2. 잔액 설정
    xReserve = xAmountIn;
    yReserve = yAmountIn;
    
    // 3. 초기 k값 계산
    k = xAmountIn * yAmountIn;
    
    // 4. 이벤트 발생
    emit AddLiquidity(xAmountIn, yAmountIn);
}
```

### 추가 유동성 추가
```solidity
function _addLiquidityNotFirstTime(uint256 xAmountIn, uint256 yAmountIn) internal {
    // 1. 기존 비율에 맞는 y 토큰 계산
    uint256 yRequired = (xAmountIn * yReserve) / xReserve;
    
    // 2. 비율 검증
    require(yAmountIn >= yRequired, "Insufficient y amount");
    
    // 3. 토큰 전송
    IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);
    IERC20(tokenY).transferFrom(msg.sender, address(this), yRequired);
    
    // 4. 잔액 업데이트
    xReserve += xAmountIn;
    yReserve += yRequired;
    
    // 5. k값 업데이트
    k = xReserve * yReserve;
    
    // 6. 이벤트 발생
    emit AddLiquidity(xAmountIn, yRequired);
}
```

### 통과한 유동성 추가 테스트들
1. **test_AddLiquidityFirstTime()**: 첫 번째 유동성 추가
2. **test_AddLiquidityNotFirstTime()**: 추가 유동성 추가
3. **test_AddLiquidityNotFirstTimeExactAmount()**: 정확한 금액으로 추가
4. **test_AddLiquidityEvent()**: 이벤트 발생 확인
5. **test_AddLiquidityRevertZeroAmount()**: 제로 금액 체크

## 🚀 다음 단계

### 구현해야 할 기능들
1. **✅ 유동성 추가 기능 (완성됨)**
   - `_addLiquidityFirstTime()`: 첫 번째 유동성 추가
   - `_addLiquidityNotFirstTime()`: 추가 유동성 추가
   - `addLiquidity()`: 메인 함수 완성

2. **⏳ 토큰 스왑 기능 (구현 예정)**
   - `swap()`: 토큰 교환 로직
   - AMM 공식 `k = x × y` 유지
   - 슬리피지(가격 영향) 계산

3. **✅ 이벤트 발생 (완성됨)**
   - `AddLiquidity` 이벤트
   - `Swap` 이벤트 (스왑 구현 시 추가)

## 💡 핵심 개념들

### AMM 원리
- **상수 곱**: `k = x × y`
- **유동성 풀**: 두 토큰의 쌍으로 구성
- **가격 결정**: 수학적 공식으로 자동 결정

### 솔리디티 기초
- **생성자**: 컨트랙트 배포 시 초기화
- **에러 처리**: `revert()` 문자열 에러
- **주소 비교**: `<` 연산자로 주소 순서 비교
- **상태 변수**: `public` 변수로 외부 접근 가능

## 🎯 이벤트(Event) 이해

### 이벤트란?
- **정의**: 솔리디티에서 블록체인에 로그를 기록하는 메커니즘
- **키워드**: `event` (선언), `emit` (발생)
- **목적**: 상태 변화를 블록체인에 영구적으로 기록

### 이벤트 선언 vs 발생
```solidity
// 1. 이벤트 선언 (인터페이스에서)
event AddLiquidity(uint256 xAmountIn, uint256 yAmountIn);

// 2. 이벤트 발생 (컨트랙트에서)
emit AddLiquidity(xAmountIn, yAmountIn);
```

### 이벤트의 특징
- **선언**: 동작 없음 (단순한 형태 정의)
- **발생**: `emit`으로 호출할 때만 실제 동작
- **동작**: 솔리디티 컴파일러가 자동으로 처리

### 이벤트 vs 함수 비교
| 구분 | 함수 | 이벤트 |
|------|------|--------|
| **동작** | 복잡한 로직 수행 | 단순한 로그 기록 |
| **상태 변경** | 실제 상태 변경 | 상태 변경 없음 |
| **가스 비용** | 높음 | 낮음 |
| **목적** | 실제 작업 수행 | 상태 변화 기록 |

### 실제 일어나는 일 vs 로그 기록
#### 실제 일어나는 일 (상태 변경)
```solidity
// 1. 토큰이 실제로 이동
IERC20(tokenX).transferFrom(msg.sender, address(this), xAmountIn);

// 2. 잔액이 실제로 변경
xReserve = xAmountIn;

// 3. k값이 실제로 계산
k = xAmountIn * yAmountIn;
```

#### 로그 기록 (단순 기록)
```solidity
// "이런 일이 일어났다"고 기록
emit AddLiquidity(xAmountIn, yAmountIn);
```

### 핵심 포인트
1. **이벤트를 기록하지 않아도 실제 동작은 정상 작동**
2. **실제 상태 변경과 로그 기록은 독립적**
3. **이벤트는 단순히 "무슨 일이 일어났는지" 기록하는 것**
4. **실제 동작은 함수의 다른 부분에서 처리**

### 이벤트 기록의 의미
#### 블록체인에 영구적으로 저장
- **영구성**: 한번 기록되면 영원히 보존
- **불변성**: 수정 불가능
- **투명성**: 누구나 조회 가능
- **전 세계 복사**: 모든 노드에 동일한 데이터 저장

#### 실제 활용
```javascript
// 프론트엔드에서 이벤트 수신
miniAMM.on("AddLiquidity", (xAmount, yAmount) => {
    console.log("유동성 추가됨:", xAmount, yAmount);
    updateLiquidityDisplay(xAmount, yAmount);
});
```

### 비유로 이해하기
- **함수**: 실제로 요리를 하는 것
- **이벤트**: 요리 완료를 일기장에 기록하는 것
- **요리는 이벤트 없이도 완성됨!**

## 🔍 테스트 실행 명령어

### 기본 실행
```bash
forge test
```

### 자세한 로그
```bash
forge test -vvv
```

### 특정 테스트만
```bash
forge test --match-test test_Constructor
```

### 특정 컨트랙트만
```bash
forge test --match-contract MiniAMM
```

## 🎯 토큰 스왑 기능 구현 완료!

### ✅ 구현된 스왑 기능

#### 1. **메인 스왑 함수**
```solidity
function swap(uint256 xAmountIn, uint256 yAmountIn) external
```

#### 2. **유효성 검사**
- **유동성 체크**: `require(k > 0, "No liquidity in pool")`
- **제로 금액 체크**: `require(xAmountIn > 0 || yAmountIn > 0, "Must swap at least one token")`
- **양방향 스왑 체크**: `require(xAmountIn == 0 || yAmountIn == 0, "Can only swap one direction at a time")`

#### 3. **AMM 공식 (Uniswap V2 방식)**
```solidity
// tokenX → tokenY
uint256 yAmountOut = yReserve - (k / (xReserve + xAmountIn));

// tokenY → tokenX  
uint256 xAmountOut = xReserve - (k / (yReserve + yAmountIn));
```

#### 4. **토큰 전송**
- **입력 토큰**: `transferFrom(msg.sender, address(this), amount)`
- **출력 토큰**: `transfer(msg.sender, amountOut)`

#### 5. **잔액 업데이트**
- **입력 토큰**: 잔액 증가
- **출력 토큰**: 잔액 감소

#### 6. **이벤트 발생**
```solidity
emit Swap(xAmountIn, yAmountOut);
```

### 🎉 최종 결과
- **총 테스트**: 20개
- **성공**: 20개 ✅
- **실패**: 0개
- **MiniAMM 프로젝트 완료!**

### 🔧 핵심 학습 포인트

#### AMM 공식의 정확성
- **잘못된 공식**: `(xAmountIn * yReserve) / (xReserve + xAmountIn)`
- **올바른 공식**: `yReserve - (k / (xReserve + xAmountIn))`
- **차이점**: k값을 유지하면서 정확한 가격 계산

#### 스왑의 양방향 처리
```solidity
if (xAmountIn > 0) {
    // tokenX → tokenY 스왑
} else {
    // tokenY → tokenX 스왑
}
```

#### 유효성 검사의 중요성
- **유동성 부족**: 스왑 불가능
- **양방향 스왑**: 한 번에 하나 방향만
- **제로 금액**: 최소 하나의 토큰은 필요

## 📚 참고 자료

- **Foundry 문서**: https://book.getfoundry.sh/
- **OpenZeppelin**: https://docs.openzeppelin.com/
- **ERC20 표준**: https://eips.ethereum.org/EIPS/eip-20
- **Uniswap V2**: https://docs.uniswap.org/protocol/V2/introduction

---

**🎉 MiniAMM 프로젝트 완료! 모든 테스트 통과!**
