require('dotenv').config();
const path = require('path');
const os = require('os');

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.APP_ENV || 'Dev',
  instanceId: process.env.POD_NAME || process.env.HOSTNAME || os.hostname(),
  
  // הגדרות חיבור ל-PostgreSQL
  db: {
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'appdb'
  },

  paths: {
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'),
    get thumbDir() {
      return path.join(this.uploadDir, 'thumbs');
    },
    publicDir: path.join(__dirname, 'public')
  }
};