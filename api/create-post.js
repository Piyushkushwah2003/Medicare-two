require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { IncomingForm } = require('formidable');

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Post = require('./models/post'); // Your Post schema

const supabase = createClient(
  'https://parwypfewrsnkqdbazmt.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnd5cGZld3JzbmtxZGJhem10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc4MjE0OCwiZXhwIjoyMDY1MzU4MTQ4fQ.VnyLyLd7hcH12rrnSNMifTYJE40RZSO-LD19-EVeljk'
);

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

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
  if (!token) {
    return res.status(401).json({ message: 'Authorization token missing' });
  }

  let userData;
  try {
    userData = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Invalid token' });
  }

  const form = new IncomingForm({ multiples: true });
  
  form.parse(req, async (err, fields, files) => {
    if (err) return res.status(400).json({ message: 'Form parsing error' });

    const description = fields.description?.[0];
    const mediaFiles = Array.isArray(files.media)
      ? files.media
      : files.media
      ? [files.media]
      : [];

    if (!description || mediaFiles.length === 0) {
      return res.status(400).json({ message: 'Description and media are required' });
    }

    try {
      await connectToDatabase();

      const mediaUrls = [];

      for (const file of mediaFiles) {
        const fileExt = path.extname(file.originalFilename);
        const fileName = `post_${Date.now()}_${Math.random().toString(36).substring(2)}${fileExt}`;
        const fileBuffer = fs.readFileSync(file.filepath);

        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(fileName, fileBuffer, {
            contentType: file.mimetype,
          });

        if (uploadError) {
          console.error('Upload error:', uploadError);
          return res.status(500).json({ message: 'Failed to upload media file' });
        }

        const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
        mediaUrls.push(data.publicUrl);
      }

      const newPost = new Post({
        name: userData.username,
        profilePhoto: userData.profilePhotoUrl,
        description,
        media: mediaUrls,
        likecount:0,
        likes:[],
        commentsCounts:0,
        comments:[],
        saved:0,
        savedBy:[],
        shares:0,
        shareBy:[],
      });

      await newPost.save();

      return res.status(201).json({
        message: 'Post created successfully',
        post: newPost,
        statusCode:200
      });
    } catch (error) {
      console.error('Post creation error:', error);
      return res.status(500).json({ message: `Server error: ${error.message}`,statusCode:500 });
    }
  });
};
