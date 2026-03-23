const express = require("express");
const router = express.Router();
const {pool2 } = require("../db");

// POST /api/add-stock
router.post("/add-stock", (req, res) => {
  const { chemical_id, amount_to_add, member_id, comment } = req.body;

  const getCurrentStock = "SELECT stock_present FROM bulk_chemical_update WHERE chemical_id = ? ORDER BY datetime DESC LIMIT 1";

  pool2.query(getCurrentStock, [chemical_id], (err, currentResult) => {
    if (err) return res.status(500).json({ success: false, error: err.message });

    const currentStock = currentResult.length > 0 ? parseFloat(currentResult[0].stock_present) : 0.0;
    const newStock = currentStock + parseFloat(amount_to_add);

    const sql = "INSERT INTO bulk_chemical_update (chemical_id, stock_present, datetime, flag, updated_by, comments) VALUES (?, ?, NOW(), 1, ?, ?)";

    pool2.query(sql, [chemical_id, newStock, member_id, comment || "new stock"], (err2) => {
      if (err2) return res.status(500).json({ success: false, error: err2.message });
      res.status(200).json({ success: true, message: "Stock added!", new_stock: newStock });
    });
  });
});

// POST /api/update-stock
router.post("/update-stock", (req, res) => {
  const { chemical_id, new_total, member_id, comment } = req.body;

  const sql = "INSERT INTO bulk_chemical_update (chemical_id, stock_present, datetime, flag, updated_by, comments) VALUES (?, ?, NOW(), 0, ?, ?)";

  pool2.query(sql, [chemical_id, parseFloat(new_total), member_id, comment || "new stock"], (err) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    res.status(200).json({ success: true, message: "Stock updated!", new_stock: new_total });
  });
});

// GET /api/current-stock/:chemical_id
router.get("/current-stock/:chemical_id", (req, res) => {
  const { chemical_id } = req.params;

  const sql = "SELECT stock_present FROM bulk_chemical_update WHERE chemical_id = ? ORDER BY datetime DESC LIMIT 1";

  pool2.query(sql, [chemical_id], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err.message });
    const stock = result.length > 0 ? parseFloat(result[0].stock_present) : 0.0;
    res.status(200).json({ success: true, stock });
  });
});

module.exports = router;