const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const md5 = require("md5");

const { pool, pool1 } = require("../db");

const SECRET_KEY = "secret123";

// POST /login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = md5(password);

  const emailSql = "SELECT memberid, email, fname, lname, is_admin, password, expiry_date FROM login WHERE email=?";

  pool.query(emailSql, [email], (err, result) => {
    if (err) {
      console.error("Login SQL Error:", err);
      return res.status(500).json({ success: false, error: "Internal Server Error" });
    }

    // Email not found
    if (result.length === 0) {
      return res.status(401).json({ success: false, message: "Incorrect Email. Email not found." });
    }

    const user = result[0];

    // ✅ Check expiry date
    if (user.expiry_date) {
      const expiry = new Date(user.expiry_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // compare dates only, ignore time

      if (today > expiry) {
        return res.status(401).json({ success: false, message: "Your credentials have expired." });
      }
    }

    // Check password
    if (user.password !== hashedPassword) {
      return res.status(401).json({ success: false, message: "Incorrect password." });
    }

    // Login success — log the session
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000);
    const logSql = "INSERT INTO app_login_logs (memberid, email, session_expires) VALUES (?, ?, ?)";
    pool1.query(logSql, [user.memberid, user.email, sessionExpiry], (logErr) => {
      if (logErr) console.error("Audit Log Error:", logErr.message);
    });

    delete user.password;
    delete user.expiry_date; 

    const token = jwt.sign({ id: user.memberid, email: user.email }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ success: true, token, user });
  });
});

module.exports = router;