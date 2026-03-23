const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
  database: "qrscanner",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const pool1 = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
  database: "Login",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const pool2 = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  port: 3306,
  database: "bulk_chemicals",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

module.exports = {pool, pool1, pool2 };