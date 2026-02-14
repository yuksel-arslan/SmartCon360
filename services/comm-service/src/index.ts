import express from 'express';

const app = express();
const PORT = process.env.PORT || 3015;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'comm-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`comm-service running on port ${PORT}`);
});
