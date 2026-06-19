const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { pool, pool4, pool5 ,pool6 } = require("../db");
const SarvamAI = require("sarvamai");
require("dotenv").config();

const sarvam = new SarvamAI.SarvamAIClient({
  apiSubscriptionKey: process.env.SARVAM_API_KEY,
});

const router = express.Router();


// 🎤 Sarvam Speech-to-Text + Translate Route
const audioUpload = multer({
  storage: multer.memoryStorage() // store in memory, not disk
});

router.post("/complaints/transcribe", audioUpload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No audio file received."
      });
    }

    // Save audio temporarily
    const tempPath = path.join(__dirname, `../uploads/temp_${Date.now()}.wav`);
    fs.writeFileSync(tempPath, req.file.buffer);

    // Call Sarvam API
    const response = await sarvam.speechToText.transcribe({
      file: fs.createReadStream(tempPath),
      model: "saaras:v3",
      mode: "translate", // transcribe + translate to English
    });

    // Delete temp file
    fs.unlinkSync(tempPath);

    return res.json({
      success: true,
      transcript: response.transcript,
    });

  } catch (error) {
    console.error("Sarvam transcription error:", error);
    return res.status(500).json({
      success: false,
      message: "Transcription failed."
    });
  }
});


//Path for the file uploads
const UPLOADS_DIR = "/opt/lampp/htdocs/iitbnf_troubleshooting/views/uploads/";

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}


const CATEGORIES_DIR =  "/opt/lampp/htdocs/iitbnf_troubleshooting/views/complaint_categories";

const TYPE_FILE_MAP = {
  5: "hr.txt",
  6: "it.txt",
  7: "purchase.txt",
  8: "training.txt",
  9: "inventory.txt",
  10: "admin.txt",
};

const TYPE_NAME_MAP = {
  1: "Equipment",
  2: "Facility",
  3: "Safety",
  4: "Process",
  5: "HR",
  6: "IT",
  7: "Purchase",
  8: "Training",
  9: "Inventory",
  10: "Admin",
};


router.get("/complaint-maps", async (req, res) => {
  try {
    const typeMap = { ...TYPE_NAME_MAP };
    const machineMap = {};

    // ✅ Types 5-10: Read from txt files
    for (const [typeId, fileName] of Object.entries(TYPE_FILE_MAP)) {
      const filePath = path.join(CATEGORIES_DIR, fileName);

      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, "utf8");
        const lines = content.split("\n").filter(line => line.trim() !== "");

        machineMap[typeId] = {};
        lines.forEach((line) => {
          const parts = line.split(/\s*-\s*/);
          if (parts.length === 2) {
            const name = parts[0].trim();
            const id = parts[1].trim();
            machineMap[typeId][id] = name;
          }
        });
      }
    }

    // ✅ Type 1 & 4: Equipment + Process → slotbooking → resources table
    const [equipmentRows] = await pool.promise().query(
      "SELECT machid, name FROM resources"
    );
    machineMap["1"] = {};
    machineMap["4"] = {};
    equipmentRows.forEach((row) => {
      machineMap["1"][String(row.machid)] = row.name;
      machineMap["4"][String(row.machid)] = row.name;
    });

    // ✅ Type 3: Safety → safety DB → safety_devices table
    const [safetyRows] = await pool5.promise().query(
      "SELECT device_id, device_name FROM safety_device"
    );
    machineMap["3"] = {};
    safetyRows.forEach((row) => {
      machineMap["3"][String(row.device_id)] = row.device_name;
    });

    // ✅ Type 2: Facility → facility_management DB → resources table
    const [facilityRows] = await pool6.promise().query(
      "SELECT machid, name FROM resources"
    );
    machineMap["2"] = {};
    facilityRows.forEach((row) => {
      machineMap["2"][String(row.machid)] = row.name;
    });

         //0 - miscellaneous
       Object.keys(machineMap).forEach((typeId) => {
      machineMap[typeId]["0"] = "Miscellaneous";
      machineMap[typeId]["5000"] = "FOC Agenda";
    });

    return res.json({
      success: true,
      maps: { TYPE_MAP: typeMap, MACHINE_MAP: machineMap },
    });

  } catch (error) {
    console.error("Complaint maps error:", error);
    return res.status(500).json({ success: false, message: "Could not load complaint maps." });
  }
});




const FILE_EXTENSION_BY_TYPE = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
};

const sanitizeComplaintId = (value) =>
  String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");



const upload = multer({
  storage: multer.memoryStorage(),
  limits: {fileSize: 50 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (FILE_EXTENSION_BY_TYPE[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, or PDF files are allowed."));
    }
  },
});

router.post("/complaints/action", (req, res) => {
  upload.single("file")(req, res, async (uploadError) => {
    if (uploadError) {
      console.error("Complaint file upload error:", uploadError);

      return res.status(400).json({
        success: false,
        message: uploadError.message || "File upload failed.",
      });
    }

    const {
      complaint_id,
      diagnosis,
      action_taken,
      expected_completion_date,
      status,
    } = req.body;

    if (!complaint_id || !diagnosis || !action_taken ) {
      return res.status(400).json({
        success: false,
        message: "Complaint action details are incomplete.",
      });
    }

    if (![0, 1, 2, 3].includes(Number(status))) {
      return res.status(400).json({
        success: false,
        message: "Invalid complaint status.",
      });
    }

    try {

    const statusMarkBy = req.user.id;
    const timestamp = new Date();
    //const filePath =  req.file ? `/iitbnf_troubleshooting/views/uploads/${req.file.filename}` : null;
    const [rows] = await pool4.promise().query(
  "SELECT COUNT(*) AS action_count FROM trouble_track WHERE complaint_id = ?",
  [complaint_id]
);
const actionIndex = rows[0].action_count;

// ✅ Write file manually with versioned name
let filePath = null;

if (req.file) {
  const extension = FILE_EXTENSION_BY_TYPE[req.file.mimetype];
  const fileName = `${complaint_id}_${actionIndex}${extension}`;
  const destPath = path.join(UPLOADS_DIR, fileName);
  fs.writeFileSync(destPath, req.file.buffer);
  filePath = `/iitbnf_troubleshooting/views/uploads/${fileName}`;
}

    const insertColumns =`complaint_id, timestamp, status_mark_by,working_team, diagnosis, action_taken, work_done_by, vendor_name, vendor_contact, vendor_interaction, vendor_comments, spare_parts, cost_spare_parts,procurement_time_spares, expected_completion_date, action_plan, action_item_owner, file, comments`

const insertValues = [
  complaint_id,
  timestamp,
  statusMarkBy,
  '',
  diagnosis.trim(),
  action_taken.trim(),
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  expected_completion_date,
  '',
  '',
  filePath || '',
  ''
];


          const insertSql = `
          INSERT INTO trouble_track (${insertColumns})
          VALUES (${insertValues.map(() => "?").join(", ")})
        `;

        await pool4.promise().query(insertSql, insertValues);

        const updateSql = `
          UPDATE equipment_complaint
          SET status = ?, status_timestamp = ?, status_updated_by = ?
          WHERE complaint_id = ?
        `;

        const [updateResult] = await pool4.promise().query(updateSql, [
          Number(status),
          timestamp,
          statusMarkBy,
          complaint_id,
        ]);

        if (!updateResult.affectedRows) {
          return res.status(404).json({
            success: false,
            message: "Complaint not found.",
          });
        }

        return res.json({
          success: true,
          message: "Action submitted successfully.",
          file: filePath,
          action_index: actionIndex,
        });
  } catch (error) {
      console.error("Complaint action error:", error);
      return res.status(500).json({
        success: false,
        message: "Something went wrong while saving the action.",
      });
    }
  });
});


router.get("/complaints", (req, res) => {
  const allocatedTo = req.user.id;

  const complaintSql = `
   SELECT
    ec.complaint_id,
    ec.member_id,
    ec.allocated_to,
    ec.type,
    ec.machine_id,
    ec.status,
    ec.scheduler,
    ec.complaint_description,
    ec.time_of_complaint,
    tt.last_visited
  FROM equipment_complaint ec
  LEFT JOIN (
    SELECT complaint_id, MAX(timestamp) AS last_visited
    FROM trouble_track
    GROUP BY complaint_id
  ) tt ON tt.complaint_id = ec.complaint_id
  WHERE ec.allocated_to = ?
    AND ec.status IN (0, 1, 3)
  ORDER BY ec.time_of_complaint DESC
`;


  pool4.query(complaintSql, [allocatedTo], (complaintError, complaints) => {
    if (complaintError) {
      console.error("Complaints fetch error:", complaintError);

      return res.status(500).json({
        success: false,
        message: "Could not fetch complaints.",
      });
    }

    if (complaints.length === 0) {
      return res.json({
        success: true,
        complaints: [],
      });
    }

    const memberIds = [...new Set(complaints.map((complaint) => complaint.member_id))];
    const placeholders = memberIds.map(() => "?").join(", ");

    const loginSql = `
      SELECT memberid, fname, lname
      FROM login
      WHERE memberid IN (${placeholders})
    `;

    pool.query(loginSql, memberIds, (memberError, members) => {
      if (memberError) {
        console.error("Login fetch error:", memberError);

        return res.status(500).json({
          success: false,
          message: "Could not fetch complaint user information.",
        });
      }

      const memberMap = {};

      members.forEach((member) => {
        memberMap[member.memberid] = `${member.fname || ""} ${member.lname || ""}`.trim();
      });

      const enrichedComplaints = complaints.map((complaint) => ({
        ...complaint,
        complaint_by_name:
          memberMap[complaint.member_id] || `Member #${complaint.member_id}`,
      }));

      return res.json({
        success: true,
        complaints: enrichedComplaints,
      });
    });
  });
});

module.exports = router;


