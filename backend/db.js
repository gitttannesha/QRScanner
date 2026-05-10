require('dotenv').config();
const mysql = require("mysql2");

const dbConfig = {
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    port:               process.env.DB_PORT,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0
};

const pool  = mysql.createPool({ ...dbConfig, database: process.env.DB1_NAME });
const pool2 = mysql.createPool({ ...dbConfig, database: process.env.DB2_NAME });
const pool3 = mysql.createPool({ ...dbConfig, database: process.env.DB3_NAME });

module.exports = { pool, pool2, pool3 };
