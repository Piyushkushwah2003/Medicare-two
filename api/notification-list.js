require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/user');

// Connect to MongoDB
async function connectToDatabase() {
  if (mongoose.connection.readyState >= 1) return;
  await mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Authorization token missing' });

  try {
    await connectToDatabase();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded._id);

    if (!user) return res.status(404).json({ message: 'User not found' });

    const enhancedNotifications = await Promise.all(
      user.notifications
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map(async (notif) => {
          const fromId = notif?.from?.id;
          let status = 'Follow';
          let isVerified = false;

          if (fromId) {
            const isFollowing = user.following.some((u) => u.id === fromId);
            const hasSentRequest = user.requestsSent.some((u) => u.id === fromId);
            const hasReceivedRequest = user.requestsReceived.some((u) => u.id === fromId);

            if (isFollowing) status = 'Following';
            else if (hasSentRequest) status = 'Requested';
            else if (hasReceivedRequest) status = 'Follow Back';

            const fromUser = await User.findById(fromId).select("isVerified");
            if (fromUser) {
              isVerified = fromUser.isVerified || false;
            }
          }

          return {
            ...notif._doc,
            status,
            from: {
              ...notif.from,
              isVerified,
            },
          };
        })
    );

    return res.status(200).json({ notifications: enhancedNotifications, statusCode: 200 });
  } catch (err) {
    console.error('Notification fetch error:', err);
    return res.status(500).json({ message: `Server error: ${err.message}`, statusCode: 500 });
  }
};
