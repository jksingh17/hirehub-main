const pool = require('./db.cjs');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed');
    return;
  }

  try {
    const query = `
      SELECT id, position, vacancies, filled_positions,
             (vacancies - filled_positions) AS remaining_vacancies, requirements
      FROM jobs
    `;
    const [rows] = await pool.query(query);
    res.status(200).json(rows);
  } catch (err) {
    console.error('api/jobs error:', err);
    res.status(500).json({ error: err.message });
  }
};
