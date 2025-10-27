const pool = require('./db.cjs');

/**
 * NOTE: Serverless functions have ephemeral file systems. This endpoint expects
 * the client to upload the resume to cloud storage (S3/GCS) and provide
 * `resumeUrl` in the POST body. If you prefer server-side uploads, we'll
 * need to integrate S3 and accept multipart upload streaming.
 */
module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).setHeader('Allow', 'POST').end('Method Not Allowed');
    return;
  }

  try {
    const { jobId, firstName, lastName, email, skills, resumeUrl } = req.body;
    if (!resumeUrl) return res.status(400).json({ error: 'resumeUrl is required. Upload file to object storage and provide the URL.' });

    // check job
    const [jobs] = await pool.query('SELECT vacancies, filled_positions FROM jobs WHERE id = ?', [jobId]);
    if (!jobs || jobs.length === 0) return res.status(404).json({ error: 'Job not found' });

    const { vacancies, filled_positions } = jobs[0];
    if (filled_positions >= vacancies) return res.status(400).json({ error: 'No vacancies left for this job' });

    const insertQuery = `
      INSERT INTO applications (job_id, first_name, last_name, email, skills, resume)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    await pool.query(insertQuery, [jobId, firstName, lastName, email, skills, resumeUrl]);

    const updateQuery = `
      UPDATE jobs
      SET filled_positions = filled_positions + 1,
          vacancies = GREATEST(vacancies - 1, 0)
      WHERE id = ?
    `;
    await pool.query(updateQuery, [jobId]);

    res.status(200).json({ message: 'Application submitted successfully' });
  } catch (err) {
    console.error('api/apply error:', err);
    res.status(500).json({ error: err.message });
  }
};
