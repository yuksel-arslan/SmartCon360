import express from 'express';

const app = express();
const PORT = process.env.PORT || 3011;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'cost-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`cost-service running on port ${PORT}`);
});
