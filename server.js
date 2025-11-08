const express = require("express");
const nodemailer = require("nodemailer");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "pranto12345",
  database: "quick_learn",
});

db.connect((err) => {
  if (err) console.error("❌ DB connection failed:", err);
  else console.log("✅ Connected to MySQL Database");
});

// 🔒 In-memory OTP store
const otpStore = new Map();

// ✅ 1️⃣ SEND OTP API
app.post("/sendOTP", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    return res.status(400).json({ success: false, message: "All fields required!" });

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Generate OTP
  const OTP = Math.floor(100000 + Math.random() * 900000);
  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 min

  // Store temporarily
  otpStore.set(email, { OTP, name, hashedPassword, expiresAt });

  // Auto delete after 10 mins
  setTimeout(() => otpStore.delete(email), 10 * 60 * 1000);

  // Send mail
  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.ADMINEMAIL,
        pass: process.env.PASS,
      },
    });

    const htmlTemplate = `
      <div style="font-family:Segoe UI,sans-serif;padding:20px;border-radius:10px;background:#f9f9f9;">
        <h2 style="color:#2d7a4a;">Quick Learn OTP Verification</h2>
        <p>Hello <b>${name}</b>,</p>
        <p>Your OTP is:</p>
        <div style="font-size:28px;letter-spacing:6px;color:#2e7d32;font-weight:bold;">${OTP}</div>
        <p>This OTP will expire in 10 minutes.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Quick Learn" <${process.env.ADMINEMAIL}>`,
      to: email,
      subject: "Quick Learn - OTP Verification",
      html: htmlTemplate,
    });

    res.json({ success: true, message: "OTP sent successfully!" });
  } catch (err) {
    console.error("❌ Error sending OTP:", err);
    res.json({ success: false, message: "Failed to send OTP!" });
  }
});

// ✅ 2️⃣ VERIFY OTP AND SAVE DATA
app.post("/verifyOTP", (req, res) => {
  const { email, otp } = req.body;
  const data = otpStore.get(email);

  if (!data)
    return res.json({ success: false, message: "OTP expired or not found!" });

  if (Date.now() > data.expiresAt) {
    otpStore.delete(email);
    return res.json({ success: false, message: "OTP expired!" });
  }

  if (parseInt(otp) !== data.OTP)
    return res.json({ success: false, message: "Invalid OTP!" });

  // OTP correct → save to DB
  const sql = "INSERT INTO users (name, email, password) VALUES (?, ?, ?)";
  db.query(sql, [data.name, email, data.hashedPassword], (err) => {
    if (err) {
      console.error("❌ DB Error:", err);
      return res.json({ success: false, message: "Database error!" });
    }

    otpStore.delete(email);
    return res.json({ success: true, message: "Signup successful!" });
  });
});


// ✅ 3️⃣ LOGIN API
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.json({ success: false, message: "Email and password required!" });

  // Check if user exists
  const sql = "SELECT * FROM users WHERE email = ?";
  db.query(sql, [email], async (err, results) => {
    if (err) {
      console.error("❌ DB Error:", err);
      return res.json({ success: false, message: "Database error!" });
    }

    if (results.length === 0)
      return res.json({ success: false, message: "Invalid email or password!" });

    const user = results[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.json({ success: false, message: "Invalid email or password!" });

    // ✅ Successful login
    res.json({ success: true, message: "Login successful!", name: user.name });
  });
});


// ✅ 4️⃣ FETCH USER NAME (for Dashboard)
app.post("/getUser", (req, res) => {
  const { email } = req.body;

  if (!email) return res.json({ success: false, message: "Email required!" });

  const sql = "SELECT name FROM users WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) return res.json({ success: false, message: "Database error!" });
    if (results.length === 0)
      return res.json({ success: false, message: "User not found!" });

    res.json({ success: true, name: results[0].name });
  });
});


// ✅ Start Server
app.listen(3000, () => console.log("🚀 Server running on port 3000"));
