#!/bin/bash

# geth 서버 Health Check 스크립트
echo "🔍 geth 서버 Health Check 시작..."
echo "=================================="

# 1. 기본 연결 테스트
echo "1. 기본 연결 테스트..."
response=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"web3_clientVersion","params":[],"id":1}' \
  http://localhost:8545)

if [[ $response == *"Geth"* ]]; then
  echo "✅ 연결 성공: $(echo $response | jq -r '.result')"
else
  echo "❌ 연결 실패"
  exit 1
fi

# 2. 네트워크 상태 확인
echo "2. 네트워크 상태 확인..."
network_id=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
  http://localhost:8545 | jq -r '.result')

echo "✅ 네트워크 ID: $network_id"

# 3. 체인 ID 확인
echo "3. 체인 ID 확인..."
chain_id=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
  http://localhost:8545 | jq -r '.result')

echo "✅ 체인 ID: $chain_id"

# 4. 블록 번호 확인
echo "4. 블록 번호 확인..."
block_number=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_blockNumber","params":[],"id":1}' \
  http://localhost:8545 | jq -r '.result')

block_decimal=$((16#${block_number#0x}))
echo "✅ 현재 블록: $block_decimal"

# 5. 동기화 상태 확인
echo "5. 동기화 상태 확인..."
syncing=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_syncing","params":[],"id":1}' \
  http://localhost:8545 | jq -r '.result')

if [[ $syncing == "false" ]]; then
  echo "✅ 동기화 완료"
else
  echo "⚠️  동기화 중..."
fi

# 6. 가스 가격 확인
echo "6. 가스 가격 확인..."
gas_price=$(curl -s -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_gasPrice","params":[],"id":1}' \
  http://localhost:8545 | jq -r '.result')

gas_decimal=$((16#${gas_price#0x}))
gas_gwei=$((gas_decimal / 1000000000))
echo "✅ 가스 가격: ${gas_gwei} gwei"

# 7. 포트 연결 테스트
echo "7. 포트 연결 테스트..."
if nc -z localhost 8545 2>/dev/null; then
  echo "✅ 포트 8545 연결 성공"
else
  echo "❌ 포트 8545 연결 실패"
fi

echo "=================================="
echo "🎉 Health Check 완료! geth 서버가 정상 작동 중입니다."
