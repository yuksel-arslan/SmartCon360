import express from 'express';

const app = express();
const PORT = process.env.PORT || 3017;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'sustainability-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`sustainability-service running on port ${PORT}`);
});
