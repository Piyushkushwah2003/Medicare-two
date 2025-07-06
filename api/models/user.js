const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: String,
  email: String,
  phoneNumber:String,
  password: String,
  profilePhotoUrl: String,
  labelname:String,
  tokens: [{ token: String }],
  isActive:Boolean,
  isDelete:Boolean,
   isVerified: {
    type: Boolean,
    default: false,
  },
  followers: [{ id: String, username: String, profilePhotoUrl: String }],
  following: [{ id: String, username: String, profilePhotoUrl: String }],
  requestsSent: [{ id: String, username: String, profilePhotoUrl: String }],
  requestsReceived: [{ id: String, username: String, profilePhotoUrl: String }],
  recentSearches: [
  {
    query: String,
    searchedAt: { type: Date, default: Date.now },
  },],
 notifications: [
    {
      type: { type: String },
      from: {
        id: String,
        username: String,
        profilePhotoUrl: String,
      },
      message: String,
      createdAt: { type: Date, default: Date.now },
      isRead: { type: Boolean, default: false },
    }
  ],
   isOnline: { type: Boolean, default: false },
  isTypingTo: { type: String, default: null }, // userId you're typing to
  lastSeen: { type: Date, default: Date.now },
});

module.exports = mongoose.model("User", userSchema);
