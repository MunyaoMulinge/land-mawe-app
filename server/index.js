import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { supabase } from './supabase-client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Test endpoint to check database connection
app.get('/api/test', async (req, res) => {
  try {
    console.log('Testing database connection...');
    console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
    console.log('SUPABASE_URL exists:', !!process.env.SUPABASE_URL);
    console.log('SUPABASE_ANON_KEY exists:', !!process.env.SUPABASE_ANON_KEY);
    
    // Test Supabase client connection - simple select
    const { data, error } = await supabase
      .from('trucks')
      .select('id')
      .limit(1);
    
    if (error) throw error;
    
    console.log('Supabase connection successful');
    res.json({ 
      success: true, 
      message: 'Supabase connected successfully',
      method: 'supabase-client',
      trucksFound: data.length,
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        SUPABASE_URL: !!process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY
      }
    });
  } catch (err) {
    console.error('Database connection failed:', err);
    res.status(500).json({ 
      success: false, 
      error: err.message,
      code: err.code 
    });
  }
});

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
    // Try Supabase client first, fallback to direct DB
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      res.json({ 
        user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata?.name },
        token: 'supabase-' + data.user.id
      });
      return;
    } catch (supabaseError) {
      console.log('Supabase auth failed, trying direct DB:', supabaseError.message);
    }
    
    // Fallback to direct database
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
    console.log('Using Supabase client');
    
    const { data, error } = await supabase
      .from('trucks')
      .select('*')
      .order('id');
    
    if (error) throw error;
    
    console.log('Found', data.length, 'trucks');
    res.json(data);
  } catch (err) {
    console.error('Error fetching trucks:', err);
    console.error('Error details:', err.message, err.code);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/trucks/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('trucks')
      .select('status');
    
    if (error) throw error;
    
    // Count by status manually since Supabase doesn't support GROUP BY in the JS client
    const stats = {};
    data.forEach(truck => {
      stats[truck.status] = (stats[truck.status] || 0) + 1;
    });
    
    // Convert to array format expected by frontend
    const result = Object.entries(stats).map(([status, count]) => ({
      status,
      count: count.toString()
    }));
    
    res.json(result);
  } catch (err) {
    console.error('Error fetching truck stats:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/trucks', async (req, res) => {
  const { plate_number, model, capacity } = req.body;
  try {
    const { data, error } = await supabase
      .from('trucks')
      .insert([{ plate_number, model, capacity }])
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error('Error creating truck:', err);
    res.status(500).json({ error: err.message });
  }
});

app.patch('/api/trucks/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    const { data, error } = await supabase
      .from('trucks')
      .update({ status })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error('Error updating truck status:', err);
    res.status(500).json({ error: err.message });
  }
});


// Drivers endpoints
app.get('/api/drivers', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select(`
        *,
        onboarding_checklist(*)
      `)
      .order('id');
    
    if (error) throw error;
    
    // Transform the data to match expected format
    const transformedData = data.map(driver => ({
      ...driver,
      license_verified: driver.onboarding_checklist?.[0]?.license_verified || false,
      medical_check: driver.onboarding_checklist?.[0]?.medical_check || false,
      safety_training: driver.onboarding_checklist?.[0]?.safety_training || false,
      vehicle_inspection: driver.onboarding_checklist?.[0]?.vehicle_inspection || false,
      insurance_verified: driver.onboarding_checklist?.[0]?.insurance_verified || false,
      contract_signed: driver.onboarding_checklist?.[0]?.contract_signed || false
    }));
    
    res.json(transformedData);
  } catch (err) {
    console.error('Error fetching drivers:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/drivers', async (req, res) => {
  const { name, phone, license_number } = req.body;
  try {
    // Insert driver
    const { data: driverData, error: driverError } = await supabase
      .from('drivers')
      .insert([{ name, phone, license_number }])
      .select()
      .single();
    
    if (driverError) throw driverError;
    
    // Insert onboarding checklist
    const { error: checklistError } = await supabase
      .from('onboarding_checklist')
      .insert([{ driver_id: driverData.id }]);
    
    if (checklistError) throw checklistError;
    
    res.json(driverData);
  } catch (err) {
    console.error('Error creating driver:', err);
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
    // Update the checklist field
    const { error: updateError } = await supabase
      .from('onboarding_checklist')
      .update({ 
        [field]: value,
        updated_at: new Date().toISOString()
      })
      .eq('driver_id', req.params.id);
    
    if (updateError) throw updateError;
    
    // Check if all items are complete
    const { data: checklistData, error: checkError } = await supabase
      .from('onboarding_checklist')
      .select('*')
      .eq('driver_id', req.params.id)
      .single();
    
    if (checkError) throw checkError;
    
    const allComplete = checklistData.license_verified && 
                       checklistData.medical_check && 
                       checklistData.safety_training &&
                       checklistData.vehicle_inspection && 
                       checklistData.insurance_verified && 
                       checklistData.contract_signed;
    
    // Update driver onboarding_complete status
    const { error: driverUpdateError } = await supabase
      .from('drivers')
      .update({ onboarding_complete: allComplete })
      .eq('id', req.params.id);
    
    if (driverUpdateError) throw driverUpdateError;
    
    res.json({ success: true, onboarding_complete: allComplete });
  } catch (err) {
    console.error('Error updating checklist:', err);
    res.status(500).json({ error: err.message });
  }
});

// Bookings endpoints
app.get('/api/bookings', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('bookings')
      .select(`
        *,
        trucks(plate_number, model),
        drivers(name)
      `)
      .order('start_date', { ascending: false });
    
    if (error) throw error;
    
    // Transform the data to match the expected format
    const transformedData = data.map(booking => ({
      ...booking,
      plate_number: booking.trucks?.plate_number,
      model: booking.trucks?.model,
      driver_name: booking.drivers?.name
    }));
    
    res.json(transformedData);
  } catch (err) {
    console.error('Error fetching bookings:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/bookings', async (req, res) => {
  const { truck_id, driver_id, event_name, location, start_date, end_date } = req.body;
  try {
    // Insert booking
    const { data: bookingData, error: bookingError } = await supabase
      .from('bookings')
      .insert([{
        truck_id,
        driver_id,
        event_name,
        location,
        start_date,
        end_date,
        status: 'confirmed'
      }])
      .select()
      .single();
    
    if (bookingError) throw bookingError;
    
    // Update truck status
    const { error: truckUpdateError } = await supabase
      .from('trucks')
      .update({ status: 'booked' })
      .eq('id', truck_id);
    
    if (truckUpdateError) throw truckUpdateError;
    
    res.json(bookingData);
  } catch (err) {
    console.error('Error creating booking:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Land Mawe server running on port ${PORT}`);
});
