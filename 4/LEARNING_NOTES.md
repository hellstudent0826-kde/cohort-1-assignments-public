# Assignment 4 - MiniAMM DApp 프론트엔드 구현

## 📚 학습 목표
- Next.js + TypeScript로 DApp 프론트엔드 구현
- Wagmi + Viem으로 블록체인 상호작용
- TypeChain으로 ABI에서 TypeScript 타입 생성
- Flare Coston2 네트워크 지원
- 완전한 AMM DApp 사용자 인터페이스 구현

## 🏗️ 아키텍처 개요

### 프론트엔드 스택
1. **Next.js 15.5.3**: React 프레임워크
2. **TypeScript**: 타입 안전성
3. **Wagmi v2**: React Hooks for Ethereum
4. **Viem v2**: Low-level Ethereum 라이브러리
5. **TypeChain**: ABI → TypeScript 타입 생성
6. **RainbowKit v2**: 지갑 연결 UI 라이브러리

### 핵심 컴포넌트
1. **ConnectButton**: RainbowKit 지갑 연결 버튼
2. **TokenBalance**: 토큰 잔액 조회
3. **SwapInterface**: 토큰 스왑 기능
4. **LiquidityInterface**: 유동성 추가/제거

## 🔧 구현 진행 상황

### 1. 프로젝트 초기화 ✅
- Next.js 프로젝트 생성 (`create-next-app`)
- TypeScript 설정
- Tailwind CSS 설정

### 2. 의존성 설치 ✅
```bash
npm install "ethers@^6" "@rainbow-me/rainbowkit@^2" "wagmi@^2" "viem@^2"
npm install typechain @typechain/ethers-v6
```

### 3. TypeChain 설정 ✅
- `typechain.config.ts` 생성
- ABI 파일 복사 (`out/` → `frontend/contracts/`)
- TypeScript 타입 생성

### 4. Wagmi + RainbowKit 설정 ✅
- `src/lib/wagmi.ts` 설정 (getDefaultConfig 사용)
- Flare Coston2 네트워크 추가
- RainbowKit 자동 지갑 감지 지원

### 5. 컴포넌트 구현 ✅
- **ConnectButton**: RainbowKit 지갑 연결
- **TokenBalance**: ERC20 토큰 잔액 조회
- **SwapInterface**: 토큰 스왑 UI
- **LiquidityInterface**: 유동성 관리 UI

### 6. 스마트 컨트랙트 배포 ✅
- Flare Coston2 테스트넷 배포
- `--slow` 옵션으로 안전한 배포
- 컨트랙트 주소 업데이트

### 7. 지갑 연결 성공 ✅
- RainbowKit 통합 완료
- MetaMask 연결 성공
- 다중 지갑 옵션 표시

## 🧪 배포 결과 (Flare Coston2)

### 새로 배포된 컨트랙트 주소
- **MiniAMMFactory**: `0xfF83FBBC2DD27E118f1BCC762D415CbEA29EECf0`
- **Token A**: `0xdDDCE29860676F3d23061A5AC758F172b41d3582`
- **Token B**: `0xbD4302BAFb01E92525E4d8D8B21FCEe8B06564ad`
- **MiniAMM Pair**: `0xf176F0Ed19C37bcFF907F1Ab2F23b139252f0c68`
- **LP Token**: `0x33459C35962ef9C840C57dB2e4fCB124cF33264A`

### 네트워크 정보
- **체인**: Flare Coston2 테스트넷 (Chain ID: 114)
- **RPC**: https://coston2-api.flare.network/ext/bc/C/rpc
- **배포 시간**: 2025년 1월 15일 (새 배포)

## 📝 학습 포인트

### 🎨 프론트엔드 아키텍처

#### Next.js 15 + App Router
- **App Router**: 새로운 라우팅 시스템
- **Server Components**: 서버 사이드 렌더링
- **Client Components**: 클라이언트 사이드 상호작용
- **Turbopack**: 빠른 개발 서버

#### TypeScript 통합
- **타입 안전성**: 컴파일 타임 오류 방지
- **IntelliSense**: 자동 완성 및 오류 감지
- **리팩토링**: 안전한 코드 변경

### 🔗 블록체인 상호작용

#### Wagmi v2 + RainbowKit 아키텍처
```typescript
// RainbowKit 설정
export const config = getDefaultConfig({
  appName: 'MiniAMM DApp',
  projectId: 'YOUR_PROJECT_ID',
  chains: [mainnet, sepolia, flareCoston2],
  ssr: false,
});

// 사용
const { address, isConnected } = useAccount();
const { data: balance } = useBalance({ address });
```

#### RainbowKit 장점
- **자동 지갑 감지**: 설치된 지갑 자동 인식
- **다중 지갑 지원**: MetaMask, WalletConnect, Coinbase 등
- **일관된 UI**: 표준화된 지갑 연결 경험
- **모바일 지원**: QR 코드를 통한 모바일 지갑 연결

#### Viem 통합
- **Low-level 라이브러리**: Wagmi의 기반
- **타입 안전성**: 모든 함수가 타입 체크
- **Tree-shaking**: 번들 크기 최적화

### 🏭 TypeChain 활용

#### ABI → TypeScript 변환
```typescript
// 자동 생성된 타입
const contract = new ethers.Contract(
  address,
  MiniAMM__factory.abi,
  signer
);

// 타입 안전한 함수 호출
await contract.addLiquidity(xAmount, yAmount);
```

#### 장점
- **자동 타입 생성**: ABI에서 TypeScript 타입 생성
- **컴파일 타임 검증**: 잘못된 함수 호출 방지
- **IntelliSense 지원**: IDE에서 자동 완성

### 🌐 네트워크 지원

#### Flare Coston2 설정
```typescript
const flareCoston2 = {
  id: 114,
  name: 'Flare Coston2',
  network: 'flare-coston2',
  nativeCurrency: {
    decimals: 18,
    name: 'Flare',
    symbol: 'FLR',
  },
  rpcUrls: {
    default: {
      http: ['https://coston2-api.flare.network/ext/bc/C/rpc'],
    },
  },
  blockExplorers: {
    default: { 
      name: 'Flare Coston2 Explorer', 
      url: 'https://coston2-explorer.flare.network' 
    },
  },
  testnet: true,
} as const;
```

### 🎯 사용자 경험 (UX)

#### 지갑 연결
- **다중 지갑 지원**: MetaMask, WalletConnect, Coinbase Wallet, Trust Wallet, Rainbow
- **네트워크 자동 감지**: Flare Coston2 지원
- **연결 상태 관리**: 실시간 상태 업데이트
- **일관된 UI**: RainbowKit 표준 인터페이스

#### 토큰 관리
- **실시간 잔액**: 자동 새로고침
- **토큰 정보**: 이름, 심볼, 소수점
- **오류 처리**: 네트워크 오류 대응

#### 스왑 인터페이스
- **직관적 UI**: 사용자 친화적 디자인
- **실시간 계산**: 스왑 비율 자동 계산
- **가스 추정**: 트랜잭션 비용 표시

#### 유동성 관리
- **추가/제거**: 간편한 유동성 관리
- **LP 토큰**: 유동성 공급자 지분 표시
- **수수료 수익**: 0.3% 수수료 수익 표시

### 🛡️ 보안 고려사항

#### 개인키 관리
- **환경변수**: `.env` 파일로 개인키 격리
- **Git 무시**: `.gitignore`로 보안 유지
- **접두사 요구**: `0x` 접두사로 형식 검증

#### 트랜잭션 보안
- **가스 추정**: 충분한 가스 설정
- **네트워크 확인**: 올바른 네트워크 사용
- **오류 처리**: 실패한 트랜잭션 대응

### 🚀 성능 최적화

#### 번들 크기
- **Tree-shaking**: 사용하지 않는 코드 제거
- **Dynamic imports**: 필요시에만 로드
- **TypeChain**: 필요한 타입만 생성

#### 사용자 경험
- **로딩 상태**: 트랜잭션 진행 상황 표시
- **오류 메시지**: 명확한 오류 설명
- **반응형 디자인**: 모바일 지원

## 🔧 문제 해결

### RainbowKit 호환성 문제
**문제**: `ReferenceError: ConnectButton is not defined`
**원인**: RainbowKit v2와 React 19 호환성 문제
**해결**: `getDefaultConfig` 사용으로 자동 설정

### 환경변수 파싱 오류
**문제**: `missing hex prefix ("0x") for hex string`
**원인**: Foundry의 `vm.envUint()`가 `0x` 접두사 요구
**해결**: `vm.startBroadcast()` 방식으로 변경

### 네트워크 설정
**문제**: Flare Coston2 네트워크 인식 안됨
**원인**: Wagmi 설정에 네트워크 정보 누락
**해결**: 커스텀 네트워크 설정 추가

### 지갑 연결 옵션 없음
**문제**: "Connect Wallet" 버튼 클릭 시 옵션 없음
**원인**: RainbowKit 설정 불완전
**해결**: `getDefaultConfig` 사용으로 자동 지갑 감지

## 🎯 핵심 성과

### ✅ 완성된 기능
- **완전한 DApp**: 프론트엔드 + 스마트 컨트랙트
- **실제 네트워크**: Flare Coston2 테스트넷 배포
- **타입 안전성**: TypeScript + TypeChain
- **사용자 친화적**: 직관적인 UI/UX
- **지갑 연결**: RainbowKit으로 다중 지갑 지원

### 🚀 기술적 성과
- **모던 스택**: Next.js 15 + Wagmi v2 + Viem v2 + RainbowKit v2
- **타입 안전성**: 컴파일 타임 오류 방지
- **성능 최적화**: Tree-shaking, Dynamic imports
- **보안**: 환경변수 관리, 오류 처리
- **사용자 경험**: 표준화된 지갑 연결

### 📚 학습 성과
- **DApp 개발**: 완전한 블록체인 애플리케이션 구현
- **프론트엔드**: React + TypeScript + Tailwind CSS
- **블록체인**: Wagmi + Viem + TypeChain + RainbowKit
- **배포**: Foundry + Flare Coston2
- **지갑 통합**: 다중 지갑 지원

## 🚀 현재 상태

### ✅ 완료된 작업
1. **스마트 컨트랙트**: MiniAMM, Factory, LP Token 구현
2. **프론트엔드**: Next.js + TypeScript + Tailwind CSS
3. **블록체인 통합**: Wagmi + Viem + TypeChain
4. **지갑 연결**: RainbowKit으로 다중 지갑 지원
5. **네트워크**: Flare Coston2 테스트넷 배포
6. **지갑 연결**: MetaMask 연결 성공

### 🔄 현재 진행 중
- **토큰 잔액 확인**: 연결된 지갑의 토큰 잔액 표시
- **스왑 기능 테스트**: 토큰 간 교환 기능 검증
- **유동성 관리 테스트**: 유동성 추가/제거 기능 검증

### 🎯 다음 단계
1. **토큰 잔액 표시**: ERC20 토큰 잔액 확인
2. **스왑 테스트**: 토큰 교환 기능 검증
3. **유동성 테스트**: 풀 관리 기능 검증
4. **오류 처리**: 네트워크 오류 대응

## 🚀 다음 단계

### 개선 사항
1. **더 많은 지갑 지원**: WalletConnect, Coinbase Wallet
2. **고급 기능**: 가스 가격 설정, 트랜잭션 히스토리
3. **모바일 최적화**: PWA, 모바일 지갑 지원
4. **테스트**: E2E 테스트, 단위 테스트

### 확장 가능성
1. **다중 네트워크**: Ethereum, Polygon, BSC 지원
2. **고급 AMM**: 라우팅, 멀티홉 스왑
3. **DeFi 기능**: 스테이킹, 유동성 마이닝
4. **소셜 기능**: 사용자 프로필, 거래 히스토리

## 📖 참고 자료

### 공식 문서
- [Next.js 15](https://nextjs.org/docs)
- [Wagmi v2](https://wagmi.sh/)
- [Viem](https://viem.sh/)
- [TypeChain](https://typechain.ethers.org/)
- [RainbowKit v2](https://www.rainbowkit.com/)

### Flare 네트워크
- [Flare Coston2](https://coston2-explorer.flare.network/)
- [Flare 개발자 허브](https://dev.flare.network/)

### 블록체인 개발
- [Foundry](https://book.getfoundry.sh/)
- [Ethers.js v6](https://docs.ethers.org/v6/)
- [OpenZeppelin](https://docs.openzeppelin.com/)

---

## 📅 2025-09-28 작업 내용

### 🎯 오늘의 목표
- 유동성 공급 UI 개선 (최초 vs 기존 유동성 구분)
- 승인 과정 개선 (실제 승인 완료 대기)
- 스왑 인터페이스 개선 (에러 처리 강화)

### 🔧 주요 작업 내용

#### 1. 유동성 공급 UI 개선 ✅
**문제**: 기존 슬라이더 방식으로는 최초 유동성 공급 시 사용자가 비율을 지정할 수 없음

**해결책**:
- **최초 유동성 공급 모드**: 사용자가 직접 Token A, B 양 입력
- **기존 유동성 추가 모드**: 슬라이더로 비율 기반 자동 계산
- **자동 모드 전환**: 유동성 존재 여부에 따라 적절한 모드 제안

**구현 세부사항**:
```typescript
// 모드 상태 관리
const [liquidityMode, setLiquidityMode] = useState<'initial' | 'additional'>('initial');
const [amountA, setAmountA] = useState('');
const [amountB, setAmountB] = useState('');

// 유동성 존재 여부 확인
const hasLiquidity = reserves && reserves.length >= 2 && reserves[0] > BigInt(0) && reserves[1] > BigInt(0);

// 자동 모드 전환
useEffect(() => {
  if (hasLiquidity && liquidityMode === 'initial') {
    setLiquidityMode('additional');
  } else if (!hasLiquidity && liquidityMode === 'additional') {
    setLiquidityMode('initial');
  }
}, [hasLiquidity, liquidityMode]);
```

#### 2. 승인 과정 개선 ✅
**문제**: `allowance 0` 에러 발생 - 승인 트랜잭션이 완료되기 전에 유동성 추가 실행

**해결책**:
- **실제 승인 완료 대기**: `useWaitForTransactionReceipt` 사용
- **비동기 처리**: 승인 완료 후 자동으로 유동성 추가 실행
- **상태 기반 실행**: `receiptA && receiptB` 확인 후 실행

**구현 세부사항**:
```typescript
// 승인 트랜잭션 완료 확인
const { data: receiptA, isLoading: isApprovingA } = useWaitForTransactionReceipt({
  hash: approveAHash as `0x${string}`,
});

const { data: receiptB, isLoading: isApprovingB } = useWaitForTransactionReceipt({
  hash: approveBHash as `0x${string}`,
});

// 승인 완료 후 자동 실행
useEffect(() => {
  if (receiptA && receiptB && pendingLiquidityAmounts && !isLoading) {
    addLiquidityAfterApproval();
  }
}, [receiptA, receiptB, pendingLiquidityAmounts, isLoading, addLiquidityAfterApproval]);
```

#### 3. 스왑 인터페이스 개선 ✅
**문제**: 스왑에서도 동일한 `allowance 0` 에러 발생

**해결책**:
- **잔액/유동성 부족 에러 처리**: 명확한 에러 메시지 제공
- **승인 완료 후 자동 스왑**: 유동성 추가와 동일한 패턴 적용
- **실시간 상태 표시**: "승인 중...", "승인 완료 대기 중...", "스왑 중..."

**구현 세부사항**:
```typescript
// 잔액 확인
if (!balance || balance < amountWei) {
  alert(`잔액이 부족합니다. 현재 잔액: ${balance ? (Number(balance) / 1e18).toFixed(6) : '0'}개`);
  return;
}

// 유동성 확인
if (!reserves || reserves.length < 2 || reserves[0] === BigInt(0) || reserves[1] === BigInt(0)) {
  alert('유동성이 부족합니다. 먼저 유동성을 공급해주세요.');
  return;
}
```

#### 4. UI/UX 개선 ✅
**탭 UI 개선**:
- **시각적 구분**: 흰색 배경, 테두리, 그림자로 탭 영역 구분
- **색상 변경**: 보라색 → 회색으로 변경 (액션 버튼과 구분)
- **상태 표시**: 권장 모드에 대한 시각적 피드백

**버튼 상태 관리**:
- **실시간 상태 표시**: 각 단계별 명확한 상태 메시지
- **적절한 비활성화**: 중복 클릭 방지 및 사용자 경험 개선

#### 5. 사용자 유동성 표시 시도 및 롤백 ⚠️
**시도**: 사용자가 제공한 유동성과 전체 유동성을 구분해서 표시

**문제점**:
- LP 토큰 총 공급량 조회 오류
- BigInt → Number 변환 시 정밀도 손실
- 복잡한 계산 로직으로 인한 불안정성

**결과**: 복잡한 계산 로직 제거하고 원래 상태로 롤백

### 🚀 기술적 학습 포인트

#### 1. `useWaitForTransactionReceipt` 활용
- **폴링 방식**: 1초마다 블록체인에 트랜잭션 상태 확인
- **완료 감지**: `receipt` 데이터로 트랜잭션 완료 확인
- **비동기 처리**: 트랜잭션 완료 후 다음 단계 자동 실행

#### 2. React Hooks 패턴
- **useState**: 컴포넌트 상태 관리
- **useEffect**: 사이드 이펙트 처리 (자동 갱신, 트랜잭션 감지)
- **useCallback**: 함수 메모이제이션으로 성능 최적화

#### 3. BigInt 정밀도 문제
- **JavaScript Number 한계**: 2^53 이상의 정수는 정확하게 표현 불가
- **BigInt 연산**: 정확한 계산을 위해 BigInt 사용
- **스케일링**: 소수점 계산을 위한 10000배 스케일링

#### 4. 에러 처리 패턴
- **사전 검증**: 트랜잭션 전송 전 잔액/유동성 확인
- **명확한 메시지**: 사용자에게 구체적인 에러 정보 제공
- **복구 가능한 에러**: 사용자가 수정 가능한 에러와 시스템 에러 구분

### 📊 성과 및 개선사항

#### ✅ 성공한 개선사항
1. **유동성 공급 UX**: 최초/기존 유동성 구분으로 사용자 편의성 향상
2. **승인 과정 안정화**: `allowance 0` 에러 완전 해결
3. **에러 처리 강화**: 명확한 에러 메시지로 사용자 경험 개선
4. **UI 일관성**: 탭 디자인과 상태 표시 개선

#### ⚠️ 시도했지만 롤백한 기능
1. **사용자 유동성 표시**: 복잡한 계산 로직으로 인한 불안정성
2. **자동 갱신 최적화**: 타이밍 문제로 인한 복잡성 증가

#### 🎯 핵심 학습
- **단순함의 가치**: 복잡한 기능보다 안정적인 기본 기능이 중요
- **점진적 개선**: 작은 단위로 개선하고 테스트하는 것이 효과적
- **사용자 중심**: 기술적 완성도보다 사용자 경험이 우선

---

**🎉 Assignment 4 완료!**  
완전한 MiniAMM DApp이 Flare Coston2에서 실행 중입니다!
지갑 연결 성공! 이제 토큰 스왑과 유동성 관리 기능을 테스트할 수 있습니다! 🚀
