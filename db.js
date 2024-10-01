const mysql = require('mysql2/promise');
console.warn("db called");

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'core360',
});

async function checkConnection() {
    try {
        // Use await to handle the asynchronous connection process
        const connection = await pool.getConnection();
        console.warn('Successfully connected');
        connection.release(); // Release the connection back to the pool
    } catch (error) {
        console.warn('Database not connected:', error.message);
    }
}

// Call the function to check the connection
checkConnection();

module.exports = pool;
