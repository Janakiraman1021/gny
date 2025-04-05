const mongoose = require("mongoose");

const transferSchema = new mongoose.Schema({
  from: String,
  to: String,
  amount: String,
  sendingChain: String,
  receivingChain: String,
  status: { type: String, default: "pending" },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Transfer", transferSchema);
