const mongoose = require("mongoose");

/**
 * Connect to MongoDB using the URI from environment variables.
 * Exits the process if connection fails on startup.
 */
const connectDB = async () => {
  try {
    const dbUri = process.env.MONGO_DB_URI || process.env.MONGODB_URI;
    if (!dbUri) {
      throw new Error("MongoDB connection string is missing. Set MONGO_DB_URI or MONGODB_URI in your environment.");
    }

    const conn = await mongoose.connect(dbUri, {
      // Mongoose 8 does not need these options but kept for clarity
    });
    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

// Log disconnection events
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});

module.exports = connectDB;
