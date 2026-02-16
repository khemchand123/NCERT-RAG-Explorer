import express from 'express';
import cors from 'cors';
import ragRoutes from './routes/ragRoutes';

const app = express();

// Capture startup timestamp in IST for health endpoint
const startedAt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    month: 'short', day: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
}).format(new Date()).replace(',', ' at') + ' IST';

app.use(cors());
app.use(express.json());

app.use('/api', ragRoutes);

// Standardized health endpoint (Lehana.in format)
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        started: startedAt,
        host: process.env.SERVER_HOST || 'unknown',
        version: '1.0.0'
    });
});

export default app;
