const mysql = require("mysql2");
const pool = mysql.createPool({
  host: "127.0.0.1",
  user: "root",
  password: "MySql$12345@##",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// const promisePool = pool.promise();
// const queryDB = async (sql, params) => {
//   const connection = await promisePool.getConnection();
//   try {
//     const result = await connection.query(sql, params);
//     return result; 
    
//   } catch (err) {
//     console.error(`Database Error:`, err.message);
//     throw err; 
//   } finally {
//     connection.release(); 
//   }
// };
// module.exports = { promisePool, queryDB };
const queryDB = async (sql, params, type = "all") => {
  const connection = await promisePool.getConnection();
  try {
    const [rows] = await connection.query(sql, params);

    if (!rows || rows.length === 0) return null;

    // Handle different return styles
    switch (type) {
      case "word":
        // Returns just the first value (e.g., 'Ethanol')
        return Object.values(rows[0])[0];
      case "row":
        // Returns the first object (e.g., {id: 1, name: 'Ethanol'})
        return rows[0];
      case "values":
        // Returns an array of first-column values (e.g., [1, 2, 3])
        return rows.map(r => Object.values(r)[0]);
      case "all":
      default:
        // Returns the full array of rows (Standard)
        return rows;
    }
  } catch (err) {
    console.error(`Database Error:`, err.message);
    throw err;
  } finally {
    connection.release();
  }
};

module.exports = { promisePool, queryDB };