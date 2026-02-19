import express from 'express';

const app = express();
const PORT = process.env.PORT || 3018;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'hub-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`hub-service running on port ${PORT}`);
});
