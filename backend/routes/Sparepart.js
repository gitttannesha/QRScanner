const express = require("express");
const router  = express.Router();
const { pool2 } = require("../db");
const { pool }  = require("../db");

// ─────────────────────────────────────────────
// GET /api/sparepart/:id
// Fetch spare part details from spare_part table
// Returns: spare part object
// ─────────────────────────────────────────────
router.get("/api/sparepart/:id", (req, res) => {
  const id = req.params.id;

  pool2.query(
    `SELECT * FROM spare_part WHERE id = ?`,
    [id],
    (err, rows) => {
      if (err)                        return res.status(500).json({ success: false, error: "Database error" });
      if (!rows || rows.length === 0) return res.json({ success: false, message: "Item not found" });
      res.json({ success: true, data: rows[0] });
    }
  );
});

// ─────────────────────────────────────────────
// GET /api/sparepart-permission/:memberId/:classification
// Check if logged-in member has permission for this spare part's classification
// Looks up mail_permission_spareparts table — column name = classification value
// Returns: { hasPermission: true/false }
// ─────────────────────────────────────────────
router.get("/api/sparepart-permission/:memberId/:classification", (req, res) => {
  const { memberId, classification } = req.params;

  // Whitelist allowed classification columns to prevent SQL injection
  const ALLOWED_CLASSIFICATIONS = ["equipment", "emt", "facility", "safety", "consumables"];

  if (!ALLOWED_CLASSIFICATIONS.includes(classification.toLowerCase())) {
    return res.status(400).json({ success: false, message: "Invalid classification" });
  }

  const col = classification.toLowerCase();

  pool2.query(
    `SELECT \`${col}\` AS permission FROM mail_permission_spareparts WHERE memberid = ?`,
    [memberId],
    (err, rows) => {
      if (err)                        return res.status(500).json({ success: false, error: "Database error" });
      if (!rows || rows.length === 0) return res.json({ success: true, hasPermission: false });
      res.json({ success: true, hasPermission: rows[0].permission === 1 });
    }
  );
});

// ─────────────────────────────────────────────
// GET /api/sparepart-status
// Fetch all status types from status table
// Returns: [ { status, desc } ]
// ─────────────────────────────────────────────
router.get("/api/sparepart-status", (req, res) => {
  pool2.query(
    `SELECT status, \`desc\` FROM \`status\` ORDER BY status ASC`,
    (err, rows) => {
      if (err) {
        console.error("Status query error:", err.message, err.sqlMessage);
        return res.status(500).json({ success: false, error: "Database error", detail: err.sqlMessage });
      }
      res.json({ success: true, data: rows });
    }
  );
});

// ─────────────────────────────────────────────
// POST /api/sparepart-add-stock
// 1. Increase quantity in spare_part table
// 2. Insert log row into bulk_sparepart_update
// Body: { sparepart_id, amount_to_add, member_id, comment }
// ─────────────────────────────────────────────
router.post("/api/sparepart-add-stock", (req, res) => {
  const { sparepart_id, amount_to_add, member_id, comment } = req.body;

  if (!sparepart_id || !amount_to_add || parseFloat(amount_to_add) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  // Step 1 — Update quantity in spare_part
  pool2.query(
    `UPDATE spare_part SET quantity = quantity + ? WHERE id = ?`,
    [parseFloat(amount_to_add), sparepart_id],
    (err, result) => {
      if (err)                       return res.status(500).json({ success: false, error: "Database error" });
      if (result.affectedRows === 0) return res.json({ success: false, message: "Item not found" });

      // Step 2 — Fetch updated stock
      pool2.query(
        `SELECT quantity FROM spare_part WHERE id = ?`,
        [sparepart_id],
        (err2, rows) => {
          if (err2) return res.status(500).json({ success: false, error: "Database error" });

          const newStock = rows[0].quantity;

          // Step 3 — Log into bulk_sparepart_update
          pool2.query(
            `INSERT INTO bulk_sparepart_update (sparepart_id, stock_present, datetime, updated_by) VALUES (?, ?, NOW(), ?)`,
            [sparepart_id, newStock, member_id],
            (err3) => {
              if (err3) console.error("Stock update log error:", err3.message);
            }
          );

          res.json({ success: true, new_stock: newStock });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// POST /api/sparepart-issue
// 1. Check stock availability
// 2. Decrease quantity in spare_part
// 3. Insert log into bulk_sparepart_issue (issued_by + issued_to)
// Body: { sparepart_id, amount_to_issue, issued_by, issued_to, comment }
// ─────────────────────────────────────────────
router.post("/api/sparepart-issue", (req, res) => {
  const { sparepart_id, amount_to_issue, issued_by, issued_to, comment } = req.body;

  if (!sparepart_id || !amount_to_issue || parseFloat(amount_to_issue) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }
  if (!issued_to) {
    return res.status(400).json({ success: false, message: "issued_to is required" });
  }

  // Step 1 — Check available stock
  pool2.query(
    `SELECT quantity FROM spare_part WHERE id = ?`,
    [sparepart_id],
    (err, rows) => {
      if (err)                        return res.status(500).json({ success: false, error: "Database error" });
      if (!rows || rows.length === 0) return res.json({ success: false, message: "Item not found" });

      const available = parseFloat(rows[0].quantity);
      if (parseFloat(amount_to_issue) > available) {
        return res.json({ success: false, message: `Not enough stock. Available: ${available}` });
      }

      // Step 2 — Decrease quantity in spare_part
      pool2.query(
        `UPDATE spare_part SET quantity = quantity - ? WHERE id = ?`,
        [parseFloat(amount_to_issue), sparepart_id],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, error: "Database error" });

          // Step 3 — Log into bulk_sparepart_issue
          pool2.query(
            `INSERT INTO bulk_sparepart_issue (sparepart_id, issued_by, issued_to, timestamp, quantity, purpose)
             VALUES (?, ?, ?, NOW(), ?, ?)`,
            [
              sparepart_id,
              issued_by,
              issued_to,
              parseFloat(amount_to_issue),
              comment || ""
            ],
            (err3) => {
              if (err3) console.error("Issue log error:", err3.message);
            }
          );

          // Step 4 — Return new stock
          pool2.query(
            `SELECT quantity FROM spare_part WHERE id = ?`,
            [sparepart_id],
            (err4, rows2) => {
              if (err4) return res.status(500).json({ success: false, error: "Database error" });
              res.json({ success: true, new_stock: rows2[0].quantity });
            }
          );
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// POST /api/sparepart-update-status
// Log status change into sparepart_track table
// Body: { sparepart_id, status, member_id, comment }
// ─────────────────────────────────────────────
router.post("/api/sparepart-update-status", (req, res) => {
  const { sparepart_id, status, member_id, comment } = req.body;

  if (!sparepart_id || !status) {
    return res.status(400).json({ success: false, message: "sparepart_id and status are required" });
  }

  pool2.query(
    `INSERT INTO sparepart_track (spare_id, status, date_status_marked, comments)
     VALUES (?, ?, NOW(), ?)`,
    [sparepart_id, status, comment || ""],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, message: "Status updated successfully" });
    }
  );
});

module.exports = router;