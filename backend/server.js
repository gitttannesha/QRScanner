const express = require("express");
const cors = require("cors");
const os = require("os");

const authRoutes       = require("./routes/auth");
const stockRoutes      = require("./routes/stock");
const chemicalRoutes   = require("./routes/chemical");
const permissionRoutes = require("./routes/permission");
const consumableRoutes = require("./routes/consumable");
const sparePartRoutes = require("./routes/Sparepart");

const app = express();
app.use(express.json());
app.use(cors());
// Mount routes
app.use("/", authRoutes);
app.use("/api", stockRoutes);
app.use("/", chemicalRoutes);
app.use("/", permissionRoutes);
app.use("/", consumableRoutes);
app.use(sparePartRoutes);

const PORT = 5000;
const networkInterfaces = os.networkInterfaces();
const IP_ADDRESS = Object.values(networkInterfaces)
  .flat()
  .find(i => i.family === "IPv4" && !i.internal)?.address || "localhost";

app.listen(PORT, "0.0.0.0", () => {
  console.log("-----------------------------------------");
  console.log(`🚀 Server is LIVE on the network!`);
  console.log(`Target IP for your App: http://${IP_ADDRESS}:${PORT}`);
  console.log("-----------------------------------------");
});