const mysql = require('mysql2/promise');
console.warn("db called");

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',        // Make sure to set your password correctly
    database: 'core360',
    waitForConnections: true,  // Wait for an available connection before failing
    connectionLimit: 10,       // Maximum number of connections to create at once
    queueLimit: 0             // No limit on the connection request queue (optional)
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
