import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const VPS_API_BASE_URL = process.env.VPS_API_BASE_URL;
const VPS_API_KEY = process.env.VPS_API_KEY;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.resolve(__dirname, '../public')));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.post('/api/search', async (req, res) => {
  try {
    const response = await fetch(`${VPS_API_BASE_URL}/api/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': VPS_API_KEY
      },
      body: JSON.stringify(req.body || {})
    });

    const text = await response.text();
    res.status(response.status).type('application/json').send(text);
  } catch (error) {
    res.status(500).json({
      error: error.message || 'Errore proxy Hostinger.'
    });
  }
});

app.get('*', (_req, res) => {
  res.sendFile(path.resolve(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Frontend proxy avviato sulla porta ${PORT}`);
});