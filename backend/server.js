require('dotenv').config();
const express = require("express");
const cors = require("cors");
const os = require("os");
const authRoutes        = require("./routes/auth");
const stockRoutes       = require("./routes/stock");
const chemicalRoutes    = require("./routes/chemical");
const permissionRoutes  = require("./routes/permission");
const consumableRoutes  = require("./routes/consumable");
const profileRoutes     = require("./routes/profile");
const sparePartRoutes   = require("./routes/Sparepart");
const complaintRoutes   = require("./routes/complaints");
const logger = require('./Logger');
const verifyToken = require("./middleware");  // ✅ import middleware
const app = express();



// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));


app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

//app.use("/views/uploads", express.static(path.join(__dirname, "views/uploads")));

app.post('/api/log-error', (req, res) => {
    const { message, stack, ...context } = req.body;
    logger.error(message, { stack, ...context });
    console.log("✅ Error received and logged to file");
    res.status(200).json({ status: 'Logged' });
});

// ✅ Public route (no token needed)
app.use("/api", authRoutes);

// ✅ Protected routes (token required)
app.use("/api", verifyToken, stockRoutes);
app.use("/api", verifyToken, chemicalRoutes);
app.use("/api", verifyToken, permissionRoutes);
app.use("/api", verifyToken, consumableRoutes);
app.use("/api", verifyToken, sparePartRoutes);
app.use("/api", verifyToken, profileRoutes);
app.use("/api", verifyToken, complaintRoutes);



const PORT = 5000;
const networkInterfaces = os.networkInterfaces();
const IP_ADDRESS = Object.values(networkInterfaces)
    .flat()
    .find(i => i.family === "IPv4" && !i.internal)?.address || "localhost";

app.listen(PORT, "0.0.0.0", () => {
    console.log("------------------------------------------");
    console.log(`🚀 Server is LIVE on the network!`);
    console.log(`Target IP for your App: http://${IP_ADDRESS}:${PORT}`);
    console.log("------------------------------------------");
});
      