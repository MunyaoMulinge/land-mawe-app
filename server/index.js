import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { supabase } from './supabase-client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Auth endpoints
app.post('/api/auth/register', async (req, res) => {
  const { email, password, name } = req.body;
  try {
    // Try Supabase client first, fallback to direct DB
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name }
        }
      });
      
      if (error) throw error;
      
      res.json({ 
        user: { id: data.user.id, email: data.user.email, name },
        token: 'supabase-' + data.user.id
      });
      return;
    } catch (supabaseError) {
      console.log('Supabase auth failed, trying direct DB:', supabaseError.message);
    }
    
    // Fallback to direct database
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const result = await pool.query(
      'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name, created_at',
      [email, password, name]
    );
    
    res.json({ 
      user: result.rows[0],
      token: 'demo-token-' + result.rows[0].id
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, email, name, created_at FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    res.json({ 
      user: result.rows[0],
      token: 'demo-token-' + result.rows[0].id
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Trucks endpoints
app.get('/api/trucks', async (req, res) => {
  try {
    console.log('GET /api/trucks called');
    const result = await pool.query('SELECT * FROM trucks ORDER BY id');
    console.log('Found', result.rows.length, 'trucks');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching trucks:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trucks/stats', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT status, COUNT(*) as count 
      FROM trucks GROUP BY status
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trucks', async (req, res) => {
  const { plate_number, model, capacity } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO trucks (plate_number, model, capacity) VALUES ($1, $2, $3) RETURNING *',
      [plate_number, model, capacity]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/trucks/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const result = await pool.query(
      'UPDATE trucks SET status = $1 WHERE id = $2 RETURNING *',
      [status, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// Drivers endpoints
app.get('/api/drivers', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.*, oc.license_verified, oc.medical_check, oc.safety_training,
             oc.vehicle_inspection, oc.insurance_verified, oc.contract_signed
      FROM drivers d
      LEFT JOIN onboarding_checklist oc ON d.id = oc.driver_id
      ORDER BY d.id
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drivers', async (req, res) => {
  const { name, phone, license_number } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO drivers (name, phone, license_number) VALUES ($1, $2, $3) RETURNING *',
      [name, phone, license_number]
    );
    await pool.query(
      'INSERT INTO onboarding_checklist (driver_id) VALUES ($1)',
      [result.rows[0].id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/drivers/:id/checklist', async (req, res) => {
  const { field, value } = req.body;
  const validFields = ['license_verified', 'medical_check', 'safety_training', 
                       'vehicle_inspection', 'insurance_verified', 'contract_signed'];
  if (!validFields.includes(field)) {
    return res.status(400).json({ error: 'Invalid field' });
  }
  try {
    await pool.query(
      `UPDATE onboarding_checklist SET ${field} = $1, updated_at = NOW() WHERE driver_id = $2`,
      [value, req.params.id]
    );
    // Check if all items complete
    const check = await pool.query(
      `SELECT * FROM onboarding_checklist WHERE driver_id = $1`,
      [req.params.id]
    );
    const row = check.rows[0];
    const allComplete = row.license_verified && row.medical_check && row.safety_training &&
                        row.vehicle_inspection && row.insurance_verified && row.contract_signed;
    await pool.query('UPDATE drivers SET onboarding_complete = $1 WHERE id = $2', [allComplete, req.params.id]);
    res.json({ success: true, onboarding_complete: allComplete });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Bookings endpoints
app.get('/api/bookings', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT b.*, t.plate_number, t.model, d.name as driver_name
      FROM bookings b
      LEFT JOIN trucks t ON b.truck_id = t.id
      LEFT JOIN drivers d ON b.driver_id = d.id
      ORDER BY b.start_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { truck_id, driver_id, event_name, location, start_date, end_date } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO bookings (truck_id, driver_id, event_name, location, start_date, end_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'confirmed') RETURNING *`,
      [truck_id, driver_id, event_name, location, start_date, end_date]
    );
    await pool.query('UPDATE trucks SET status = $1 WHERE id = $2', ['booked', truck_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Land Mawe server running on port ${PORT}`);
});
