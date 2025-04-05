const express = require("express");
const router = express.Router();
const { handleTransfer } = require("../controllers/handleTransfer");
const { zetaToAptosTransfer } = require("../utils/zetaToAptosTransfer");

// Change app.post to router.post
router.post("/transfer/zeta", async (req, res) => {
  const { sendingChain, receivingChain, receiver, amount } = req.body;

  try {
    if (sendingChain === "zetachain" && receivingChain === "aptos") {
      const result = await zetaToAptosTransfer({ receiver, amount });
      return res.json(result);
    }

    return res.status(400).json({ error: "Only ZETA to Aptos supported here now" });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
});

router.post("/transfer", async (req, res) => {
  try {
    const result = await handleTransfer(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;
