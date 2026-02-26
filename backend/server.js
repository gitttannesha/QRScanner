const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const db = require("./dbPool");
//const {querydb} = require("./dbPool");
const os = require("os");
const app = express();
app.use(express.json());
app.use(cors()); 

const SECRET_KEY = "secret123";
``
// --- LOGIN ROUTE ---
app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const hashedPassword = md5(password);

  // Updated to use the 'qr_scanner' database and 'login' table as you specified
  const sql = "SELECT memberid, email, fname, lname, is_admin FROM qr_scanner.login WHERE email=? AND password=?";

  try {
    const [result] = await db.queryDB(sql, [email, hashedPassword]);

    if (result.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result[0];

    // Logging to the 2nd database: 'login' with table 'app_login_logs'
    const logSql = "INSERT INTO login.app_login_logs (memberid, email, device) VALUES (?, ?, ?)";
    
    // Log the entry (using mobile as the device identifier)
    db.queryDB(logSql, [user.memberid, user.email, "mobile"]).catch(err => {
        console.error("Audit Log Error (check if table 'app_login_logs' exists):", err.message);
    });

    const token = jwt.sign({ id: user.memberid, email: user.email }, SECRET_KEY, { expiresIn: "1d" });

    // Send back success
    res.json({ success: true, token, user });

  } catch (err) {
    console.error("Login SQL Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});



// 1. ADDITION LOGIC (The one for your current scanner screen)

// ROUTE 1: Add to existing stock (Mathematics: +)
app.post('/api/add-stock', async (req, res) => {
    const { chemical_id, amount_to_add } = req.body;

    try {
        const sql = "UPDATE bulk_chemicals.bulk_chemical SET stock = stock + ? WHERE chemical_id = ?";
        const result = await queryDB(sql, [amount_to_add, chemical_id]);

        if (result.affectedRows > 0) {
            res.status(200).json({ success: true, message: "Stock incremented!" });
        } else {
            res.status(404).json({ success: false, message: "Chemical ID not found." });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ROUTE 2: Overwrite stock total (Replacement: =)
app.post('/api/update-stock', async (req, res) => {
    const { chemical_id, new_total } = req.body;

    try {
        const sql = "UPDATE bulk_chemicals.bulk_chemical SET stock = ? WHERE chemical_id = ?";
        const result = await queryDB(sql, [new_total, chemical_id]);

        res.status(200).json({ success: true, message: "Stock total updated!" });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});






app.get("/chemical/:id", async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM bulk_chemicals.bulk_chemical WHERE chemical_id = ?";

  try {
    // FIX: Add the brackets [ ] around 'rows' to catch the first part of the result
    const [rows] = await db.queryDB(sql, [id]);
    if (!rows || rows.length === 0) {
      return res.json({ 
        success: false, 
        message: "Chemical not found" 
      });
    }

    res.json({
      success: true,
      data: rows[0], 
    });
  //   res.json(rows[0]);
   } catch (err) {
    console.error("Chemical DB Error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});



// Using 0.0.0.0 is perfect for Expo Go access
const PORT = 5000;

// Logic to automatically find your current network IP
const networkInterfaces = os.networkInterfaces();
const IP_ADDRESS = Object.values(networkInterfaces)
  .flat()
  .find(i => i.family === 'IPv4' && !i.internal)?.address || 'localhost';

app.listen(PORT, "0.0.0.0", () => {
  console.log("-----------------------------------------");
  console.log(`🚀 Server is LIVE on the network!`);
  console.log(`Target IP for your App: http://${IP_ADDRESS}:${PORT}`); 
  console.log("Listening for Expo Go connections...");
  console.log("-----------------------------------------");
});