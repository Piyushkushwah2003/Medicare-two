require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const Post = require('./models/post'); // Adjust if your path differs

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
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  let userData;
  try {
    userData = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    await connectToDatabase();

    const userPosts = await Post.find({ name: userData.username }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: 'User posts fetched successfully',
      posts: userPosts,
    });
  } catch (error) {
    console.error('Fetch user posts error:', error);
    return res.status(500).json({ message: 'Server error', error: error.message });
  }
};
