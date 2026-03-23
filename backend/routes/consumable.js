const express = require("express");
const router  = express.Router();
const { pool2 } = require("../db");
const { pool } = require("../db");


// ── Table whitelists ──
const MASTER_TABLES   = { OT: "one_time_master_new",   RE: "reusables_master_new"   };
const ISSUED_TABLES   = { OT: "one_time_issued_new",   RE: "reusables_issued_new"   };
const PURCHASE_TABLES = { OT: "one_time_purchase_new", RE: "reusables_purchase_new" };

const ALLOWED_MASTERS = Object.values(MASTER_TABLES);

// Helper — get prefix from table name
function getPrefix(table) {
  if (table === MASTER_TABLES.OT) return "OT";
  if (table === MASTER_TABLES.RE) return "RE";
  return null;
}

// ─────────────────────────────────────────────
// GET /api/lab-locations
// Fetch all labs from lab_incharge table
// Returns: [ { locationid, location } ]
// ─────────────────────────────────────────────
router.get("/api/lab-locations", (req, res) => {
  pool2.query(
    `SELECT locationid, location FROM lab_incharge ORDER BY location ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, data: rows });
    }
  );
});

// ─────────────────────────────────────────────
// GET /consumable/:id?table=one_time_master_new
// Fetch item details to display on ConsumableDetails screen
// ─────────────────────────────────────────────
router.get("/consumable/:id", (req, res) => {
  const id    = req.params.id;
  const table = req.query.table;

  if (!ALLOWED_MASTERS.includes(table)) {
    return res.status(400).json({ success: false, message: "Invalid table name" });
  }

  pool2.query(`SELECT * FROM \`${table}\` WHERE id = ?`, [id], (err, rows) => {
    if (err)                        return res.status(500).json({ success: false, error: "Database error" });
    if (!rows || rows.length === 0) return res.json({ success: false, message: "Item not found" });
    res.json({ success: true, data: rows[0] });
  });
});

// ─────────────────────────────────────────────
// GET /api/consumable-stock/:id?table=
// Fetch current_stock from master table
// ─────────────────────────────────────────────
router.get("/api/consumable-stock/:id", (req, res) => {
  const id    = req.params.id;
  const table = req.query.table;

  if (!ALLOWED_MASTERS.includes(table)) {
    return res.status(400).json({ success: false, message: "Invalid table name" });
  }

  pool2.query(
    `SELECT current_stock FROM \`${table}\` WHERE id = ?`,
    [id],
    (err, rows) => {
      if (err)                        return res.status(500).json({ success: false, error: "Database error" });
      if (!rows || rows.length === 0) return res.json({ success: false, message: "Item not found" });
      res.json({ success: true, stock: rows[0].current_stock });
    }
  );
});

// ─────────────────────────────────────────────
// POST /api/add-consumable-stock
// 1. Increase current_stock in master table
// 2. Insert log row into purchase table
// Body: { consumable_id, table, amount_to_add, member_id, comment }
// ─────────────────────────────────────────────
router.post("/api/add-consumable-stock", (req, res) => {
  const { consumable_id, table, amount_to_add, member_id, comment } = req.body;

  const prefix = getPrefix(table);
  if (!prefix) return res.status(400).json({ success: false, message: "Invalid table name" });
  if (!consumable_id || !amount_to_add || parseFloat(amount_to_add) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  const purchaseTable = PURCHASE_TABLES[prefix];

  // Step 1 — Update current_stock in master table
  pool2.query(
    `UPDATE \`${table}\` SET current_stock = current_stock + ?, last_updated_timestamp = NOW() WHERE id = ?`,
    [parseFloat(amount_to_add), consumable_id],
    (err, result) => {
      if (err)                       return res.status(500).json({ success: false, error: "Database error" });
      if (result.affectedRows === 0) return res.json({ success: false, message: "Item not found" });

      // Step 2 — Insert log into purchase table
      pool2.query(
        `INSERT INTO \`${purchaseTable}\` (name, quantity, timestamp, added_by) VALUES (?, ?, NOW(), ?)`,
        [consumable_id, parseFloat(amount_to_add), member_id],
        (err2) => {
          if (err2) console.error("Purchase log error:", err2.message);
        }
      );

      // Step 3 — Return new stock
      pool2.query(
        `SELECT current_stock FROM \`${table}\` WHERE id = ?`,
        [consumable_id],
        (err3, rows) => {
          if (err3) return res.status(500).json({ success: false, error: "Database error" });
          res.json({ success: true, new_stock: rows[0].current_stock });
        }
      );
    }
  );
});







router.get("/api/consumable-members", (req, res) => {
  const search = req.query.search || "";
   console.log("Search received:", search); 

  if (search.trim().length < 2) {
    return res.json({ success: true, data: [] });
  }

  pool.query(
    `SELECT memberid, fname, lname, position, department
     FROM login
     WHERE position != 'Faculty'
     AND (fname LIKE ? OR lname LIKE ? OR memberid LIKE ?)
     ORDER BY fname ASC
     LIMIT 20`,
    [`%${search}%`, `%${search}%`, `%${search}%`],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      res.json({ success: true, data: rows });
    }
  );
});



router.post("/api/issue-consumable", (req, res) => {
  const { consumable_id, table, amount_to_issue, issued_to, lab_location_id, comment, flag } = req.body;

  const prefix = getPrefix(table);
  if (!prefix) return res.status(400).json({ success: false, message: "Invalid table name" });
  if (!consumable_id || !amount_to_issue || parseFloat(amount_to_issue) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  const issuedTable = ISSUED_TABLES[prefix];
  const flagValue = (flag !== undefined && flag !== null) ? flag : 0;

  pool2.query(
    `SELECT current_stock FROM \`${table}\` WHERE id = ?`,
    [consumable_id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      if (!rows || rows.length === 0) return res.json({ success: false, message: "Item not found" });

      const available = parseFloat(rows[0].current_stock);
      if (parseFloat(amount_to_issue) > available) {
        return res.json({ success: false, message: `Not enough stock. Available: ${available}` });
      }

      pool2.query(
        `UPDATE \`${table}\` SET current_stock = current_stock - ?, last_updated_timestamp = NOW() WHERE id = ?`,
        [parseFloat(amount_to_issue), consumable_id],
        (err2) => {
          if (err2) return res.status(500).json({ success: false, error: "Database error" });

          // ✅ userid = who it's issued TO, flag = 0 (issue) or 1 (return)
          pool2.query(
            `INSERT INTO \`${issuedTable}\` (name, quantity, timestamp, userid, lab_location, comments, flag)
             VALUES (?, ?, NOW(), ?, ?, ?, ?)`,
            [
              consumable_id,
              parseFloat(amount_to_issue),
              issued_to,            // ✅ selected member
              lab_location_id || 0,
              comment || "",
              flagValue             // ✅ 0=issue, 1=return
            ],
            (err3) => {
              if (err3) console.error("Issue log error:", err3.message);
            }
          );

          pool2.query(
            `SELECT current_stock FROM \`${table}\` WHERE id = ?`,
            [consumable_id],
            (err4, rows2) => {
              if (err4) return res.status(500).json({ success: false, error: "Database error" });
              res.json({ success: true, new_stock: rows2[0].current_stock });
            }
          );
        }
      );
    }
  );
});

router.post("/api/return-consumable", (req, res) => {
  const { consumable_id, table, amount_to_return, issued_to, lab_location_id, comment } = req.body;

  const prefix = getPrefix(table);
  if (!prefix) return res.status(400).json({ success: false, message: "Invalid table name" });
  if (!consumable_id || !amount_to_return || parseFloat(amount_to_return) <= 0) {
    return res.status(400).json({ success: false, message: "Invalid input" });
  }

  const issuedTable = ISSUED_TABLES[prefix];

  // Step 1 — Increase stock back
  pool2.query(
    `UPDATE \`${table}\` SET current_stock = current_stock + ?, last_updated_timestamp = NOW() WHERE id = ?`,
    [parseFloat(amount_to_return), consumable_id],
    (err) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });

      // Step 2 — Log with flag = 1 (return)
      pool2.query(
        `INSERT INTO \`${issuedTable}\` (name, quantity, timestamp, userid, lab_location, comments, flag)
         VALUES (?, ?, NOW(), ?, ?, ?, 1)`,
        [
          consumable_id,
          parseFloat(amount_to_return),
          issued_to,
          lab_location_id || 0,
          comment || ""
        ],
        (err2) => {
          if (err2) console.error("Return log error:", err2.message);
        }
      );

      // Step 3 — Return new stock
      pool2.query(
        `SELECT current_stock FROM \`${table}\` WHERE id = ?`,
        [consumable_id],
        (err3, rows) => {
          if (err3) return res.status(500).json({ success: false, error: "Database error" });
          res.json({ success: true, new_stock: rows[0].current_stock });
        }
      );
    }
  );
});


// GET /api/pending-stock/:consumable_id?table=&member_id=
// Get pending stock for a member for a specific item
router.get("/api/pending-stock/:consumable_id", (req, res) => {
  const { consumable_id } = req.params;
  const { table, member_id } = req.query;

  const prefix = getPrefix(table);
  if (!prefix) return res.status(400).json({ success: false, message: "Invalid table" });

  const issuedTable = ISSUED_TABLES[prefix];

  pool2.query(
    `SELECT 
      COALESCE(SUM(CASE WHEN flag = 0 THEN quantity ELSE 0 END), 0) AS total_issued,
      COALESCE(SUM(CASE WHEN flag = 1 THEN quantity ELSE 0 END), 0) AS total_returned
     FROM \`${issuedTable}\`
     WHERE name = ? AND userid = ?`,
    [consumable_id, member_id],
    (err, rows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      const issued   = parseFloat(rows[0].total_issued);
      const returned = parseFloat(rows[0].total_returned);
      const pending  = issued - returned;
      res.json({ success: true, pending, issued, returned });
    }
  );
});


module.exports = router;

