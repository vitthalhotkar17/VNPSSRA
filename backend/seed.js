/**
 * seed.js — run once to create default admin + sample data.
 * Usage: node seed.js
 */

require("dotenv").config();
const dns = require("dns");
dns.setServers(["8.8.8.8", "1.1.1.1"]);

const mongoose = require("mongoose");
const User = require("./src/models/User");
const Subject = require("./src/models/Subject");

const DEFAULT_SUBJECTS = [
  { name: "Java Programming",    code: "CS101", department: "Computer Science" },
  { name: "Data Structures",     code: "CS102", department: "Computer Science" },
  { name: "Web Technology",      code: "CS103", department: "Computer Science" },
  { name: "DBMS",                code: "CS104", department: "Computer Science" },
  { name: "Computer Networks",   code: "CS105", department: "Computer Science" },
  { name: "Python Programming",  code: "CS106", department: "Computer Science" },
  { name: "Mathematics I",       code: "MA101", department: "Mathematics" },
  { name: "Mathematics II",      code: "MA102", department: "Mathematics" },
];

const seed = async () => {
  try {
    await mongoose.connect(process.env.MONGO_DB_URI);
    console.log("✅ Connected to MongoDB");

    // ── Admin account ────────────────────────────────────────────────────────
    const existing = await User.findOne({ email: "admin@sams.edu" });
    if (!existing) {
      await User.create({
        name: "System Admin",
        email: "admin@sams.edu",
        password: "admin123",
        role: "admin",
      });
      console.log("✅ Admin created  → admin@sams.edu / admin123");
    } else {
      console.log("ℹ️  Admin already exists, skipping.");
    }

    // ── Sample faculty ────────────────────────────────────────────────────────
    const faculty = [
      { name: "Dr. Anita Sharma",  email: "anita@sams.edu",  department: "Computer Science", password: "faculty123" },
      { name: "Prof. Rajesh Kumar", email: "rajesh@sams.edu", department: "Mathematics",      password: "faculty123" },
    ];
    for (const f of faculty) {
      const ex = await User.findOne({ email: f.email });
      if (!ex) {
        await User.create({ ...f, role: "faculty" });
        console.log(`✅ Faculty created → ${f.email} / ${f.password}`);
      }
    }

    // ── Sample students ───────────────────────────────────────────────────────
    const students = [
      { name: "Aarav Patel",  email: "aarav@student.sams.edu",  rollNo: "CS2101", department: "Computer Science", year: 3, password: "student123" },
      { name: "Priya Singh",  email: "priya@student.sams.edu",  rollNo: "CS2102", department: "Computer Science", year: 3, password: "student123" },
      { name: "Rohan Mehta",  email: "rohan@student.sams.edu",  rollNo: "CS2103", department: "Computer Science", year: 3, password: "student123" },
    ];
    for (const s of students) {
      const ex = await User.findOne({ email: s.email });
      if (!ex) {
        await User.create({ ...s, role: "student" });
        console.log(`✅ Student created → ${s.email} / ${s.password}`);
      }
    }

    // ── Subjects ──────────────────────────────────────────────────────────────
    for (const sub of DEFAULT_SUBJECTS) {
      const ex = await Subject.findOne({ name: sub.name });
      if (!ex) {
        await Subject.create(sub);
        console.log(`✅ Subject created → ${sub.name}`);
      }
    }

    console.log("\n🎉 Seeding complete!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Seeding failed:", err.message);
    process.exit(1);
  }
};

seed();
