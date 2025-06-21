const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Story = require("./models/story"); // Update the path
const User = require("./models/user");   // Update the path
const connectToDatabase = require("../utils"); // Update the path

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { storyId } = req.body;

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const viewerId = decoded._id;

    await connectToDatabase();

    const story = await Story.findById(storyId);
    if (!story) {
      return res.status(404).json({ message: "Story not found" });
    }

    if (!story.views.includes(viewerId)) {
      story.views.push(viewerId);
      await story.save();
    }

    // Populate views with username and profilePhotoUrl
    const populatedStory = await Story.findById(storyId)
      .populate("views", "username profilePhotoUrl");

    res.status(200).json({
      message: "Story viewed",
      viewers: populatedStory.views,
    });
  } catch (error) {
    console.error("Error viewing story:", error);
    res.status(500).json({ message: "Server error" });
  }
};
