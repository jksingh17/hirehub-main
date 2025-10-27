const pool = require('../db.cjs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed');
    return;
  }

  try {
    // Vercel exposes dynamic route params as req.query
    const jobId = req.query && (req.query.jobId || req.query.jobid || req.query.id) || null;
    const id = jobId || null;
    if (!id) return res.status(400).json({ error: 'jobId is required' });

    const query = `SELECT first_name, last_name, email, skills, resume FROM applications WHERE job_id = ?`;
    const [rows] = await pool.query(query, [id]);
    if (!rows.length) return res.json({ message: 'No applicants yet.' });
    res.status(200).json(rows);
  } catch (err) {
    console.error('api/applicants/[jobId] error:', err);
    res.status(500).json({ error: err.message });
  }
};
