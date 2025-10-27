const pool = require('./db.cjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists for local dev
const uploadsDir = path.join(__dirname, '..', 'uploads');
try {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
} catch (e) {
  console.warn('Could not ensure uploads directory:', e.message);
}

// Multer storage to save files locally (works in dev). For serverless
// production you should upload directly to S3 and send resumeUrl instead.
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Wrap the handler to support multipart form-data via multer
const handler = async (req, res) => {
  try {
    // multer will have populated req.body and req.file when used
    const { jobId, firstName, lastName, email, skills } = req.body;

    // Accept either uploaded file or resumeUrl in the body
    let resumePath = req.body.resumeUrl || null;
    if (req.file) {
      // store a URL that points to our uploads-serving endpoint
      resumePath = `/api/uploads?file=${encodeURIComponent(req.file.filename)}`;
    }

    if (!resumePath) {
      return res.status(400).json({ error: 'Resume file is required (either upload file or provide resumeUrl)' });
    }

    // check job
    const [jobs] = await pool.query('SELECT vacancies, filled_positions FROM jobs WHERE id = ?', [jobId]);
    if (!jobs || jobs.length === 0) return res.status(404).json({ error: 'Job not found' });

    const { vacancies, filled_positions } = jobs[0];
    if (filled_positions >= vacancies) return res.status(400).json({ error: 'No vacancies left for this job' });

    const insertQuery = `
      INSERT INTO applications (job_id, first_name, last_name, email, skills, resume)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await pool.query(insertQuery, [jobId, firstName, lastName, email, skills, resumePath]);

    const updateQuery = `
      UPDATE jobs
      SET filled_positions = filled_positions + 1,
          vacancies = GREATEST(vacancies - 1, 0)
      WHERE id = ?
    `;
    await pool.query(updateQuery, [jobId]);

    res.status(200).json({ message: '✅ Application submitted successfully & Requirement updated' });
  } catch (err) {
    console.error('api/apply error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Export a function compatible with Vercel serverless that runs multer first
module.exports = (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed');
    return;
  }

  // Use multer to handle multipart/form-data. If content-type is not multipart,
  // multer won't add req.file and we'll rely on resumeUrl in the body.
  const contentType = req.headers['content-type'] || '';
  if (contentType.startsWith('multipart/form-data')) {
    upload.single('resume')(req, res, (err) => {
      if (err) {
        console.error('multer error:', err);
        return res.status(500).json({ error: err.message });
      }
      handler(req, res);
    });
  } else {
    // parse JSON/body should already be available in serverless environment
    handler(req, res);
  }
};
