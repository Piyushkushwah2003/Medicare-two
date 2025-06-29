const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Story = require("./models/story");
const User = require("./models/user");
const connectToDatabase = require("../utils");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded._id;

    await connectToDatabase();

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({ createdAt: { $gte: cutoff } })
      .populate("userId", "username profilePhotoUrl")
      .populate("views", "username profilePhotoUrl")
      .sort({ createdAt: -1 });

    // Group stories by user
    const grouped = {};

    for (const story of stories) {
      const uid = story.userId._id.toString();

      if (!grouped[uid]) {
        grouped[uid] = {
          userId: uid,
          username: story.userId.username,
          profilePhotoUrl: story.userId.profilePhotoUrl,
          stories: [],
        };
      }

      grouped[uid].stories.push({
        _id: story._id,
        mediaUrl: story.mediaUrl,
        createdAt: story.createdAt,
        expiresAt: story.expiresAt,
        views: story.views,
      });
    }

    const result = Object.values(grouped); // Convert object to array

    res.status(200).json({
      message: "Stories grouped by user",
      data: result,
    });
  } catch (error) {
    console.error("Error getting stories:", error);
    res.status(500).json({ message: "Server error" });
  }
};
