const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Story = require("./models/story");
const User = require("./models/user");
const connectToDatabase = require("../utils"); // Adjust this path as needed

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized: No token provided" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const username = decoded.username;

    await connectToDatabase();

    const myStories = await Story.find({ username })
      .populate("userId", "username profilePhotoUrl isVerified")
      .populate("views", "username profilePhotoUrl")
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Fetched your stories successfully",
      stories: myStories,
    });
  } catch (error) {
    console.error("Error fetching your stories:", error);
    res.status(500).json({ message: "Server error" });
  }
};
