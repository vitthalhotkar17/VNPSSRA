require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/User");

const uri =
  process.env.MONGO_URI ||
  process.env.MONGODB_URI ||
  process.env.DB_URI ||
  process.env.MONGO_URL ||
  process.env.DATABASE_URL ||
  process.env.MONGO_DB_URI;

async function run() {
  if (!uri) {
    console.error("No Mongo connection string found in .env (checked MONGO_URI, MONGODB_URI, DB_URI, MONGO_URL, DATABASE_URL).");
    console.error("Open your .env file and tell me the exact variable name you see there.");
    process.exit(1);
  }

  await mongoose.connect(uri);

  const faculty = await User.find({ role: "faculty" }).select("name department").lean();
  const students = await User.find({ role: "student" }).select("name department").lean();

  console.log("=== FACULTY ===");
  faculty.forEach((f) =>
    console.log(f.name, "?", JSON.stringify(f.department), "|", typeof f.department)
  );

  console.log("\n=== STUDENTS ===");
  students.forEach((s) =>
    console.log(s.name, "?", JSON.stringify(s.department), "|", typeof s.department)
  );

  process.exit();
}

run().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
