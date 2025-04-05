const { ethers } = require("ethers");
const axios = require("axios");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

const chains = {
  zetachain: {
    rpc: "https://zetachain-evm.blockpi.network/v1/rpc/public",
    chainId: 7000
  }
};

async function requestZetaFromCLI(address) {
  console.log("Requesting ZETA tokens using CLI faucet...");
  try {
    const { stdout, stderr } = await execPromise(`zetafaucet --drip --address ${address}`);
    console.log("Faucet CLI output:", stdout);
    if (stderr) console.error("Faucet CLI error:", stderr);
    return !stderr;
  } catch (error) {
    console.error("Failed to run faucet CLI:", error.message);
    return false;
  }
}

async function zetaToAptosTransfer({ receiver: userReceiver, amount }) {
  try {
    const zetaRpc = chains.zetachain.rpc;
    const faucetUrl = process.env.FAUCET_URL || "https://faucet.zetachain.com/";
    const provider = new ethers.JsonRpcProvider(zetaRpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
    console.log("Using wallet address:", wallet.address);

    const realReceiver = 0x1831276b3161e70341dd4fa148fa5d297ad2c71cbcf60776de98a52b3fb92367;
    if (!realReceiver) throw new Error("REAL_APTOS_ADDRESS not set in env");

    const zetaTokenAddress = "0x5F0b1a82749cb4E2278EC87F8BF6B618dC71a8bf";
    const zetaConnectorAddress = "0x239e96c8f17C85c30100AC26F635Ea15f23E9c67";

    const zetaToken = new ethers.Contract(zetaTokenAddress, [
      "function balanceOf(address) view returns (uint256)"
    ], provider);

    let currentBalance = await zetaToken.balanceOf(wallet.address);
    console.log(`Initial ZETA Balance: ${ethers.formatEther(currentBalance)} ZETA`);

    const parsedAmount = ethers.parseEther(amount.toString());
    if (parsedAmount <= 0n) throw new Error("Amount must be greater than zero.");

    let faucetSuccess = false;
    if (currentBalance < parsedAmount) {
      console.log("Insufficient balance. Trying multiple faucet methods...");
      faucetSuccess = await requestZetaFromCLI(wallet.address);

      if (!faucetSuccess) {
        console.log("CLI faucet failed. Trying web faucet...");
        for (let i = 0; i < 5; i++) {
          try {
            const response = await axios.get(`${faucetUrl}?address=${wallet.address}`, { timeout: 10000 });
            console.log("Faucet response:", response.data);
            if (response.data.success || response.data.includes("successfully queued")) {
              faucetSuccess = true;
              break;
            }
          } catch (error) {
            console.warn(`Faucet attempt ${i + 1} failed:`, error.message);
            await new Promise(resolve => setTimeout(resolve, 10000));
          }
        }
      }

      if (faucetSuccess) {
        console.log("Waiting 60 seconds for tokens to arrive...");
        await new Promise(resolve => setTimeout(resolve, 60000));
        for (let i = 0; i < 5; i++) {
          currentBalance = await zetaToken.balanceOf(wallet.address);
          console.log(`Balance check ${i + 1}: ${ethers.formatEther(currentBalance)} ZETA`);
          if (currentBalance >= parsedAmount) break;
          await new Promise(resolve => setTimeout(resolve, 10000));
        }
      }
    }

    if (currentBalance < parsedAmount) {
      throw new Error(`Insufficient ZETA balance (${ethers.formatEther(currentBalance)}). Please manually request tokens from ${faucetUrl}?address=${wallet.address}`);
    }

    const maxAmount = currentBalance * 9n / 10n;
    const finalAmount = parsedAmount > maxAmount ? maxAmount : parsedAmount;
    console.log(`Using amount: ${ethers.formatEther(finalAmount)} ZETA`);

    const ethBalance = await provider.getBalance(wallet.address);
    console.log(`Native ETH balance: ${ethers.formatEther(ethBalance)} ETH`);
    if (ethBalance < ethers.parseEther("0.01")) {
      console.log(`Insufficient ETH for gas. Please get test ETH from ${faucetUrl}`);
      throw new Error("Insufficient ETH balance for gas.");
    }

    const connectorABI = [
      "function send(bytes32 destinationAddress, uint256 destinationChainId, bytes calldata message, address zetaParams, bytes calldata additionalParams) external payable returns (bytes32)"
    ];
    const connector = new ethers.Contract(zetaConnectorAddress, connectorABI, wallet);

    let formattedReceiver = realReceiver.startsWith('0x') ? realReceiver.slice(2) : realReceiver;
    let aptosRecipient;
    try {
      if (/^[0-9a-fA-F]+$/.test(formattedReceiver)) {
        aptosRecipient = ethers.hexlify(
          ethers.zeroPadValue('0x' + formattedReceiver.padEnd(64, '0').substring(0, 64), 32)
        );
      } else {
        aptosRecipient = ethers.keccak256(ethers.toUtf8Bytes(formattedReceiver));
      }
      console.log("Formatted Aptos recipient (bytes32):", aptosRecipient);
    } catch (error) {
      throw new Error(`Failed to format Aptos address: ${error.message}`);
    }

    const aptosChainId = 108;

    console.log("Preparing transaction:");
    console.log(`- Destination address: ${aptosRecipient}`);
    console.log(`- Destination chain ID: ${aptosChainId}`);
    console.log(`- Amount: ${ethers.formatEther(finalAmount)} ZETA`);

    const tx = await connector.send(
      aptosRecipient,
      aptosChainId,
      "0x",
      wallet.address,
      "0x",
      {
        value: finalAmount,
        gasLimit: 500000
      }
    );

    console.log("Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("Transaction confirmed in block:", receipt.blockNumber);

    return {
      message: `✅ Transfer successful to ${userReceiver}`,
      txHash: tx.hash,
      explorerLink: `https://athens.explorer.zetachain.com/evm/tx/${tx.hash}`
    };
  } catch (error) {
    console.error("Transfer error:", error);
    throw new Error(`Transfer failed: ${error.message}`);
  }
}

module.exports = { zetaToAptosTransfer };
