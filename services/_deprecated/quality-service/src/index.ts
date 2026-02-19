import express from 'express';

const app = express();
const PORT = process.env.PORT || 3009;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'quality-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`quality-service running on port ${PORT}`);
});
