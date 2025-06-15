require("dotenv").config();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Post = require("./models/post");

let isConnected = false;
async function connectToDatabase() {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  isConnected = true;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "Authorization token missing" });
  }

  let userData;
  try {
    userData = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }

  const { postId, action, commentText } = req.body;

  if (!postId || !action) {
    return res.status(400).json({ message: "postId and action are required" });
  }

  try {
    await connectToDatabase();
    const post = await Post.findById(postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    const user = {
      id: userData._id,
      name: userData.username,
      profilePhoto: userData.profilePhotoUrl,
    };

    let updated = false;

    switch (action) {
      case "like":
        const likeIndex = post.likes.findIndex((l) => l.id === user.id);
        if (likeIndex > -1) {
          post.likes.splice(likeIndex, 1);
        } else {
          post.likes.push(user);
        }
        post.likecount = post.likes.length;
        updated = true;
        break;

      case "comment":
        if (!commentText) {
          return res.status(400).json({ message: "commentText is required" });
        }
        post.comments.push({
          id: user.id,
          name: user.name,
          profilePhoto: user.profilePhoto,
          commentText, // <- this matches your updated schema
        });
        post.commentsCounts = post.comments.length;
        updated = true;
        break;

      case "save":
        const saveIndex = post.savedBy.findIndex((s) => s.id === user.id);
        if (saveIndex > -1) {
          post.savedBy.splice(saveIndex, 1);
        } else {
          post.savedBy.push(user);
        }
        post.saved = post.savedBy.length;
        updated = true;
        break;

      case "share":
        const sharedBefore = post.shareBy.find((s) => s.id === user.id);
        if (!sharedBefore) {
          post.shareBy.push(user);
        }
        post.shares += 1;
        updated = true;
        break;

      default:
        return res.status(400).json({ message: "Invalid action" });
    }

    if (updated) {
      await post.save();
    }

    return res.status(200).json({ message: `Post ${action} successful`, post ,statusCode:200});
  } catch (err) {
    console.error("Action error:", err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
};
