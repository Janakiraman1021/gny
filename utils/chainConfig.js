module.exports = {
  ethereum: {
    rpc: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
    chainId: 11155111
  },
  polygon: {
    rpc: "https://rpc-mumbai.maticvigil.com",
    chainId: 80001
  },
  solana: {
    rpc: "https://api.devnet.solana.com"
  },
  aptos: {
    rpc: "https://fullnode.testnet.aptoslabs.com/v1"
  },
  zetachain: {
    rpc: "https://zetachain-athens-evm.blockpi.network/v1/rpc/public"
  }
};
