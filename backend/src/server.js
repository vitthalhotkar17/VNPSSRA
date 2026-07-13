// Fix DNS resolution issues (useful for MongoDB Atlas)
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const app = require("./app");
const mongoose = require("mongoose");
const User = require("./models/User");
const { assignMissingEnrollmentNumbers } = require("./utils/enrollmentNo");

const PORT = Number(process.env.PORT) || 5000;
const dbUri = process.env.MONGO_DB_URI || process.env.MONGODB_URI;

const startServer = async () => {
  try {
    if (!dbUri) {
      throw new Error("MongoDB connection string is missing. Set MONGO_DB_URI or MONGODB_URI in your environment.");
    }

    await mongoose.connect(dbUri);

    console.log("✅ Database connected successfully");

    const enrollmentAssignments = await assignMissingEnrollmentNumbers(User);
    if (enrollmentAssignments.length) {
      console.log(`🆔 Assigned ${enrollmentAssignments.length} unique enrollment number(s)`);
    }

    const listenOnPort = (port) => {
      const server = app.listen(port, () => {
        console.log(`🚀 Server running on http://localhost:${port}`);
        console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
        console.log(`📌 API Base URL: http://localhost:${port}/auth`);
      });

      server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
          const nextPort = port + 1;
          console.warn(`⚠️ Port ${port} is already in use. Trying ${nextPort} instead...`);
          listenOnPort(nextPort);
          return;
        }

        console.error("❌ Server error:", error.message);
        process.exit(1);
      });
    };

    listenOnPort(PORT);
  } catch (error) {
    console.error("❌ Failed to connect to MongoDB:", error.message);
    process.exit(1);
  }
};

startServer();

// Handle unexpected errors
process.on("unhandledRejection", (err) => {
  console.error("❌ Unhandled Promise Rejection:", err.message);
  process.exit(1);
});

process.on("uncaughtException", (err) => {
  console.error("❌ Uncaught Exception:", err.message);
  process.exit(1);
});