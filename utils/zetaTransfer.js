const { ethers } = require("ethers");
const { getAddress } = require("@zetachain/protocol-contracts");
require("dotenv").config();

async function sendZetaTransfer({ receiver, amount, sendingChain }) {
  const ZETA_RPC = "https://zetachain-athens-evm.blockpi.network/v1/rpc/public"; // ZetaChain Sepolia Testnet
  const provider = new ethers.JsonRpcProvider(ZETA_RPC);
  const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  const zetaTokenAddress = getAddress("zetaToken", "zeta_testnet");
  const connectorAddress = getAddress("connectorZEVM", "zeta_testnet");

  const tokenContract = new ethers.Contract(
    zetaTokenAddress,
    ["function transfer(address to, uint amount) public returns (bool)"],
    wallet
  );

  const tx = await tokenContract.transfer(receiver, ethers.parseEther(amount));
  const receipt = await tx.wait();

  return {
    message: "✅ ZetaChain transfer complete",
    txHash: receipt.transactionHash,
    to: receiver
  };
}

module.exports = { sendZetaTransfer };
