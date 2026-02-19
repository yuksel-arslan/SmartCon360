import express from 'express';

const app = express();
const PORT = process.env.PORT || 3013;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'supply-chain-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`supply-chain-service running on port ${PORT}`);
});
