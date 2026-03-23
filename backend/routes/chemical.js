const express = require("express");
const router = express.Router();
const { pool2 } = require("../db");

// GET /chemical/:id
router.get("/chemical/:id", (req, res) => {
  const id = req.params.id;
  const sql = "SELECT * FROM bulk_chemical WHERE chemical_id = ?";

    pool2.query(sql, [id], (err, rows) => {
    if (err) return res.status(500).json({ success: false, error: "Database error" });
    if (!rows || rows.length === 0) return res.json({ success: false, message: "Chemical not found" });

    const chemical = rows[0];
    const baseURL = "https://www.iitbnf.iitb.ac.in/inventory/";
    if (chemical.msds) {
      chemical.msds = baseURL + chemical.msds.replace(/ /g, "%20");
    }

    if (chemical.equipment_used) {
      const ids = chemical.equipment_used.split(",").map(id => id.trim()).filter(Boolean);

      if (ids.length > 0) {
        const placeholders = ids.map(() => "?").join(",");
        const equipmentSQL = `SELECT machid, name FROM resources WHERE machid IN (${placeholders})`;

        pool2.query(equipmentSQL, ids, (err2, equipmentRows) => {
          if (err2) return res.status(500).json({ success: false, error: "Database error" });
          chemical.equipment_names = equipmentRows.map(r => r.name);
          res.json({ success: true, data: chemical });
        });
      } else {
        chemical.equipment_names = [];
        res.json({ success: true, data: chemical });
      }
    } else {
      chemical.equipment_names = [];
      res.json({ success: true, data: chemical });
    }
  });
});

module.exports = router;