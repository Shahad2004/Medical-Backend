const express = require('express');
const router = express.Router();
const db = require('../db');

// Get patients assigned to doctor for appointments (simplified version)
router.get('/assigned/:doctorId', async (req, res) => {
    try {
        const doctorId = req.params.doctorId;
        console.log('Fetching assigned patients for doctor ID:', doctorId);
        
        const result = await db.query(`
            SELECT p.id, p.full_name, p.file_number, p.email, p.phone
            FROM patients p
            JOIN doctor_patient_assignments dpa ON p.id = dpa.patient_id
            WHERE dpa.doctor_id = $1 AND dpa.status = 'active'
            ORDER BY p.full_name
        `, [doctorId]);
        
        console.log('Found assigned patients:', result.rows.length);
        console.log('Patients:', result.rows);
        
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching assigned patients:', error);
        res.status(500).json({ error: 'Failed to fetch assigned patients' });
    }
});

// Get all patients for a specific doctor
router.get('/', async (req, res) => {
    try {
        const doctorId = req.query.doctorId; // This will come from the authenticated user later
        
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        const result = await db.query(`
            SELECT p.*, dpa.status as assignment_status 
            FROM patients p
            JOIN doctor_patient_assignments dpa ON p.id = dpa.patient_id
            WHERE dpa.doctor_id = $1 AND dpa.status = 'active'
            ORDER BY p.created_at DESC
        `, [doctorId]);
        
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Get a single patient with doctor assignment check
router.get('/:id', async (req, res) => {
    const client = await db.getClient();
    try {
        const doctorId = req.query.doctorId;
        
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        // First check if the patient is assigned to this doctor
        const assignmentResult = await client.query(
            `SELECT 1 FROM doctor_patient_assignments 
             WHERE doctor_id = $1 AND patient_id = $2 AND status = 'active'`,
            [doctorId, req.params.id]
        );

        if (assignmentResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found or not assigned to this doctor' });
        }

        // If assigned, get the patient details
        const patientResult = await client.query(
            `SELECT * FROM patients WHERE id = $1`,
            [req.params.id]
        );

        if (patientResult.rows.length === 0) {
            return res.status(404).json({ error: 'Patient not found' });
        }

        res.json(patientResult.rows[0]);
    } catch (error) {
        console.error('Error fetching patient:', error);
        res.status(500).json({ error: 'Error fetching patient details' });
    } finally {
        client.release();
    }
});

// Update a patient
router.put('/:id', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const patientId = req.params.id;
        const doctorId = req.query.doctorId;
        
        if (!doctorId) {
            return res.status(400).json({ error: 'Doctor ID is required' });
        }

        // Check if patient is assigned to this doctor
        const assignmentCheck = await client.query(
            'SELECT 1 FROM doctor_patient_assignments WHERE doctor_id = $1 AND patient_id = $2 AND status = $3',
            [doctorId, patientId, 'active']
        );

        if (assignmentCheck.rows.length === 0) {
            return res.status(403).json({ error: 'Not authorized to update this patient' });
        }

        const {
            file_number,
            full_name,
            date_of_birth,
            gender,
            phone,
            email,
            address,
            blood_type,
            allergies,
            blood_pressure,
            body_temperature,
            heart_rate,
            weight,
            chronic_conditions,
            current_diagnoses,
            previous_diagnoses,
            medication,
            medication_doses,
            medication_notes
        } = req.body;

        // Update patient information
        const result = await client.query(
            `UPDATE patients 
             SET file_number = $1,
                 full_name = $2,
                 date_of_birth = $3,
                 gender = $4,
                 phone = $5,
                 email = $6,
                 address = $7,
                 blood_type = $8,
                 allergies = $9,
                 blood_pressure = $10,
                 body_temperature = $11,
                 heart_rate = $12,
                 weight = $13,
                 chronic_conditions = $14,
                 current_diagnoses = $15,
                 previous_diagnoses = $16,
                 medication = $17,
                 medication_doses = $18,
                 medication_notes = $19,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $20
             RETURNING *`,
            [
                file_number,
                full_name,
                date_of_birth,
                gender,
                phone,
                email,
                address,
                blood_type,
                allergies,
                blood_pressure,
                body_temperature,
                heart_rate,
                weight,
                chronic_conditions,
                current_diagnoses,
                previous_diagnoses,
                medication,
                medication_doses,
                medication_notes,
                patientId
            ]
        );

        if (result.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ error: 'Patient not found' });
        }

        await client.query('COMMIT');
        res.json(result.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error updating patient:', err);
        res.status(500).json({ error: 'Error updating patient' });
    } finally {
        client.release();
    }
});

// Add new patient and assign to doctor
router.post('/', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const { 
            file_number,
            full_name,
            date_of_birth,
            gender,
            phone,
            email,
            address,
            blood_type,
            allergies,
            blood_pressure,
            body_temperature,
            heart_rate,
            weight,
            chronic_conditions,
            current_diagnoses,
            previous_diagnoses,
            medication,
            medication_doses,
            medication_notes,
            doctor_id
        } = req.body;

        // Insert patient
        const patientResult = await client.query(
            `INSERT INTO patients (
                file_number, full_name, date_of_birth, gender, phone, email, 
                address, blood_type, allergies, blood_pressure, body_temperature,
                heart_rate, weight, chronic_conditions, current_diagnoses,
                previous_diagnoses, medication, medication_doses, medication_notes
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
            ) RETURNING id`,
            [
                file_number, full_name, date_of_birth, gender, phone, email,
                address, blood_type, allergies, blood_pressure, body_temperature,
                heart_rate, weight, chronic_conditions, current_diagnoses,
                previous_diagnoses, medication, medication_doses, medication_notes
            ]
        );

        const patientId = patientResult.rows[0].id;

        // Create doctor-patient assignment
        await client.query(
            'INSERT INTO doctor_patient_assignments (doctor_id, patient_id) VALUES ($1, $2)',
            [doctor_id, patientId]
        );

        await client.query('COMMIT');
        res.status(201).json({ 
            id: patientId, 
            message: 'Patient added and assigned to doctor successfully' 
        });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

// Delete patient (soft delete by updating assignment status)
router.delete('/:id', async (req, res) => {
    const client = await db.getClient();
    try {
        await client.query('BEGIN');

        const doctorId = req.query.doctorId; // This will come from the authenticated user later

        // Update assignment status to inactive
        const result = await client.query(
            'UPDATE doctor_patient_assignments SET status = $1 WHERE doctor_id = $2 AND patient_id = $3 RETURNING *',
            ['inactive', doctorId, req.params.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Patient not found or not assigned to this doctor' });
        }

        await client.query('COMMIT');
        res.json({ message: 'Patient removed from doctor successfully' });
    } catch (error) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: error.message });
    } finally {
        client.release();
    }
});

module.exports = router; 