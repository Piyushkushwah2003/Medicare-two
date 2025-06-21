const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Story = require("./models/story"); // update as per your folder
const User = require("./models/user");
const connectToDatabase = require("../utils"); // update this as needed

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

    // Get stories that are not expired (e.g., posted within 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({ createdAt: { $gte: cutoff } })
      .populate("userId", "username profilePhotoUrl")
      .populate("views", "username profilePhotoUrl") // include viewer info
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Stories fetched successfully",
      stories,
    });
  } catch (error) {
    console.error("Error getting stories:", error);
    res.status(500).json({ message: "Server error" });
  }
};
