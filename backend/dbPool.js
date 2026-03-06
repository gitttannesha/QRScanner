const mysql = require("mysql2");
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "",
  port: 3306, 
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

const promisePool = pool.promise();
const queryDB = async (sql, params) => {
  const connection = await promisePool.getConnection();
  try {
    const [rows] = await connection.query(sql, params);
    return rows; 
    
  } catch (err) {
    console.error(`Database Error:`, err.message);
    throw err; 
  } finally {
    connection.release(); 
  }
};
module.exports = { promisePool, queryDB };




