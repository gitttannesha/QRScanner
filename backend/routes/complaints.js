const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");
const { pool, pool4 } = require("../db");
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
    const tempPath = path.join(__dirname, `../views/uploads/temp_${Date.now()}.wav`);
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
const UPLOADS_DIR = path.join(__dirname, "../views/uploads");

if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const FILE_EXTENSION_BY_TYPE = {
  "application/pdf": ".pdf",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
};

const sanitizeComplaintId = (value) =>
  String(value || "unknown").replace(/[^a-zA-Z0-9_-]/g, "");

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const extension = FILE_EXTENSION_BY_TYPE[file.mimetype];
    cb(null, `${req.body.complaint_id}${extension}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024},
  fileFilter: (req, file, cb) => {
    if (FILE_EXTENSION_BY_TYPE[file.mimetype]) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG, or PDF files are allowed."));
    }
  },
});

router.post("/complaints/action", (req, res) => {
  upload.single("file")(req, res, (uploadError) => {
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

    if (!complaint_id || !diagnosis || !action_taken || !expected_completion_date) {
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

    const statusMarkBy = req.user.id;
    const timestamp = new Date();
    const filePath = req.file ? `views/uploads/${req.file.filename}` : null;

    const insertColumns = filePath
      ? `complaint_id, timestamp, status_mark_by, diagnosis, action_taken, expected_completion_date, file`
      : `complaint_id, timestamp, status_mark_by, diagnosis, action_taken, expected_completion_date`;

    const insertValues = filePath
      ? [complaint_id, timestamp, statusMarkBy, diagnosis.trim(), action_taken.trim(), expected_completion_date, filePath]
      : [complaint_id, timestamp, statusMarkBy, diagnosis.trim(), action_taken.trim(), expected_completion_date];

    const insertSql = `
      INSERT INTO trouble_track (${insertColumns})
      VALUES (${insertValues.map(() => "?").join(", ")})
    `;

    pool4.query(insertSql,insertValues,(insertError) => {
        if (insertError) {
          console.error("trouble_track insert error:", insertError);

          return res.status(500).json({
            success: false,
            message: "Could not save the action taken.",
          });
        }

        const updateSql = `
          UPDATE equipment_complaint
          SET status = ?, status_timestamp = ?, status_updated_by = ?
          WHERE complaint_id = ?
        `;

        pool4.query(
          updateSql,
          [Number(status), timestamp, statusMarkBy, complaint_id],
          (updateError, result) => {
            if (updateError) {
              console.error("equipment_complaint update error:", updateError);

              return res.status(500).json({
                success: false,
                message: "Action was recorded, but complaint status could not be updated.",
              });
            }

            if (!result.affectedRows) {
              return res.status(404).json({
                success: false,
                message: "Complaint not found.",
              });
            }

            return res.json({
              success: true,
              message: "Action submitted successfully.",
              file: filePath,
            });
          }
        );
      }
    );
  });
});

router.get("/complaints", (req, res) => {
  const allocatedTo = req.user.id;

  const complaintSql = `
    SELECT
      complaint_id,
      member_id,
      allocated_to,
      type,
      machine_id,
      status,
      complaint_description,
      time_of_complaint
    FROM equipment_complaint
    WHERE allocated_to = ?
      AND status IN (0, 1, 3)
    ORDER BY time_of_complaint DESC
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