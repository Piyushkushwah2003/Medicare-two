require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const User = require("./models/user");

let isConnected = false;
async function connectToDatabase() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}

module.exports = async (req, res) => {
  if (req.method === "GET") {
    try {
      await connectToDatabase();

      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res
          .status(401)
          .json({ message: "Authorization token missing or invalid" });
      }

      const token = authHeader.split(" ")[1];

      let decoded;
      try {
        decoded = jwt.verify(token, process.env.JWT_SECRET);
      } catch (err) {
        return res.status(401).json({ message: "Invalid or expired token" });
      }

      // Explicitly select desired fields including _id
      const user = await User.findOne({ email: decoded.email }).select(
        "username email phoneNumber labelname profilePhotoUrl _id followers following requestsSent requestsReceived "
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Send user data
      res.status(200).json({ user });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      res.status(500).json({ message: `Server error: ${error.message}` });
    }
  } else {
    res.status(405).json({ message: "Method Not Allowed" });
  }
};
