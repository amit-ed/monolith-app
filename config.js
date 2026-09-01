const path = require('path');
const os = require('os');

module.exports = {
  port: process.env.PORT || 3000,
  env: process.env.APP_ENV || 'Development',
  instanceId: process.env.POD_NAME || process.env.HOSTNAME || os.hostname(),
  
  // נתיבי אחסון (קריטי עבור Persistent Volumes ב-K8s)
  paths: {
    dataDir: process.env.DATA_DIR || path.join(__dirname, 'data'),
    uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, 'uploads'),
    get thumbDir() {
      return path.join(this.uploadDir, 'thumbs');
    },
    publicDir: path.join(__dirname, 'public')
  }
};