const express = require('express');
const multer = require('multer');
const { Pool } = require('pg');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const config = require('./config');

const app = express();
app.use(express.json());

// יצירת תיקיות תמונות במידה ולא קיימות
const { uploadDir, thumbDir, publicDir } = config.paths;
[uploadDir, thumbDir, publicDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// התחברות ל-PostgreSQL דרך Connection Pool
const pool = new Pool(config.db);

// איתחול טבלאות ב-PostgreSQL
async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id SERIAL PRIMARY KEY,
        content TEXT NOT NULL
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS images (
        id SERIAL PRIMARY KEY,
        filename TEXT NOT NULL,
        thumb_filename TEXT NOT NULL
      );
    `);
    console.log('PostgreSQL tables initialized successfully.');
  } catch (err) {
    console.error('Error initializing PostgreSQL tables:', err);
  } finally {
    client.release();
  }
}
initDb();

// הגדרת Multer לשמירת קבצים בדיסק המקומי (שמחובר ל-Shared Volume)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage });

app.use(express.static(publicDir));
app.use('/uploads', express.static(uploadDir));

// -------------------------------------------------------------
// API Endpoints (מבוססי PostgreSQL)
// -------------------------------------------------------------

app.get('/api/info', (req, res) => {
  res.json({
    environment: config.env,
    instanceId: config.instanceId,
    dbHost: config.db.host
  });
});

// קבלת הערות
app.get('/api/notes', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM notes ORDER BY id DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// הוספת הערה
app.post('/api/notes', async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content is required' });

  try {
    const { rows } = await pool.query(
      'INSERT INTO notes (content) VALUES ($1) RETURNING *',
      [content]
    );
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// קבלת תמונות
app.get('/api/images', async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM images ORDER BY id DESC');
    res.json(rows.map(img => ({
      id: img.id,
      filename: img.filename,
      image: `/uploads/${img.filename}`,
      thumbnail: `/uploads/thumbs/${img.thumb_filename}`
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// העלאת תמונה
app.post('/api/upload', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const thumbFilename = 'thumb-' + req.file.filename;
  const thumbPath = path.join(thumbDir, thumbFilename);

  try {
    await sharp(req.file.path)
      .resize(100, 100)
      .toFile(thumbPath);

    const { rows } = await pool.query(
      'INSERT INTO images (filename, thumb_filename) VALUES ($1, $2) RETURNING *',
      [req.file.filename, thumbFilename]
    );

    res.json({ 
      id: rows[0].id, 
      image: `/uploads/${req.file.filename}`, 
      thumbnail: `/uploads/thumbs/${thumbFilename}` 
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Image processing or DB insert failed' });
  }
});

app.listen(config.port, () => {
  console.log(`[${config.env}] Server running on port ${config.port} (Instance: ${config.instanceId})`);
});