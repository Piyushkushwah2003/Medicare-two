// models/status.js
const mongoose = require("mongoose");

const statusSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  isOnline: { type: Boolean, default: false },
  isTypingTo: { type: String, default: null }, // userId you're typing to
  lastSeen: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Status", statusSchema);
