const mysql = require('mysql2');

console.log("⏳ Attempting to connect...");

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '', // ⚠️ TRY LEAVING THIS EMPTY FIRST. IF FAIL, PUT YOUR PASSWORD.
    database: 'thrift_store_db',
    port: 3306
});

connection.connect((err) => {
    if (err) {
        console.error('❌ CONNECTION FAILED!');
        console.error('Error Code:', err.code);
        console.error('Message:', err.message);
    } else {
        console.log('✅ SUCCESS! Database is working.');
    }
    connection.end();
});