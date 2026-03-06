const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const md5 = require("md5");
const db = require("./dbPool");
const os = require("os");
const app = express();
app.use(express.json());
app.use(cors()); 

const SECRET_KEY = "secret123";
``
// --- LOGIN ROUTE ---
app.post("/login", async (req, res) => {
  const { email, password , device} = req.body;
  const hashedPassword = md5(password);

  // Updated to use the 'qr_scanner' database and 'login' table as you specified
  const sql = "SELECT memberid, email, fname, lname, is_admin FROM qr_scanner.login WHERE email=? AND password=?";

  try {
    const result = await db.queryDB(sql, [email, hashedPassword]);

    if (result.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result[0];
    const sessionExpiry = new Date(Date.now() + 60 * 60 * 1000);
    // Logging to the 2nd database: 'login' with table 'app_login_logs'
    const logSql = "INSERT INTO login.app_login_logs (memberid, email, device, session_expires) VALUES (?, ?, ?, ?)";
    
    // Log the entry (using mobile as the device identifier)
    db.queryDB(logSql, [user.memberid, user.email, "mobile", sessionExpiry]).catch(err => {
        console.error("Audit Log Error (check if table 'app_login_logs' exists):", err.message);
    });

    const token = jwt.sign({ id: user.memberid, email: user.email }, SECRET_KEY, { expiresIn: "1h" });

    // Send back success
    res.json({ success: true, token, user });

  } catch (err) {
    console.error("Login SQL Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});






app.post('/api/add-stock', async (req, res) => {
    const { chemical_id, amount_to_add, member_id, comment } = req.body;

    try {
        // Get current stock first
        const getCurrentStock = "SELECT stock_present FROM bulk_chemicals.bulk_chemical_update WHERE chemical_id = ? ORDER BY datetime DESC LIMIT 1";
        const currentResult = await db.queryDB(getCurrentStock, [chemical_id]);

        const currentStock = currentResult.length > 0 ? parseFloat(currentResult[0].stock_present) : 0.0;
        const newStock = currentStock + parseFloat(amount_to_add);

        // Insert new record
        const sql = "INSERT INTO bulk_chemicals.bulk_chemical_update (chemical_id, stock_present, datetime, flag, updated_by, comments) VALUES (?, ?, NOW(), 1, ?, ?)";
        const result = await db.queryDB(sql, [chemical_id, newStock, member_id, comment || "new stock"]);

        res.status(200).json({ success: true, message: "Stock added!", new_stock: newStock });
    } catch (error) {
        console.error("ADD STOCK ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});







app.post('/api/update-stock', async (req, res) => {
    const { chemical_id, new_total, member_id, comment } = req.body;

    try {
        const sql = "INSERT INTO bulk_chemicals.bulk_chemical_update (chemical_id, stock_present, datetime, flag, updated_by, comments) VALUES (?, ?, NOW(), 0, ?, ?)";
        const result = await db.queryDB(sql, [chemical_id, parseFloat(new_total), member_id, comment || "new stock"]);

        res.status(200).json({ success: true, message: "Stock updated!", new_stock: new_total });
    } catch (error) {
        console.error("UPDATE STOCK ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});




app.get('/api/current-stock/:chemical_id', async (req, res) => {
    const { chemical_id } = req.params;

    try {
        const sql = "SELECT stock_present FROM bulk_chemicals.bulk_chemical_update WHERE chemical_id = ? ORDER BY datetime DESC LIMIT 1";
        const result = await db.queryDB(sql, [chemical_id]);

        const stock = result.length > 0 ? parseFloat(result[0].stock_present) : 0.0;
        res.status(200).json({ success: true, stock });
    } catch (error) {
        console.error("GET STOCK ERROR:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});





app.get("/chemical/:id", async (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM bulk_chemicals.bulk_chemical WHERE chemical_id = ?";

  try {
    const rows = await db.queryDB(sql, [id]);
    if (!rows || rows.length === 0) {
      return res.json({ success: false, message: "Chemical not found" });
    }

    const chemical = rows[0];


    const baseURL = "https://www.iitbnf.iitb.ac.in/inventory/";
    if (chemical.msds) {
    chemical.msds = baseURL + chemical.msds.replace(/ /g, '%20');
    }
    // Fetch equipment names from resources table
    if (chemical.equipment_used) {
      const ids = chemical.equipment_used.split(",").map(id => id.trim()).filter(Boolean);
      
      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        const equipmentSQL = `SELECT machid, name FROM bulk_chemicals.resources WHERE machid IN (${placeholders})`;
        const equipmentRows = await db.queryDB(equipmentSQL, ids);
        chemical.equipment_names = equipmentRows.map(r => r.name);
      }
    } else {
      chemical.equipment_names = [];
    }

    res.json({ success: true, data: chemical });

  } catch (err) {
    console.error("Chemical DB Error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});




app.get("/check-permission/:memberId/:chemicalId", async (req, res) => {
  const { memberId, chemicalId } = req.params;

  try {
    // Get the chemical type
    const chemicalSQL = "SELECT type FROM bulk_chemicals.bulk_chemical WHERE chemical_id = ?";
    const chemicalRows = await db.queryDB(chemicalSQL, [chemicalId]);

    if (!chemicalRows || chemicalRows.length === 0) {
      return res.json({ success: false, hasPermission: false });
    }

    const chemicalType = chemicalRows[0].type;

    // Check if member has matching role in permissions table
    const permSQL = "SELECT * FROM bulk_chemicals.bulk_chemical_permissions WHERE memberid = ? AND role = ?";
    const permRows = await db.queryDB(permSQL, [memberId, chemicalType]);

    res.json({
      success: true,
      hasPermission: permRows.length > 0
    });

  } catch (err) {
    console.error("Permission check error:", err);
    res.status(500).json({ success: false, error: "Database error" });
  }
});





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