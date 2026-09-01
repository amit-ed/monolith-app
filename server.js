const express = require('express');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
app.use(express.json());

// יצירת תיקיות במידה ולא קיימות לפי הקונפיגורציה
const { dataDir, uploadDir, thumbDir, publicDir } = config.paths;

[uploadDir, thumbDir, dataDir, publicDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// הגדרת SQLite מקומי
const dbPath = path.join(dataDir, 'app.db');
const db = new sqlite3.Database(dbPath);
db.serialize(() => {
  db.run("CREATE TABLE IF NOT EXISTS notes (id INTEGER PRIMARY KEY AUTOINCREMENT, content TEXT)");
  db.run("CREATE TABLE IF NOT EXISTS images (id INTEGER PRIMARY KEY AUTOINCREMENT, filename TEXT, thumb_filename TEXT)");
});

// הגדרת Multer לשמירת קבצים בדיסק המקומי
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

// הגשת קבצים סטטיים: Frontend מהתיקייה public ותמונות מהתיקייה uploads
app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// API: קבלת Metadata של השרת מתוך קובץ הקונפיגורציה
app.get('/api/info', (req, res) => {
  res.json({
    environment: config.env,
    instanceId: config.instanceId,
    dataDir: config.paths.dataDir,
    uploadDir: config.paths.uploadDir
  });
});

// API: קבלת כל ההערות
app.get('/api/notes', (req, res) => {
  db.all("SELECT * FROM notes ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// API: שמירת הערה ב-DB המקומי
app.post('/api/notes', (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  db.run("INSERT INTO notes (content) VALUES (?)", [content], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ id: this.lastID, content });
  });
});

// API: קבלת כל התמונות
app.get('/api/images', (req, res) => {
  db.all("SELECT * FROM images ORDER BY id DESC", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(img => ({
      id: img.id,
      filename: img.filename,
      image: `/uploads/${img.filename}`,
      thumbnail: `/uploads/thumbs/${img.thumb_filename}`
    })));
  });
});

// API: העלאת תמונה + עיבוד Synchronous ברקע
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const thumbFilename = 'thumb-' + req.file.filename;
  const thumbPath = path.join(thumbDir, thumbFilename);

  try {
    await sharp(req.file.path)
      .resize(100, 100)
      .toFile(thumbPath);

    db.run("INSERT INTO images (filename, thumb_filename) VALUES (?, ?)", 
      [req.file.filename, thumbFilename], 
      function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ 
          id: this.lastID, 
          image: `/uploads/${req.file.filename}`, 
          thumbnail: `/uploads/thumbs/${thumbFilename}` 
        });
      }
    );
  } catch (err) {
    res.status(500).json({ error: 'Image processing failed' });
  }
});

app.listen(config.port, () => {
  console.log(`[${config.env}] Server running on port ${config.port} (Instance: ${config.instanceId})`);
});