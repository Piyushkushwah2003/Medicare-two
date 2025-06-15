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
  if (req.method !== 'POST') {
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

  const { targetUserId, action } = req.body;
  if (!targetUserId || !action) {
    return res.status(400).json({ message: 'targetUserId and action are required' });
  }

  try {
    await connectToDatabase();

    const me = await User.findOne({ email: userData.email });
    const target = await User.findById(targetUserId);
    if (!me || !target) return res.status(404).json({ message: 'User not found' });

    const meData = { id: me._id.toString(), username: me.username, profilePhotoUrl: me.profilePhotoUrl };
    const targetData = { id: target._id.toString(), username: target.username, profilePhotoUrl: target.profilePhotoUrl };

    let actionMessage = '';

    switch (action) {
      case 'sendRequest': {
        const alreadySent = me.requestsSent.some(u => u.id === targetData.id);
        const alreadyReceived = target.requestsReceived.some(u => u.id === meData.id);

        if (alreadySent && alreadyReceived) {
          me.requestsSent = me.requestsSent.filter(u => u.id !== targetData.id);
          target.requestsReceived = target.requestsReceived.filter(u => u.id !== meData.id);
          actionMessage = 'Follow request canceled';
        } else {
          me.requestsSent.push(targetData);
          target.requestsReceived.push(meData);
          actionMessage = 'Follow request sent';
        }
        break;
      }

      case 'acceptRequest': {
        const requestExists = me.requestsReceived.some(u => u.id === targetData.id);
        if (!requestExists) return res.status(400).json({ message: 'No request to accept' });

        me.followers.push(targetData);
        target.following.push(meData);

        me.requestsReceived = me.requestsReceived.filter(u => u.id !== targetData.id);
        target.requestsSent = target.requestsSent.filter(u => u.id !== meData.id);

        actionMessage = 'Follow request accepted';
        break;
      }

      case 'deleteRequest': {
        me.requestsSent = me.requestsSent.filter(u => u.id !== targetData.id);
        target.requestsReceived = target.requestsReceived.filter(u => u.id !== meData.id);
        actionMessage = 'Follow request deleted';
        break;
      }

      case 'followBack': {
        const alreadyFollowing = me.following.some(u => u.id === targetData.id);
        if (alreadyFollowing) return res.status(400).json({ message: 'Already following' });

        me.following.push(targetData);
        target.followers.push(meData);
        actionMessage = 'Followed back successfully';
        break;
      }

      case 'unfollow': {
        const isFollowing = me.following.some(u => u.id === targetData.id);
        const isFollower = target.followers.some(u => u.id === meData.id);

        if (!isFollowing && !isFollower) {
          return res.status(400).json({ message: 'You are not following this user' });
        }

        me.following = me.following.filter(u => u.id !== targetData.id);
        target.followers = target.followers.filter(u => u.id !== meData.id);
        actionMessage = 'Unfollowed successfully';
        break;
      }

      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    await me.save();
    await target.save();

    return res.status(200).json({ message: actionMessage ,statuscode:200});
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: `Server error: ${err.message}`,statuscode:500 });
  }
};
