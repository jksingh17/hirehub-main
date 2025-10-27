const pool = require('./db.cjs');

module.exports = async (req, res) => {
  try {
    if (req.method === 'GET') {
      const query = `
        SELECT id, position, vacancies, filled_positions,
               (vacancies - filled_positions) AS remaining_vacancies, requirements
        FROM jobs
      `;
      const [rows] = await pool.query(query);
      return res.status(200).json(rows);
    }

    if (req.method === 'POST') {
      const { position, vacancies, requirements } = req.body;
      const query = `INSERT INTO jobs (position, vacancies, filled_positions, requirements) VALUES (?, ?, 0, ?)`;
      await pool.query(query, [position, vacancies, requirements]);
      return res.status(201).json({ message: '✅ Job posted successfully' });
    }

    res.status(405).setHeader('Allow', 'GET, POST').end('Method Not Allowed');
  } catch (err) {
    console.error('api/jobs error:', err);
    res.status(500).json({ error: err.message });
  }
};
