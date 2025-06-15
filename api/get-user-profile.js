require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/user');
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
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authorization token missing' });

  let viewerData;
  try {
    viewerData = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const { profileUserId } = req.body;
  if (!profileUserId) {
    return res.status(400).json({ message: 'profileUserId is required' });
  }

  try {
    await connectToDatabase();

    const viewer = await User.findOne({ email: viewerData.email });
    const profileUser = await User.findById(profileUserId);
    if (!viewer || !profileUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Determine follow status
    const viewerId = viewer._id.toString();
    const profileId = profileUser._id.toString();

    const isFollowing = viewer.following.some(u => u.id === profileId);
    const hasSentRequest = viewer.requestsSent.some(u => u.id === profileId);
    const canFollowBack = viewer.followers.some(u => u.id === profileId) && !isFollowing;

    let status = 'follow', buttonText = 'Follow';
    if (isFollowing) {
      status = 'following'; buttonText = 'Following';
    } else if (hasSentRequest) {
      status = 'requested'; buttonText = 'Requested';
    } else if (canFollowBack) {
      status = 'followback'; buttonText = 'Follow Back';
    }

    // Fetch posts from this user
    const posts = await Post.find({ name: profileUser.username })
      .sort({ createdAt: -1 })
      .select('description media likecount commentsCounts createdAt');

    // Build response
    return res.status(200).json({
      profile: {
        id: profileUser._id,
        username: profileUser.username,
        labelname: profileUser.labelname,
        profilePhotoUrl: profileUser.profilePhotoUrl,
      },
      stats: {
        followersCount: profileUser.followers.length,
        followingCount: profileUser.following.length,
        requestsSentCount: profileUser.requestsSent.length,
        requestsReceivedCount: profileUser.requestsReceived.length,
      },
      followStatus: { status, buttonText },
      posts,
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
};
