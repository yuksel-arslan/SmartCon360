import express from 'express';

const app = express();
const PORT = process.env.PORT || 3012;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'claims-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`claims-service running on port ${PORT}`);
});
