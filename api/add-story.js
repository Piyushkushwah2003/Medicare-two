require("dotenv").config();
const mongoose = require("mongoose");
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const { createClient } = require("@supabase/supabase-js");
const Story = require("./models/story");
const User = require("./models/user"); // To verify user if needed

// Supabase client
const supabase = createClient(
  "https://parwypfewrsnkqdbazmt.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcnd5cGZld3JzbmtxZGJhem10Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTc4MjE0OCwiZXhwIjoyMDY1MzU4MTQ4fQ.VnyLyLd7hcH12rrnSNMifTYJE40RZSO-LD19-EVeljk"
);

module.exports.config = {
  api: {
    bodyParser: false,
  },
};

// MongoDB Connection
let isConnected = false;
async function connectToDatabase() {
  if (isConnected) return;
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw new Error("Failed to connect to MongoDB");
  }
}

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({ message: "Form parsing error" });
    }

    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Unauthorized - Token missing" });
    }

    let userData;
    try {
      userData = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const media = files.media?.[0];
    if (!media) {
      return res.status(400).json({ message: "Media file is required" });
    }

    try {
      await connectToDatabase();

      // Upload media to Supabase
      const fileExt = path.extname(media.originalFilename);
      const fileName = `story_${Date.now()}${fileExt}`;
      const fileBuffer = fs.readFileSync(media.filepath);

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, fileBuffer, {
          contentType: media.mimetype,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res.status(500).json({ message: "Failed to upload media" });
      }

      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);
      const mediaUrl = publicUrlData.publicUrl;

      const story = new Story({
        userId: userData._id,
        username: userData.username,
        profilePhoto: userData.profilePhotoUrl,
        mediaUrl,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hrs
      });

      await story.save();

      res.status(201).json({ message: "Story uploaded successfully", story });
    } catch (error) {
      console.error("Error uploading story:", error);
      res.status(500).json({ message: `Server error: ${error.message}` });
    }
  });
};
