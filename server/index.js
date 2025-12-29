import express from 'express';
import cors from 'cors';
import pool from './db.js';
import { supabase } from './supabase-client.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Helper function to log activity
async function logActivity(userId, action, entityType = null, entityId = null, details = null) {
  try {
    await supabase
      .from('activity_logs')
      .insert([{
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details
      }]);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
}

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();
    
    if (error || !data || data.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    req.user = { id: userId, role: data.role };
    next();
  } catch (err) {
    res.status(500).json({ error: 'Authorization check failed' });
  }
};

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
  const { email, password, name, phone } = req.body;
  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    // Check if this is the first user (make them admin)
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    const isFirstUser = !allUsers || allUsers.length === 0;
    
    // Insert new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password, 
        name, 
        phone,
        role: isFirstUser ? 'admin' : 'staff'
      }])
      .select('id, email, name, role, phone, created_at')
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(newUser.id, 'USER_REGISTERED', 'user', newUser.id, { email });
    
    res.json({ 
      user: newUser,
      token: 'token-' + newUser.id
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, is_active, created_at')
      .eq('email', email)
      .eq('password', password)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is deactivated. Contact admin.' });
    }
    
    // Log activity
    await logActivity(user.id, 'USER_LOGIN', 'user', user.id);
    
    res.json({ 
      user,
      token: 'token-' + user.id
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

// ============ USER MANAGEMENT ENDPOINTS (Admin Only) ============

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, is_active, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching users:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single user
app.get('/api/users/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, is_active, created_at, updated_at')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create new user (admin only)
app.post('/api/users', async (req, res) => {
  const { email, password, name, phone, role } = req.body;
  const adminId = req.headers['x-user-id'];
  
  try {
    // Check if email already exists
    const { data: existing } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (existing) {
      return res.status(400).json({ error: 'Email already registered' });
    }
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password, 
        name, 
        phone,
        role: role || 'staff'
      }])
      .select('id, email, name, role, phone, is_active, created_at')
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(adminId, 'USER_CREATED', 'user', newUser.id, { email, role: newUser.role });
    
    res.json(newUser);
  } catch (err) {
    console.error('Error creating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update user
app.patch('/api/users/:id', async (req, res) => {
  const { name, phone, role, is_active } = req.body;
  const adminId = req.headers['x-user-id'];
  
  try {
    const updateData = { updated_at: new Date().toISOString() };
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (role !== undefined) updateData.role = role;
    if (is_active !== undefined) updateData.is_active = is_active;
    
    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', req.params.id)
      .select('id, email, name, role, phone, is_active, created_at, updated_at')
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(adminId, 'USER_UPDATED', 'user', data.id, updateData);
    
    res.json(data);
  } catch (err) {
    console.error('Error updating user:', err);
    res.status(500).json({ error: err.message });
  }
});

// Toggle user active status
app.patch('/api/users/:id/toggle-active', async (req, res) => {
  const adminId = req.headers['x-user-id'];
  
  try {
    // Get current status
    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('is_active')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Toggle status
    const { data, error } = await supabase
      .from('users')
      .update({ 
        is_active: !currentUser.is_active,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select('id, email, name, role, phone, is_active')
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(adminId, data.is_active ? 'USER_ACTIVATED' : 'USER_DEACTIVATED', 'user', data.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error toggling user status:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ ACTIVITY LOGS ENDPOINTS ============

// Get activity logs (admin only)
app.get('/api/activity-logs', async (req, res) => {
  const { limit = 50, offset = 0, user_id, action } = req.query;
  
  try {
    let query = supabase
      .from('activity_logs')
      .select(`
        *,
        users(name, email)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (user_id) query = query.eq('user_id', user_id);
    if (action) query = query.eq('action', action);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching activity logs:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get activity log stats
app.get('/api/activity-logs/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('action');
    
    if (error) throw error;
    
    // Count by action
    const stats = {};
    data.forEach(log => {
      stats[log.action] = (stats[log.action] || 0) + 1;
    });
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching activity stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ JOB CARDS ENDPOINTS ============

// Get all job cards
app.get('/api/job-cards', async (req, res) => {
  const { status, truck_id, driver_id, from_date, to_date } = req.query;
  
  try {
    let query = supabase
      .from('job_cards')
      .select(`
        *,
        trucks(plate_number, model),
        drivers(name, phone),
        creator:created_by(name),
        approver:approved_by(name),
        job_card_checklist(*)
      `)
      .order('created_at', { ascending: false });
    
    if (status) query = query.eq('status', status);
    if (truck_id) query = query.eq('truck_id', truck_id);
    if (driver_id) query = query.eq('driver_id', driver_id);
    if (from_date) query = query.gte('departure_date', from_date);
    if (to_date) query = query.lte('departure_date', to_date);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Transform data
    const transformedData = data.map(jc => ({
      ...jc,
      truck_plate: jc.trucks?.plate_number,
      truck_model: jc.trucks?.model,
      driver_name: jc.drivers?.name,
      driver_phone: jc.drivers?.phone,
      created_by_name: jc.creator?.name,
      approved_by_name: jc.approver?.name,
      checklist: jc.job_card_checklist?.[0] || null
    }));
    
    res.json(transformedData);
  } catch (err) {
    console.error('Error fetching job cards:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single job card
app.get('/api/job-cards/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('job_cards')
      .select(`
        *,
        trucks(plate_number, model),
        drivers(name, phone),
        creator:created_by(name),
        approver:approved_by(name),
        job_card_checklist(*)
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    
    const transformed = {
      ...data,
      truck_plate: data.trucks?.plate_number,
      truck_model: data.trucks?.model,
      driver_name: data.drivers?.name,
      driver_phone: data.drivers?.phone,
      created_by_name: data.creator?.name,
      approved_by_name: data.approver?.name,
      checklist: data.job_card_checklist?.[0] || null
    };
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching job card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create job card
app.post('/api/job-cards', async (req, res) => {
  const { truck_id, driver_id, booking_id, departure_date, destination, purpose, notes } = req.body;
  const userId = req.headers['x-user-id'];
  
  try {
    // Generate job number
    const jobNumber = 'JC-' + new Date().toISOString().slice(0,10).replace(/-/g,'') + '-' + Date.now().toString().slice(-4);
    
    // Create job card
    const { data: jobCard, error: jobError } = await supabase
      .from('job_cards')
      .insert([{
        truck_id,
        driver_id,
        booking_id,
        created_by: userId,
        job_number: jobNumber,
        departure_date,
        destination,
        purpose,
        notes,
        status: 'draft'
      }])
      .select()
      .single();
    
    if (jobError) throw jobError;
    
    // Create empty checklist
    const { error: checklistError } = await supabase
      .from('job_card_checklist')
      .insert([{ job_card_id: jobCard.id }]);
    
    if (checklistError) throw checklistError;
    
    // Log activity
    await logActivity(userId, 'JOB_CARD_CREATED', 'job_card', jobCard.id, { job_number: jobNumber });
    
    res.json(jobCard);
  } catch (err) {
    console.error('Error creating job card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update job card checklist
app.patch('/api/job-cards/:id/checklist', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const checklistData = req.body;
  
  try {
    // Update checklist
    const { data, error } = await supabase
      .from('job_card_checklist')
      .update({
        ...checklistData,
        inspected_by: userId,
        inspected_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('job_card_id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(userId, 'CHECKLIST_UPDATED', 'job_card', req.params.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error updating checklist:', err);
    res.status(500).json({ error: err.message });
  }
});

// Submit job card for approval
app.patch('/api/job-cards/:id/submit', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  try {
    // Check if checklist is complete
    const { data: checklist, error: checkError } = await supabase
      .from('job_card_checklist')
      .select('*')
      .eq('job_card_id', req.params.id)
      .single();
    
    if (checkError) throw checkError;
    
    // Validate required fields
    const requiredChecks = [
      checklist.fire_extinguisher,
      checklist.first_aid_kit,
      checklist.warning_triangles,
      checklist.lights_working,
      checklist.tires_condition !== 'not_checked',
      checklist.brakes_condition !== 'not_checked',
      checklist.fuel_level !== 'not_checked'
    ];
    
    if (!requiredChecks.every(Boolean)) {
      return res.status(400).json({ 
        error: 'Please complete all required safety checks before submitting' 
      });
    }
    
    // Update status
    const { data, error } = await supabase
      .from('job_cards')
      .update({ status: 'pending_approval' })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(userId, 'JOB_CARD_SUBMITTED', 'job_card', req.params.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error submitting job card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Approve job card (admin only)
app.patch('/api/job-cards/:id/approve', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  try {
    const { data, error } = await supabase
      .from('job_cards')
      .update({ 
        status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(userId, 'JOB_CARD_APPROVED', 'job_card', req.params.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error approving job card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Mark as departed
app.patch('/api/job-cards/:id/depart', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { departure_mileage } = req.body;
  
  try {
    // Check if approved
    const { data: jobCard, error: checkError } = await supabase
      .from('job_cards')
      .select('status, truck_id')
      .eq('id', req.params.id)
      .single();
    
    if (checkError) throw checkError;
    
    if (jobCard.status !== 'approved') {
      return res.status(400).json({ error: 'Job card must be approved before departure' });
    }
    
    // Update job card
    const { data, error } = await supabase
      .from('job_cards')
      .update({ 
        status: 'departed',
        departed_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update checklist with departure mileage
    if (departure_mileage) {
      await supabase
        .from('job_card_checklist')
        .update({ departure_mileage })
        .eq('job_card_id', req.params.id);
    }
    
    // Update truck status
    await supabase
      .from('trucks')
      .update({ status: 'booked' })
      .eq('id', jobCard.truck_id);
    
    // Log activity
    await logActivity(userId, 'TRUCK_DEPARTED', 'job_card', req.params.id, { departure_mileage });
    
    res.json(data);
  } catch (err) {
    console.error('Error marking departure:', err);
    res.status(500).json({ error: err.message });
  }
});

// Complete job card (return)
app.patch('/api/job-cards/:id/complete', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { return_mileage, return_notes } = req.body;
  
  try {
    // Get job card
    const { data: jobCard, error: checkError } = await supabase
      .from('job_cards')
      .select('truck_id')
      .eq('id', req.params.id)
      .single();
    
    if (checkError) throw checkError;
    
    // Update job card
    const { data, error } = await supabase
      .from('job_cards')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        return_notes
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update checklist with return info
    await supabase
      .from('job_card_checklist')
      .update({ 
        return_mileage,
        return_notes,
        return_inspected_by: userId,
        return_inspected_at: new Date().toISOString()
      })
      .eq('job_card_id', req.params.id);
    
    // Update truck status back to available
    await supabase
      .from('trucks')
      .update({ status: 'available' })
      .eq('id', jobCard.truck_id);
    
    // Log activity
    await logActivity(userId, 'JOB_CARD_COMPLETED', 'job_card', req.params.id, { return_mileage });
    
    res.json(data);
  } catch (err) {
    console.error('Error completing job card:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get job card stats
app.get('/api/job-cards/stats/summary', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('job_cards')
      .select('status');
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      draft: 0,
      pending_approval: 0,
      approved: 0,
      departed: 0,
      completed: 0,
      cancelled: 0
    };
    
    data.forEach(jc => {
      if (stats[jc.status] !== undefined) {
        stats[jc.status]++;
      }
    });
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching job card stats:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Land Mawe server running on port ${PORT}`);
});
