const express = require("express");
const router = express.Router();
const { pool2 } = require("../db");

// GET /check-permission/:memberId/:chemicalId
router.get("/check-permission/:memberId/:chemicalId", (req, res) => {
  const { memberId, chemicalId } = req.params;

  const chemicalSQL = "SELECT type FROM bulk_chemical WHERE chemical_id = ?";

  pool2.query(chemicalSQL, [chemicalId], (err, chemicalRows) => {
    if (err) return res.status(500).json({ success: false, error: "Database error" });
    if (!chemicalRows || chemicalRows.length === 0) return res.json({ success: false, hasPermission: false });

    const chemicalType = chemicalRows[0].type;
    const permSQL = "SELECT * FROM bulk_chemical_permissions WHERE memberid = ? AND role = ?";

    pool2.query(permSQL, [memberId, chemicalType], (err2, permRows) => {
      if (err2) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, hasPermission: permRows.length > 0 });
    });
  });
});

module.exports = router;


router.get("/api/check-consumable-permission/:memberId/:role", (req, res) => {
  const { memberId, role } = req.params;
 
  const validRoles = ["consumables-one-time", "consumables-reusable"];
  if (!validRoles.includes(role)) {
    return res.status(400).json({ success: false, error: "Invalid role" });
  }
 
  pool2.query(
    "SELECT * FROM bulk_chemical_permissions WHERE memberid = ? AND role = ?",
    [memberId, role],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, hasPermission: rows.length > 0 });
    }
  );
});
 
module.exports = router;