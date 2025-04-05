const express = require("express");
const { ethers } = require("ethers");
const cors = require("cors");
const WebSocket = require("ws");
require("dotenv").config();

const app = express();
app.use(express.json());

const provider = new ethers.JsonRpcProvider(process.env.ZETA_TESTNET_RPC, {
  name: "zeta-testnet",
  chainId: 7001
});

// Add network detection with better error handling
provider.getNetwork()
  .then(network => {
    console.log('Connected to network:', network.name, 'Chain ID:', network.chainId);
  })
  .catch(err => {
    console.error('Failed to connect to network:', err);
    console.log('Please check:');
    console.log('1. Your internet connection');
    console.log('2. The RPC URL in .env file');
    console.log('3. If the RPC endpoint is operational');
    process.exit(1);
  });

const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Create WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
  console.log('New WebSocket connection');
  
  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

app.post("/transfer", async (req, res) => {
  const { from, to, amount } = req.body;

  if (!from || !to || !amount) {
    return res.status(400).json({ error: "from, to and amount required" });
  }

  if (to.toLowerCase() === from.toLowerCase()) {
    return res.status(400).json({ error: "Cannot send to self" });
  }

  try {
    const tx = await wallet.sendTransaction({
      from,
      to,
      value: ethers.parseEther(amount),
    });

    // Broadcast transaction hash to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'TRANSACTION_CREATED',
          hash: tx.hash
        }));
      }
    });

    console.log("Tx Hash:", tx.hash);
    const receipt = await tx.wait();
    
    // Broadcast confirmation to all connected clients
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'TRANSACTION_CONFIRMED',
          hash: tx.hash,
          blockNumber: receipt.blockNumber
        }));
      }
    });

    console.log("✅ Native ZETA Transfer complete");
    res.json({ 
      success: true, 
      txHash: tx.hash,
      from: wallet.address,
      to: to,
      amount: amount
    });
  } catch (err) {
    console.error("Transfer failed:", err);
    res.status(500).json({ error: "Transfer failed", details: err.message });
  }
});

app.get('/balance', async (req, res) => {
  try {
    const balance = await provider.getBalance(wallet.address);
    res.json({ 
      address: wallet.address,
      balance: ethers.formatEther(balance),
      unit: 'ZETA'
    });
  } catch (err) {
    console.error("Balance check failed:", err);
    res.status(500).json({ error: "Balance check failed", details: err.message });
  }
});

app.use(cors());

const PORT = 5000;
const server = app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));

// Upgrade HTTP server to handle WebSocket
server.on('upgrade', (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request);
  });
});
