# MedTrack Backend

## Technologies Used
- Node.js
- Express.js
- PostgreSQL
- pg (node-postgres)
- CORS
- dotenv

---

## Getting Started

1. **Navigate to the backend directory:**
   ```sh
   cd backend
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Set up environment variables:**
   - Create a `.env` file in the `backend` directory.
   - Add your database connection details, e.g.:
     ```
     DB_USER=your_db_user
     DB_PASSWORD=your_db_password
     DB_HOST=localhost
     DB_PORT=5432
     DB_DATABASE=your_db_name
     PORT=5000
     ```
4. **Start the backend server:**
   ```sh
   npm run dev
   ```
   or
   ```sh
   npx nodemon server.js
   ```

---

## Project Structure

```
backend/
  ├── database.sql
  ├── db.js
  ├── package.json
  ├── routes/
  │   ├── appointments.js
  │   ├── auth.js
  │   └── patients.js
  └── server.js
```

---

## API Overview

- **API runs on:**  
  By default, `http://localhost:5000`
- **Base URL:**  
  All endpoints are prefixed with `/api`

---

## Auth Routes

| Method | Endpoint           | Description         |
|--------|--------------------|---------------------|
| POST   | `/api/auth/signup` | Register a new user |
| POST   | `/api/auth/login`  | Log in as a user    |

**Examples:**

- **Sign Up**
  ```http
  POST /api/auth/signup
  Content-Type: application/json

  {
    "email": "doctor@example.com",
    "password": "1234",
    "role": "doctor"
  }
  ```

- **Login**
  ```http
  POST /api/auth/login
  Content-Type: application/json

  {
    "email": "doctor@example.com",
    "password": "1234"
  }
  ```

---

## Doctor Routes

> These are handled through patient and appointment endpoints using the doctor's ID.

| Method | Endpoint                                 | Description                                 |
|--------|------------------------------------------|---------------------------------------------|
| GET    | `/api/patients/assigned/:doctorId`       | Get patients assigned to a doctor           |
| GET    | `/api/patients?doctorId=ID`              | Get all patients for a doctor               |
| POST   | `/api/patients`                          | Add a new patient and assign to doctor      |
| PUT    | `/api/patients/:id?doctorId=ID`          | Update a patient (if assigned to doctor)    |
| DELETE | `/api/patients/:id?doctorId=ID`          | Remove patient from doctor's care           |

**Examples:**

- **Get assigned patients**
  ```
  GET /api/patients/assigned/1
  ```

- **Add a new patient**
  ```http
  POST /api/patients
  Content-Type: application/json

  {
    "file_number": "12345",
    "full_name": "John Doe",
    "doctor_id": 1,
    ...
  }
  ```

- **Update a patient**
  ```
  PUT /api/patients/5?doctorId=1
  ```

- **Delete (unassign) a patient**
  ```
  DELETE /api/patients/5?doctorId=1
  ```

---

## Patient Routes

| Method | Endpoint                        | Description                        |
|--------|---------------------------------|------------------------------------|
| GET    | `/api/patients/:id?doctorId=ID` | Get a single patient (if assigned) |
| PUT    | `/api/patients/:id?doctorId=ID` | Update a patient (if assigned)     |
| DELETE | `/api/patients/:id?doctorId=ID` | Remove patient from doctor's care  |

**Examples:**

- **Get patient details**
  ```
  GET /api/patients/5?doctorId=1
  ```

- **Update patient**
  ```http
  PUT /api/patients/5?doctorId=1
  Content-Type: application/json

  {
    "full_name": "Jane Doe",
    ...
  }
  ```

---

## Appointments Routes

| Method | Endpoint                                         | Description                                      |
|--------|--------------------------------------------------|--------------------------------------------------|
| GET    | `/api/appointments/doctor-appointments/:doctorId`| Get all appointments for a doctor                |
| GET    | `/api/appointments/patient/:patientId`           | Get all appointments for a patient               |
| GET    | `/api/appointments/:patientId?doctorId=ID`       | Get all appointments for a patient (doctor view) |
| GET    | `/api/appointments?doctorId=ID`                  | Get all appointments for a doctor                |
| POST   | `/api/appointments`                              | Add a new appointment                            |
| PUT    | `/api/appointments/:id?doctorId=ID`              | Update an appointment (doctor or patient)        |
| DELETE | `/api/appointments/:id?doctorId=ID&patientId=ID` | Delete an appointment                            |

**Examples:**

- **Get all appointments for a doctor**
  ```
  GET /api/appointments/doctor-appointments/1
  ```

- **Add a new appointment**
  ```http
  POST /api/appointments
  Content-Type: application/json

  {
    "doctor_id": 1,
    "patient_id": 5,
    "appointment_date": "2024-06-01",
    "appointment_time": "10:00",
    "notes": "Follow-up"
  }
  ```

- **Update an appointment**
  ```http
  PUT /api/appointments/10?doctorId=1
  Content-Type: application/json

  {
    "appointment_date": "2024-06-02",
    "appointment_time": "11:00",
    "status": "completed",
    "notes": "Patient attended"
  }
  ```

- **Delete an appointment**
  ```
  DELETE /api/appointments/10?doctorId=1&patientId=5
  ```

---