-- Users table (common for all users)
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT,
  role TEXT CHECK (role IN ('doctor', 'patient')) NOT NULL
);

-- Doctor-Patient Relationship table (many-to-many)
CREATE TABLE doctor_patient (
  doctor_id INTEGER REFERENCES users(id),
  patient_id INTEGER REFERENCES users(id),
  PRIMARY KEY (doctor_id, patient_id)
);
