const express = require("express");
const router  = express.Router();
const { pool3 } = require("../db");
const verifyToken = require("../middleware");
const { requireSparepartPermission } = require("../inventoryPermission");

// ─────────────────────────────────────────────
// GET /api/sparepart/:id
// Fetch spare part details from spare_part table
// Returns: spare part object
// ─────────────────────────────────────────────
router.get("/sparepart/:id",(req, res) => {
  const id = req.params.id;

  pool3.query(
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
router.get("/sparepart-permission/:classification",(req, res) => {
  const memberId = req.user.id;
  const { classification } = req.params;

  const ALLOWED_CLASSIFICATIONS = [
    "equipment",
    "emt",
    "facility",
    "safety",
    "consumables"
  ];

  const col = String(classification).toLowerCase();

  if (!ALLOWED_CLASSIFICATIONS.includes(col)) {
    return res.status(400).json({
      success: false,
      message: "Invalid classification"
    });
  }

  pool3.query(
    `SELECT \`${col}\` AS permission
     FROM mail_permission_spareparts
     WHERE memberid = ?`,
    [memberId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: "Database error"
        });
      }

      if (!rows || rows.length === 0) {
        return res.json({
          success: true,
          hasPermission: false
        });
      }

      return res.json({
        success: true,
        hasPermission: rows[0].permission === 1
      });
    }
  );
});


  
// ─────────────────────────────────────────────
// GET /api/sparepart-status
// Fetch all status types from status table
// Returns: [ { status, desc } ]
// ─────────────────────────────────────────────
router.get("/sparepart-status",(req, res) => {
  pool3.query(
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
router.post("/sparepart-add-stock", requireSparepartPermission, (req, res) => {
  const { sparepart_id, amount_to_add, comment } = req.body;
  const member_id = req.user.id;

  if (!sparepart_id || !amount_to_add || parseFloat(amount_to_add) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  // Step 1 — Update quantity in spare_part
  pool3.query(
    `UPDATE spare_part SET quantity = quantity + ? WHERE id = ?`,
    [parseFloat(amount_to_add), sparepart_id],
    (err, result) => {
      if (err)                       return res.status(500).json({ success: false, error: "Database error" });
      if (result.affectedRows === 0) return res.json({ success: false, message: "Item not found" });

      // Step 2 — Fetch updated stock
      pool3.query(
        `SELECT quantity FROM spare_part WHERE id = ?`,
        [sparepart_id],
        (err2, rows) => {
          if (err2) return res.status(500).json({ success: false, error: "Database error" });

          const newStock = rows[0].quantity;

          // Step 3 — Log into bulk_sparepart_update
          pool3.query(
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
router.post("/sparepart-issue", requireSparepartPermission, (req, res) => {
  const { sparepart_id, amount_to_issue, issued_to, comment } = req.body;
  const issued_by = req.user.id;

  if (!sparepart_id || !amount_to_issue || parseFloat(amount_to_issue) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }
  if (!issued_to) {
    return res.status(400).json({ success: false, message: "issued_to is required" });
  }

  // Step 1 — Check available stock
  pool3.query(
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
      pool3.query(
        `UPDATE spare_part SET quantity = quantity - ? WHERE id = ?`,
        [parseFloat(amount_to_issue), sparepart_id],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, error: "Database error" });

          // Step 3 — Log into bulk_sparepart_issue
          pool3.query(
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
          pool3.query(
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


router.post("/sparepart-update-status", requireSparepartPermission, (req, res) => {
  const { sparepart_id, status, member_id, comment } = req.body;

  if (!sparepart_id || !status) {
    return res.status(400).json({ success: false, message: "sparepart_id and status are required" });
  }

  const ALLOWED_TRANSITIONS = [
    [1,3], [1,7],
    [2,4], [2,5], [2,7],
    [3,1], [3,2], [3,4], [3,5], [3,6], [3,7],
    [4,5], [4,7],
    [6,1], [6,2], [6,4], [6,5], [6,7],
  ];

  // Step 1: Get current status + both names via JOIN
  pool3.query(
    `SELECT st.status, s1.desc AS current_desc, s2.desc AS new_desc
     FROM sparepart_track st
     JOIN \`status\` s1 ON s1.status = st.status
     JOIN \`status\` s2 ON s2.status = ?
     WHERE st.spare_id = ?
     ORDER BY st.date_status_marked DESC LIMIT 1`,
    [status, sparepart_id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });

      if (rows.length > 0) {
        const currentStatus = rows[0].status;
        const newStatus = parseInt(status);

        const isAllowed = ALLOWED_TRANSITIONS.some(
          ([from, to]) => from === currentStatus && to === newStatus
        );

        if (!isAllowed) {
          return res.status(400).json({
            success: false,
            message: `Cannot change status from "${rows[0].current_desc}" to "${rows[0].new_desc}"`
          });
        }
      }

      // Step 2: Insert new status
      pool3.query(
        `INSERT INTO sparepart_track (spare_id, status, date_status_marked, comments)
         VALUES (?, ?, NOW(), ?)`,
        [sparepart_id, status, comment || ""],
        (err) => {
          if (err) return res.status(500).json({ success: false, message: "Database error" });
          res.json({ success: true, message: "Status updated successfully" });
        }
      );
    }
  );
});
// });

module.exports = router;
