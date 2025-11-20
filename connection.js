const sql = require('mssql');
const dotenv = require('dotenv')

dotenv.config()

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,  
  database: process.env.DB_NAME,    
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  }
};

async function getPool() {

  try {
    const pool = await sql.connect(config)
    return pool
  } catch (error) {
    console.log('Erro conexão DB:', error)
  }
  
}

module.exports = { getPool }
