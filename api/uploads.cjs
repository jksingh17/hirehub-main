const path = require('path');
const fs = require('fs');

const uploadsDir = path.join(__dirname, '..', 'uploads');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').end('Method Not Allowed');
    return;
  }

  const file = (req.query && req.query.file) || null;
  if (!file) return res.status(400).json({ error: 'file query param is required' });

  const safeName = path.basename(file);
  const filePath = path.join(uploadsDir, safeName);

  try {
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found' });

    const stream = fs.createReadStream(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const mime = {
      '.pdf': 'application/pdf',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.txt': 'text/plain',
    }[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', mime);
    stream.pipe(res);
  } catch (err) {
    console.error('api/uploads error:', err);
    res.status(500).json({ error: err.message });
  }
};
