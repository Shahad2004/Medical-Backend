const express = require('express');
const router = express.Router();
const db = require('../db');

// Get all appointments for a specific doctor
router.get('/doctor-appointments/:doctorId', async (req, res) => {
    const client = await db.getClient();
    try {
        const doctorId = req.params.doctorId;

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        const result = await client.query(
            `SELECT a.*, p.full_name as patient_name
             FROM appointments a
             JOIN patients p ON a.patient_id = p.id
             WHERE a.doctor_id = $1
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [doctorId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching doctor\'s appointments:', error);
        res.status(500).json({ error: 'Error fetching doctor\'s appointments' });
    } finally {
        client.release();
    }
});

// Get all appointments for a specific patient (for patient dashboard)
router.get('/patient/:patientId', async (req, res) => {
    const client = await db.getClient();
    try {
        const patientId = req.params.patientId;

        if (!patientId) {
            return res.status(400).json({ error: 'Patient ID is required' });
        }

        const result = await client.query(
            `SELECT a.*, d.full_name as doctor_name
             FROM appointments a
             JOIN users d ON a.doctor_id = d.id
             WHERE a.patient_id = $1
             ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
            [patientId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching patient\'s appointments:', error);
        res.status(500).json({ error: 'Error fetching patient\'s appointments' });
    } finally {
        client.release();
    }
});

// Get all appointments for a specific patient, ensuring the patient is assigned to the doctor
router.get('/:patientId', async (req, res) => {
    const client = await db.getClient();
    try {
        const patientId = req.params.patientId;
        const doctorId = req.query.doctorId; // Doctor ID from authenticated user

        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        // Verify that the patient is assigned to this doctor
        const assignmentCheck = await client.query(
            `SELECT 1 FROM doctor_patient_assignments
             WHERE doctor_id = $1 AND patient_id = $2 AND status = 'active'`,
            [doctorId, patientId]
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to view appointments for this patient' });
        }

        const result = await client.query(
            `SELECT * FROM appointments
             WHERE patient_id = $1 AND doctor_id = $2
             ORDER BY appointment_date DESC, appointment_time DESC`,
            [patientId, doctorId]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Error fetching appointments' });
    } finally {
        client.release();
    }
});

// Get all appointments or by doctorId
router.get('/', async (req, res) => {
    const client = await db.getClient();
    try {
        const doctorId = req.query.doctorId;
        let result;
        if (doctorId) {
            result = await client.query(
                `SELECT a.*, p.full_name as patient_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 WHERE a.doctor_id = $1
                 ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
                [doctorId]
            );
        } else {
            result = await client.query(
                `SELECT a.*, p.full_name as patient_name
                 FROM appointments a
                 JOIN patients p ON a.patient_id = p.id
                 ORDER BY a.appointment_date DESC, a.appointment_time DESC`
            );
        }
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching appointments:', error);
        res.status(500).json({ error: 'Error fetching appointments' });
    } finally {
        client.release();
    }
});

// Add a new appointment
router.post('/', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const {
            doctor_id,
            patient_id,
            appointment_date,
            appointment_time,
            status = 'scheduled', // Default status
            notes
        } = req.body;

        if (!doctor_id || !patient_id || !appointment_date || !appointment_time) {
            await client.query('ROLLBACK');
            return res.status(400).json({ error: 'Missing required appointment fields' });
        }

        // Verify that the patient is assigned to this doctor
        const assignmentCheck = await client.query(
            `SELECT 1 FROM doctor_patient_assignments
             WHERE doctor_id = $1 AND patient_id = $2 AND status = 'active'`,
            [doctor_id, patient_id]
        );

        if (assignmentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Not authorized to add appointments for this patient' });
        }

        const result = await client.query(
            `INSERT INTO appointments (
                doctor_id, patient_id, appointment_date, appointment_time, status, notes
            ) VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *`,
            [doctor_id, patient_id, appointment_date, appointment_time, status, notes]
        );

        await client.query('COMMIT');
        res.status(201).json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error adding appointment:', error);
        res.status(500).json({ error: 'Error adding appointment' });
    } finally {
        client.release();
    }
});

// Update an appointment
router.put('/:id', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const appointmentId = req.params.id;
        const doctorId = req.query.doctorId; // Doctor ID from authenticated user
        const patientId = req.body.patient_id; // Patient ID from request body

        const {
            doctor_id,
            patient_id,
            appointment_date,
            appointment_time,
            status,
            notes
        } = req.body;

        // Check if this is a patient updating their own appointment status
        if (patientId && !doctorId) {
            // Patient is updating their appointment status
            const appointmentCheck = await client.query(
                `SELECT 1 FROM appointments
                 WHERE id = $1 AND patient_id = $2`,
                [appointmentId, patientId]
            );

            if (appointmentCheck.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(403).json({ error: 'Not authorized to update this appointment' });
            }

            // Only allow status updates for patients
            const result = await client.query(
                `UPDATE appointments
                 SET status = $1,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $2
                 RETURNING *`,
                [status, appointmentId]
            );

            if (result.rows.length === 0) {
                await client.query('ROLLBACK');
                return res.status(404).json({ error: 'Appointment not found' });
            }

            await client.query('COMMIT');
            res.json(result.rows[0]);
            return;
        }

        // Doctor updating appointment (existing logic)
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        // Verify that the appointment belongs to this doctor and patient
        const appointmentCheck = await client.query(
            `SELECT 1 FROM appointments
             WHERE id = $1 AND doctor_id = $2 AND patient_id = $3`,
            [appointmentId, doctorId, patient_id]
        );

        if (appointmentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Not authorized to update this appointment' });
        }

        const result = await client.query(
            `UPDATE appointments
             SET appointment_date = $1,
                 appointment_time = $2,
                 status = $3,
                 notes = $4,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5
             RETURNING *`,
            [appointment_date, appointment_time, status, notes, appointmentId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Appointment not found' });
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error updating appointment:', error);
        res.status(500).json({ error: 'Error updating appointment' });
    } finally {
        client.release();
    }
});

// Delete an appointment
router.delete('/:id', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const appointmentId = req.params.id;
        const doctorId = req.query.doctorId; // Doctor ID from authenticated user
        const patientId = req.query.patientId; // Patient ID from query parameter

        if (!doctorId || !patientId) {
            return res.status(400).json({ error: 'Doctor ID and Patient ID are required' });
        }

        // Verify that the appointment belongs to this doctor and patient
        const appointmentCheck = await client.query(
            `SELECT 1 FROM appointments
             WHERE id = $1 AND doctor_id = $2 AND patient_id = $3`,
            [appointmentId, doctorId, patientId]
        );

        if (appointmentCheck.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(403).json({ error: 'Not authorized to delete this appointment' });
        }

        const result = await client.query(
            `DELETE FROM appointments WHERE id = $1 RETURNING id`,
            [appointmentId]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Appointment not found' });
        }

        await client.query('COMMIT');
        res.status(200).json({ message: 'Appointment deleted successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error deleting appointment:', error);
        res.status(500).json({ error: 'Error deleting appointment' });
    } finally {
        client.release();
    }
});

module.exports = router;