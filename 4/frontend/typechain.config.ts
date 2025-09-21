import { HardhatUserConfig } from "hardhat/config";
import "@typechain/hardhat";

const config: HardhatUserConfig = {
  solidity: "0.8.30",
  typechain: {
    outDir: "src/types",
    target: "ethers-v6",
    alwaysGenerateOverloads: false,
    externalArtifacts: ["contracts/*.json"],
  },
};

export default config;
