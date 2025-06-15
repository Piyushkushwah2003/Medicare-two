require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('./models/user');

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
  if (!token) return res.status(401).json({ message: 'Authorization token missing' });

  let userData;
  try {
    userData = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  try {
    await connectToDatabase();

    // Use _id if available, otherwise fallback to username
    const query = userData._id
      ? { _id: userData._id }
      : { username: userData.username };

    const user = await User.findOne(query).select('recentSearches');

    if (!user) return res.status(404).json({ message: 'User not found' });

    const lastFiveSearches = user.recentSearches
      .sort((a, b) => b.searchedAt - a.searchedAt)
      .slice(0, 5);

    return res.status(200).json({ recentSearches: lastFiveSearches });
  } catch (error) {
    console.error('Fetch recent searches error:', error);
    return res.status(500).json({ message: `Server error: ${error.message}` });
  }
};
