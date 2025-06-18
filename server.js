const express = require('express');
const cors = require('cors');
const db = require('./db');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Routes
const patientsRouter = require('./routes/patients');
const appointmentsRouter = require('./routes/appointments');
const authRouter = require('./routes/auth');
app.use('/api/patients', patientsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/auth', authRouter);

// Test route
app.get('/api/test', async (req, res) => {
    try {
        const [rows] = await db.query('SELECT 1 as test');
        res.json({ message: 'Backend is working!', data: rows });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 