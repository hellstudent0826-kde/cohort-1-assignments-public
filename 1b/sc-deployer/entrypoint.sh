#!/bin/sh

set -e

echo "🚀 Starting smart contract deployment..."

# Wait for geth-init to complete prefunding
echo "⏳ Waiting for geth-init to complete prefunding..."
until [ -f "/shared/geth-init-complete" ]; do
  echo "Waiting for geth-init-complete file..."
  sleep 1
done
echo "✅ Prefunding completed, proceeding with deployment..."

# Clone the repository
echo "📥 Cloning repository..."
if [ -d "cohort-1-assignments-public" ]; then
    echo "Repository already exists, removing and re-cloning..."
    rm -rf cohort-1-assignments-public
fi

git clone --recursive https://github.com/Juyeong-Byeon/cohort-1-assignments-public.git
cd cohort-1-assignments-public/1a

# Install dependencies
echo "📦 Installing dependencies..."
# Skip forge install since we already cloned with --recursive
echo "✅ Dependencies already installed via recursive clone"

# Build the project
echo "🔨 Building project..."
forge build

# Deploy the contracts
echo "🚀 Deploying MiniAMM contracts..."
forge script script/MiniAMM.s.sol:MiniAMMScript \
    --rpc-url http://geth:8545 \
    --private-key be44593f36ac74d23ed0e80569b672ac08fa963ede14b63a967d92739b0c8659 \
    --broadcast

echo "✅ Deployment completed!"
echo ""
echo "📊 Contract addresses should be available in the broadcast logs above."
