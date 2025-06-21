require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/user');

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
    const user = await User.findOne({ email: decoded.email });

    if (!user) return res.status(404).json({ message: 'User not found' });

    // Mark all notifications as read
    user.notifications = user.notifications.map((notif) => ({
      ...notif.toObject(),
      isRead: true,
    }));

    await user.save();

    return res.status(200).json({ message: 'All notifications marked as read' });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Server error: ${err.message}` });
  }
};
