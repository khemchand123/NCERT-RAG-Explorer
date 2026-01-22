import express from 'express';
import cors from 'cors';
import ragRoutes from './routes/ragRoutes';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', ragRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'ok' });
});

export default app;
