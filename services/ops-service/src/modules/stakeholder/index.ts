import express from 'express';

const app = express();
const PORT = process.env.PORT || 3016;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'stakeholder-service', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`stakeholder-service running on port ${PORT}`);
});
