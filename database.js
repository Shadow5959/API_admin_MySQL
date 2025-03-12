const mysql = require('mysql2');
const dotenv = require('dotenv');
const { get } = require('http');
dotenv.config()

let db = mysql.createPool({
    host: process.env.DB_HOST,
    password: process.env.DB_PASSWORD,
    user: process.env.DB_USER,
    database: process.env.DB_DATABASE,
});

db.getConnection((err) => {
    if (err) {
        console.error(err);
        return;
    }
    console.log("db connected");
})

module.exports = db;