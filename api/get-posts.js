require('dotenv').config();
const mongoose = require('mongoose');
const Post = require('./models/post');

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

  try {
    await connectToDatabase();

    const posts = await Post.find().sort({ createdAt: -1 }); // Newest first

    return res.status(200).json({
      message: 'Posts fetched successfully',
      posts,
      statusCode: 200,
    });
  } catch (error) {
    console.error('Get posts error:', error);
    return res.status(500).json({
      message: 'Server error while fetching posts',
      error: error.message,
      statusCode: 500,
    });
  }
};
