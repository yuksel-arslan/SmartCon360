import express from 'express';

const app = express();
const PORT = process.env.PORT || 3014;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'risk-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`risk-service running on port ${PORT}`);
});
