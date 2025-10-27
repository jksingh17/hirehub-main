const pool = require('./db.cjs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed');
    return;
  }

  try {
    const { jobId } = req.query || req.params || {};

    // In Vercel, dynamic route params may be in req.query if using ?jobId=; but
    // frontend calls /api/applicants/:jobId, Vercel provides that as req.url path.
    // Try to extract from URL if not present.
    let id = jobId;
    if (!id) {
      // attempt to parse from URL path
      const parts = req.url.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && !last.includes('?') && Number(last)) id = last;
    }

    if (!id) return res.status(400).json({ error: 'jobId is required' });

    const query = `SELECT first_name, last_name, email, skills, resume FROM applications WHERE job_id = ?`;
    const [rows] = await pool.query(query, [id]);
    if (!rows.length) return res.json({ message: 'No applicants yet.' });
    res.status(200).json(rows);
  } catch (err) {
    console.error('api/applicants error:', err);
    res.status(500).json({ error: err.message });
  }
};
