require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const formidable = require("formidable");
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");
const User = require("./models/user");

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
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
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

    const username = fields.username?.[0];
    const email = fields.email?.[0];
    const phoneNumber = fields.phoneNumber?.[0];
    const password = fields.password?.[0];
    const labelname = fields.labelname?.[0];
    const profilePhoto = files.profilePhoto?.[0]; // single file

    if (
      !username ||
      !email ||
      !phoneNumber ||
      !password ||
      !labelname ||
      !profilePhoto
    ) {
      return res
        .status(400)
        .json({ message: "All fields including profile photo are required" });
    }

    try {
      await connectToDatabase();

      const existingUser = await User.findOne({
        $or: [{ email }, { username }],
      });

      if (existingUser) {
        return res
          .status(400)
          .json({ message: "Email or username already exists" });
      }

      // Upload profile photo to Supabase
      const fileExt = path.extname(profilePhoto.originalFilename);
      const fileName = `profile_${Date.now()}${fileExt}`;
      const fileBuffer = fs.readFileSync(profilePhoto.filepath);

      const { error: uploadError } = await supabase.storage
        .from("uploads")
        .upload(fileName, fileBuffer, {
          contentType: profilePhoto.mimetype,
        });

      if (uploadError) {
        console.error("Supabase upload error:", uploadError);
        return res
          .status(500)
          .json({ message: "Failed to upload profile photo" });
      }

      const { data: publicUrlData } = supabase.storage
        .from("uploads")
        .getPublicUrl(fileName);

      const profilePhotoUrl = publicUrlData.publicUrl;

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create JWT
      const token = jwt.sign(
        { email, profilePhotoUrl, username },
        process.env.JWT_SECRET,
        {
          expiresIn: "7d",
        }
      );

      // Save user to DB
      const newUser = new User({
        username,
        email,
        phoneNumber,
        password: hashedPassword,
        labelname,
        profilePhotoUrl,
        tokens: [{ token }],
        isActive: true,
        isDelete: false,
        followers: [],
        following: [],
        requestsSent: [],
        requestsReceived: [],
        recentSearches:[],
      });

      await newUser.save();

      res.status(201).json({
        message: "User account created successfully",
        token,
        profilePhotoUrl,
      });
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: `Server error: ${error.message}` });
    }
  });
};
