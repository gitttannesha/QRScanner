const express = require("express");
const router = express.Router();
const { pool, pool2, pool3 } = require("../db");
const verifyToken = require("../middleware");


// GET /api/profile — Protected route, requires a valid token
router.get("/profile", (req, res) => {
  const memberid = req.user.id;

  // Step 1 - Get user info from login table
  pool.query(
    "SELECT memberid, fname, lname, email, position FROM login WHERE memberid = ?",
    [memberid],
    (err, userRows) => {
      if (err) return res.status(500).json({ success: false, error: "Database error" });
      if (!userRows || userRows.length === 0)
        return res.status(404).json({ success: false, message: "User not found" });

      const user = userRows[0];

      // Step 1.5 - to get the Login session of the user
      pool.query(
        "SELECT created_at, session_expires FROM app_login_logs WHERE memberid = ? ORDER BY created_at DESC LIMIT 1",
        [memberid],
        (errLog, logRows) => {
          const lastLogin      = logRows && logRows.length > 0 ? logRows[0].created_at : null;
          const sessionExpires = logRows && logRows.length > 0 ? logRows[0].session_expires : null;



          // Step 2 - Fetch reusables items issued to the user
          //ri -- reusable_issued_new     the which stores the issued entries for reusables
          //rm -- reusables_master_new    the primary table for reusables
          pool2.query(
            `SELECT ri.name as item_id, rm.name as item_name, ri.quantity, ri.timestamp, ri.flag
             FROM reusables_issued_new ri
             LEFT JOIN reusables_master_new rm ON ri.name = rm.id
             WHERE ri.userid = ?
             ORDER BY ri.timestamp DESC`,
            [memberid],
            (err2, reusableRows) => {
              if (err2) reusableRows = [];



              // Step 3 -Fetch one time issued items to the user
              // oi  -- onetime_issued_new --the table whihc stores the issued entries for one time
              // om  -- onetime_master new --the primary table for one time consumables
              pool2.query(
                `SELECT oi.name as item_id, om.name as item_name, oi.quantity, oi.timestamp, oi.flag
                 FROM one_time_issued_new oi
                 LEFT JOIN one_time_master_new om ON oi.name = om.id
                 WHERE oi.userid = ?
                 ORDER BY oi.timestamp DESC`,
                [memberid],
                (err3, oneTimeRows) => {
                  if (err3) oneTimeRows = [];




                  // Step 4 - spare issue
                  pool3.query(
                    `SELECT bsi.sparepart_id as item_id, sp.name as item_name,
                     bsi.quantity, bsi.timestamp, 0 as flag
                     FROM bulk_sparepart_issue bsi
                     LEFT JOIN spare_part sp ON bsi.sparepart_id = sp.id
                     WHERE bsi.issued_by = ?
                     ORDER BY bsi.timestamp DESC LIMIT 10`,
                    [memberid],
                    (err4, spareIssueRows) => {
                      if (err4) spareIssueRows = [];

                      // Step 5 - spare update
                      pool3.query(
                        `SELECT bsu.sparepart_id as item_id, sp.name as item_name,
                         bsu.stock_present as quantity, bsu.datetime as timestamp, 1 as flag
                         FROM bulk_sparepart_update bsu
                         LEFT JOIN spare_part sp ON bsu.sparepart_id = sp.id
                         WHERE bsu.updated_by = ?
                         ORDER BY bsu.datetime DESC LIMIT 10`,
                        [memberid],
                        (err5, spareUpdateRows) => {
                          if (err5) spareUpdateRows = [];

                          // Step 6 - one time purchase
                          pool2.query(
                            `SELECT op.id, om.name as item_name, op.quantity,
                             op.timestamp, 1 as flag
                             FROM one_time_purchase_new op
                             LEFT JOIN one_time_master_new om ON op.name = om.id
                             WHERE op.added_by = ?
                             ORDER BY op.timestamp DESC LIMIT 10`,
                            [memberid],
                            (err6, oneTimePurchaseRows) => {
                              if (err6) oneTimePurchaseRows = [];

                              // Step 7 - reusables purchase
                              pool2.query(
                                `SELECT rp.id, rm.name as item_name, rp.quantity,
                                 rp.timestamp, 1 as flag
                                 FROM reusables_purchase_new rp
                                 LEFT JOIN reusables_master_new rm ON rp.name = rm.id
                                 WHERE rp.added_by = ?
                                 ORDER BY rp.timestamp DESC LIMIT 10`,
                                [memberid],
                                (err7, reusablePurchaseRows) => {
                                  if (err7) reusablePurchaseRows = [];

                                  // Step 8 - chemical additions
                                  pool2.query(
                                    `SELECT bcu.chemical_id as item_id, bc.chemical_name as item_name,
                                     bcu.stock_present as quantity, bcu.datetime as timestamp, bcu.flag as flag
                                     FROM bulk_chemical_update bcu
                                     LEFT JOIN bulk_chemical bc ON bcu.chemical_id = bc.chemical_id
                                     WHERE bcu.updated_by = ?
                                     ORDER BY bcu.datetime DESC LIMIT 10`,
                                    [memberid],
                                    (err8, chemicalAddRows) => {
                                      if (err8) chemicalAddRows = [];

                                            // Merge all
                                      const allTransactions = [
                                          ...reusableRows.map(t => ({...t, source: 'issue'})),
                                          ...oneTimeRows.map(t => ({...t, source: 'issue'})),
                                          ...spareIssueRows.map(t => ({...t, source: 'issue'})),
                                          ...spareUpdateRows.map(t => ({...t, source: 'add'})),
                                          ...oneTimePurchaseRows.map(t => ({...t, source: 'add'})),
                                          ...reusablePurchaseRows.map(t => ({...t, source: 'add'})),
                                          ...chemicalAddRows.map(t => ({...t, source: 'add'})),
                                             ]



                                      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
                                      .slice(0, 20)
                                      .map(t => ({
                                        item_name: t.item_name || `Item #${t.item_id}`,
                                        quantity: t.quantity,
                                        timestamp: t.timestamp,
                                        action: t.source === 'add' ? (t.flag === 1 ? "New Stock Added" : "Current Stock Updated") : t.flag === 0 ? "Issued" : "Returned",
                                        type: t.source === 'add' ? (t.flag === 1 ? "add" : "update") : t.flag === 0 ? "issue" : "return",
                                        flag: t.flag,
                                      }));

                                      const totalIssued = allTransactions.filter(t => t.type === "issue").length;
                                      const totalReturned = allTransactions.filter(t => t.type === "return").length;
                                      const active = Math.max(totalIssued - totalReturned, 0);

                                      res.json({
                                        success: true,
                                        user: { ...user, lastLogin, sessionExpires },
                                        transactions: allTransactions,
                                        stats: {
                                          totalIssued,
                                          active,
                                          transactions: allTransactions.length,
                                        },
                                      });
                                    }
                                  ); // closes chemical
                                }
                              ); // closes reusable purchase
                            }
                          ); // closes one time purchase
                        }
                      ); // closes spare update
                    }
                  ); // closes spare issue
                }
              ); // closes one time issued
            }
          ); // closes reusable issued
        }
      ); // closes login logs
    }
  ); // closes user query
}); // closes router.get

module.exports = router;

