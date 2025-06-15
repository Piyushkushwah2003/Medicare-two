const mongoose = require('mongoose');

const PostSchema = new mongoose.Schema({
  name: { type: String, required: true },
  profilePhoto: { type: String, required: true },
  description: { type: String, required: true },
  media: [String],
  likecount: { type: Number, default: 0 },
  likes:[{id:String,name:String,profilePhoto:String}],
  commentsCounts: { type: Number, default: 0 },
  comments:[{id:String,name:String,profilePhoto:String, commentText:String}],
  saved: { type: Number, default: 0 },
  savedBy:[{id:String,name:String,profilePhoto:String}],
  shares: { type: Number, default: 0 },
  shareBy:[{id:String,name:String,profilePhoto:String}],
}, { timestamps: true });

module.exports = mongoose.model('Post', PostSchema);
