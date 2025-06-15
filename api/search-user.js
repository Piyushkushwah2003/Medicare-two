require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/user');

// MongoDB connection
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

  // Ensure request has JSON body
  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ message: 'Search query is required' });
  }

  try {
    await connectToDatabase();

    // Case-insensitive partial match
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
    }).select('_id username labelname profilePhotoUrl').limit(20);

    return res.status(200).json({ users ,statusCode:200});
  } catch (err) {
    console.error('Search error:', err);
    return res.status(500).json({ message: `Server error: ${err.message}` ,statusCode:500});
  }
};
