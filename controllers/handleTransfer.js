const { ethers } = require("ethers");
const chains = require("../utils/chainConfig");
const { Connection, Keypair, LAMPORTS_PER_SOL, SystemProgram, Transaction, PublicKey } = require("@solana/web3.js");
const { AptosClient, AptosAccount } = require("aptos");

async function handleTransfer(data) {
  const { sender, receiver, amount, sendingChain, receivingChain, token } = data;
  const chain = chains[sendingChain];

  if (!chain) throw new Error("Unsupported sending chain");

  // ----------------- SOLANA -----------------
  if (sendingChain === "solana") {
    const connection = new Connection(chain.rpc, "confirmed");
    const secretKey = Uint8Array.from([]); // Paste secret key array here
    const fromKeypair = Keypair.fromSecretKey(secretKey);
    const toPubkey = new PublicKey(receiver);

    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: fromKeypair.publicKey,
        toPubkey: toPubkey,
        lamports: LAMPORTS_PER_SOL * parseFloat(amount)
      })
    );

    const signature = await connection.sendTransaction(tx, [fromKeypair]);
    return { message: "✅ Solana devnet transfer sent", txHash: signature };
  }

  // ----------------- APTOS -----------------
  if (sendingChain === "aptos") {
    const client = new AptosClient(chain.rpc);
    const privateKey = new Uint8Array([]); // Paste Aptos private key (array format)
    const account = new AptosAccount(privateKey);

    const tx = await client.transfer(account, receiver, parseInt(amount) * 1_000_000);
    return { message: "✅ Aptos testnet transfer sent", txHash: tx.hash };
  }

  // ----------------- EVM Chains + Zeta -----------------
  if (["ethereum", "polygon", "zetachain"].includes(sendingChain)) {
    if (!receiver.startsWith("0x") || receiver.length !== 42) {
      throw new Error("❌ Invalid EVM address. Must start with 0x and be 42 characters.");
    }

    const provider = new ethers.JsonRpcProvider(chain.rpc);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

    const tx = await wallet.sendTransaction({
      to: receiver,
      value: ethers.parseEther(amount)
    });

    return {
      message: `✅ Transfer sent from ${sendingChain} to ${receivingChain}`,
      txHash: tx.hash
    };
  }

  throw new Error("❌ Chain not supported yet.");
}

module.exports = { handleTransfer };
