const { pool2, pool3 } = require("./db");

const forbidden = (res) =>
  res.status(403).json({
    success: false,
    message: "You do not have permission to manage this inventory."
  });

const requireChemicalPermission = (req, res, next) => {
  const chemicalId = req.body.chemical_id || req.params.chemicalId;

  if (!chemicalId) {
    return res.status(400).json({ success: false, message: "Chemical ID is required." });
  }

  const sql = `
    SELECT 1
    FROM bulk_chemical_permissions p
    JOIN bulk_chemical c ON c.type = p.role
    WHERE p.memberid = ? AND c.chemical_id = ?
    LIMIT 1
  `;

  pool2.query(sql, [req.user.id, chemicalId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (!rows.length) {
      return forbidden(res);
    }

    next();
  });
};

const requireConsumablePermission = (req, res, next) => {
  const roles = {
    one_time_master_new: "consumables-one-time",
    reusables_master_new: "consumables-reusable"
  };

  const role = roles[req.body.table || req.query.table];

  if (!role) {
    return res.status(400).json({ success: false, message: "Invalid table name" });
  }

  pool2.query(
    "SELECT 1 FROM bulk_chemical_permissions WHERE memberid = ? AND role = ? LIMIT 1",
    [req.user.id, role],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ success: false, message: "Database error" });
      }

      if (!rows.length) {
        return forbidden(res);
      }

      next();
    }
  );
};

const requireSparepartPermission = (req, res, next) => {
  const sparepartId = req.body.sparepart_id;

  if (!sparepartId) {
    return res.status(400).json({ success: false, message: "Spare part ID is required." });
  }

  const sql = `
    SELECT mps.*, sp.classification
    FROM spare_part sp
    LEFT JOIN mail_permission_spareparts mps ON mps.memberid = ?
    WHERE sp.id = ?
    LIMIT 1
  `;

  pool3.query(sql, [req.user.id, sparepartId], (err, rows) => {
    if (err) {
      return res.status(500).json({ success: false, message: "Database error" });
    }

    if (!rows.length) {
      return forbidden(res);
    }

    const classification = String(rows[0].classification || "").toLowerCase();
    const allowedColumns = ["equipment", "emt", "facility", "safety", "consumables"];

    if (!allowedColumns.includes(classification) || rows[0][classification] !== 1) {
      return forbidden(res);
    }

    next();
  });
};

module.exports = {
  requireChemicalPermission,
  requireConsumablePermission,
  requireSparepartPermission
};