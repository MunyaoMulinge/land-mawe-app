import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import bcrypt from 'bcryptjs';
import pool from './db.js';
import { supabase, supabaseAdmin } from './supabase-client.js';

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
  const { email, password, name, phone, role } = req.body;
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
    
    // Determine role: first user = admin, otherwise use provided role or default to staff
    const userRole = isFirstUser ? 'admin' : (role || 'staff');
    
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Insert new user
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password: hashedPassword, 
        name, 
        phone,
        role: userRole
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
    // Get user with password for comparison
    const { data: user, error } = await supabase
      .from('users')
      .select('id, email, name, role, phone, is_active, created_at, password')
      .eq('email', email)
      .single();
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Compare password with hash
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // Remove password from response
    delete user.password;
    
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

// Get driver by user_id (for driver portal)
app.get('/api/drivers/by-user/:userId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', req.params.userId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ error: 'Driver not found for this user' });
      }
      throw error;
    }
    
    res.json(data);
  } catch (err) {
    console.error('Error fetching driver by user:', err);
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

// Update driver (for linking to user account)
app.patch('/api/drivers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('drivers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    res.json(data);
  } catch (err) {
    console.error('Error updating driver:', err);
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
    
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const { data: newUser, error } = await supabase
      .from('users')
      .insert([{ 
        email, 
        password: hashedPassword, 
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
  const { 
    truck_id, driver_id, booking_id, 
    job_date, purpose, client_name, event_start_date, event_finish_date, branding_in_house,
    crew, team_lead, notes, merchandise,
    vehicle_reg, kilometer, fuel_gauge, current_average,
    equipment, damage_report,
    // Legacy fields for backward compatibility
    departure_date, destination
  } = req.body;
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
        // New fields
        client_name,
        event_start_date,
        event_finish_date,
        branding_in_house: branding_in_house || false,
        crew,
        team_lead,
        route: notes,
        merchandise,
        vehicle_reg,
        kilometer: kilometer ? parseInt(kilometer) : null,
        fuel_gauge,
        current_average: current_average ? parseFloat(current_average) : null,
        damage_report,
        // Legacy fields
        departure_date: departure_date || event_start_date || job_date,
        destination: destination || client_name,
        purpose,
        notes,
        status: 'draft'
      }])
      .select()
      .single();
    
    if (jobError) throw jobError;
    
    // Create equipment records
    if (equipment && equipment.length > 0) {
      const equipmentRecords = equipment.map(eq => ({
        job_card_id: jobCard.id,
        equipment_name: eq.name,
        equipment_type: eq.type || null,
        quantity: eq.quantity || 0,
        returned: eq.returned || false
      }));
      
      const { error: equipmentError } = await supabase
        .from('job_card_equipment')
        .insert(equipmentRecords);
      
      if (equipmentError) console.error('Equipment insert error:', equipmentError);
    }
    
    // Create empty checklist for backward compatibility
    const { error: checklistError } = await supabase
      .from('job_card_checklist')
      .insert([{ job_card_id: jobCard.id }]);
    
    if (checklistError) console.error('Checklist insert error:', checklistError);
    
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

// ============ CLIENT & INVOICE ENDPOINTS ============

// Get all clients
app.get('/api/clients', async (req, res) => {
  const { search, is_active } = req.query;
  
  try {
    let query = supabase
      .from('clients')
      .select('*')
      .order('name');
    
    if (is_active !== undefined) query = query.eq('is_active', is_active === 'true');
    if (search) query = query.ilike('name', `%${search}%`);
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching clients:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single client
app.get('/api/clients/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching client:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create client
app.post('/api/clients', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name, contact_person, email, phone, address, city, company_type, tax_pin, payment_terms, credit_limit, notes } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('clients')
      .insert([{
        name, 
        contact_person: contact_person || null, 
        email: email || null, 
        phone: phone || null, 
        address: address || null, 
        city: city || null,
        company_type: company_type || null, 
        tax_pin: tax_pin || null, 
        payment_terms: payment_terms || 30, 
        credit_limit: credit_limit ? parseFloat(credit_limit) : null, 
        notes: notes || null,
        created_by: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    await logActivity(userId, 'CLIENT_CREATED', 'client', data.id, { name });
    res.json(data);
  } catch (err) {
    console.error('Error creating client:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update client
app.patch('/api/clients/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const updates = req.body;
  updates.updated_at = new Date().toISOString();
  
  try {
    const { data, error } = await supabase
      .from('clients')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    await logActivity(userId, 'CLIENT_UPDATED', 'client', data.id);
    res.json(data);
  } catch (err) {
    console.error('Error updating client:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all invoices
app.get('/api/invoices', async (req, res) => {
  const { client_id, status, from_date, to_date } = req.query;
  
  try {
    let query = supabase
      .from('invoices')
      .select(`
        *,
        clients(name, email, phone),
        creator:created_by(name),
        invoice_items(*)
      `)
      .order('invoice_date', { ascending: false });
    
    if (client_id) query = query.eq('client_id', client_id);
    if (status) query = query.eq('status', status);
    if (from_date) query = query.gte('invoice_date', from_date);
    if (to_date) query = query.lte('invoice_date', to_date);
    
    const { data, error } = await query;
    if (error) throw error;
    
    const transformed = data.map(inv => ({
      ...inv,
      client_name: inv.clients?.name,
      client_email: inv.clients?.email,
      client_phone: inv.clients?.phone,
      created_by_name: inv.creator?.name,
      items_count: inv.invoice_items?.length || 0
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get invoice stats
app.get('/api/invoices/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('status, total_amount, amount_paid, balance_due');
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      draft: data.filter(i => i.status === 'draft').length,
      sent: data.filter(i => i.status === 'sent').length,
      paid: data.filter(i => i.status === 'paid').length,
      overdue: data.filter(i => i.status === 'overdue').length,
      total_invoiced: data.reduce((sum, i) => sum + parseFloat(i.total_amount || 0), 0),
      total_paid: data.reduce((sum, i) => sum + parseFloat(i.amount_paid || 0), 0),
      total_outstanding: data.reduce((sum, i) => sum + parseFloat(i.balance_due || 0), 0)
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching invoice stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get single invoice with items
app.get('/api/invoices/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select(`
        *,
        clients(*),
        invoice_items(*),
        payments(*)
      `)
      .eq('id', req.params.id)
      .single();
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create invoice
app.post('/api/invoices', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { client_id, booking_id, job_card_id, invoice_date, due_date, items, notes, terms, tax_rate } = req.body;
  
  try {
    // Generate invoice number
    const yearMonth = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    const { data: lastInvoice } = await supabase
      .from('invoices')
      .select('invoice_number')
      .ilike('invoice_number', `INV-${yearMonth}%`)
      .order('invoice_number', { ascending: false })
      .limit(1);
    
    let seqNum = 1;
    if (lastInvoice && lastInvoice.length > 0) {
      const lastNum = parseInt(lastInvoice[0].invoice_number.split('-')[2]) || 0;
      seqNum = lastNum + 1;
    }
    const invoice_number = `INV-${yearMonth}-${String(seqNum).padStart(4, '0')}`;
    
    // Calculate totals
    const subtotal = items.reduce((sum, item) => sum + (parseFloat(item.quantity) * parseFloat(item.unit_price)), 0);
    const taxRateNum = parseFloat(tax_rate) || 16;
    const tax_amount = subtotal * (taxRateNum / 100);
    const total_amount = subtotal + tax_amount;
    
    // Create invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert([{
        invoice_number,
        client_id,
        booking_id,
        job_card_id,
        invoice_date,
        due_date,
        subtotal,
        tax_rate: taxRateNum,
        tax_amount,
        total_amount,
        balance_due: total_amount,
        notes,
        terms,
        status: 'draft',
        created_by: userId
      }])
      .select()
      .single();
    
    if (invoiceError) throw invoiceError;
    
    // Create invoice items
    if (items && items.length > 0) {
      const invoiceItems = items.map(item => ({
        invoice_id: invoice.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        amount: parseFloat(item.quantity) * parseFloat(item.unit_price),
        truck_id: item.truck_id
      }));
      
      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(invoiceItems);
      
      if (itemsError) throw itemsError;
    }
    
    await logActivity(userId, 'INVOICE_CREATED', 'invoice', invoice.id, { invoice_number, total_amount });
    res.json(invoice);
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update invoice status
app.patch('/api/invoices/:id/status', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { status } = req.body;
  
  try {
    const updates = { status, updated_at: new Date().toISOString() };
    if (status === 'sent') updates.sent_at = new Date().toISOString();
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('invoices')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    await logActivity(userId, `INVOICE_${status.toUpperCase()}`, 'invoice', data.id);
    res.json(data);
  } catch (err) {
    console.error('Error updating invoice status:', err);
    res.status(500).json({ error: err.message });
  }
});

// Record payment
app.post('/api/invoices/:id/payment', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { amount, payment_date, payment_method, reference_number, notes } = req.body;
  
  try {
    // Get current invoice
    const { data: invoice, error: fetchError } = await supabase
      .from('invoices')
      .select('total_amount, amount_paid')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Create payment record
    const { error: paymentError } = await supabase
      .from('payments')
      .insert([{
        invoice_id: req.params.id,
        amount,
        payment_date,
        payment_method,
        reference_number,
        notes,
        received_by: userId
      }]);
    
    if (paymentError) throw paymentError;
    
    // Update invoice
    const newAmountPaid = parseFloat(invoice.amount_paid || 0) + parseFloat(amount);
    const newBalance = parseFloat(invoice.total_amount) - newAmountPaid;
    const newStatus = newBalance <= 0 ? 'paid' : 'partial';
    
    const { data, error: updateError } = await supabase
      .from('invoices')
      .update({
        amount_paid: newAmountPaid,
        balance_due: Math.max(0, newBalance),
        status: newStatus,
        payment_method,
        payment_reference: reference_number,
        payment_date,
        paid_at: newStatus === 'paid' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (updateError) throw updateError;
    
    await logActivity(userId, 'PAYMENT_RECEIVED', 'invoice', data.id, { amount, payment_method });
    res.json(data);
  } catch (err) {
    console.error('Error recording payment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get client invoices
app.get('/api/clients/:id/invoices', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('client_id', req.params.id)
      .order('invoice_date', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching client invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ INSURANCE & COMPLIANCE ENDPOINTS ============

// Get document types
app.get('/api/document-types', async (req, res) => {
  const { category } = req.query;
  
  try {
    let query = supabase
      .from('document_types')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('name');
    
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching document types:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all truck documents
app.get('/api/truck-documents', async (req, res) => {
  const { truck_id, status, category, expiring_soon } = req.query;
  
  try {
    let query = supabase
      .from('truck_documents')
      .select(`
        *,
        trucks(plate_number, model),
        document_types(name, category, is_mandatory),
        creator:created_by(name)
      `)
      .order('expiry_date');
    
    if (truck_id) query = query.eq('truck_id', truck_id);
    if (status) query = query.eq('status', status);
    
    const { data, error } = await query;
    if (error) throw error;
    
    let transformed = data.map(doc => ({
      ...doc,
      truck_plate: doc.trucks?.plate_number,
      truck_model: doc.trucks?.model,
      document_type_name: doc.document_types?.name,
      category: doc.document_types?.category,
      is_mandatory: doc.document_types?.is_mandatory,
      created_by_name: doc.creator?.name,
      days_until_expiry: Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
    }));
    
    // Filter by category if provided
    if (category) {
      transformed = transformed.filter(d => d.category === category);
    }
    
    // Filter expiring soon (within 30 days)
    if (expiring_soon === 'true') {
      transformed = transformed.filter(d => d.days_until_expiry <= 30 && d.days_until_expiry > 0);
    }
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching truck documents:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get compliance dashboard stats
app.get('/api/compliance/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('truck_documents')
      .select('status, expiry_date, document_types(is_mandatory)');
    
    if (error) throw error;
    
    const today = new Date();
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    
    const stats = {
      total: data.length,
      active: data.filter(d => d.status === 'active').length,
      expired: data.filter(d => d.status === 'expired' || new Date(d.expiry_date) < today).length,
      expiring_soon: data.filter(d => {
        const expiry = new Date(d.expiry_date);
        return expiry >= today && expiry <= thirtyDays;
      }).length,
      mandatory_expired: data.filter(d => 
        d.document_types?.is_mandatory && 
        (d.status === 'expired' || new Date(d.expiry_date) < today)
      ).length
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching compliance stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get expired and expiring documents
app.get('/api/compliance/alerts', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get expired
    const { data: expired, error: expiredError } = await supabase
      .from('truck_documents')
      .select(`
        *,
        trucks(plate_number, model),
        document_types(name, category, is_mandatory)
      `)
      .lt('expiry_date', today)
      .order('expiry_date');
    
    if (expiredError) throw expiredError;
    
    // Get expiring soon
    const { data: expiring, error: expiringError } = await supabase
      .from('truck_documents')
      .select(`
        *,
        trucks(plate_number, model),
        document_types(name, category, is_mandatory)
      `)
      .gte('expiry_date', today)
      .lte('expiry_date', thirtyDays)
      .order('expiry_date');
    
    if (expiringError) throw expiringError;
    
    const transform = (docs) => docs.map(doc => ({
      ...doc,
      truck_plate: doc.trucks?.plate_number,
      truck_model: doc.trucks?.model,
      document_type_name: doc.document_types?.name,
      category: doc.document_types?.category,
      is_mandatory: doc.document_types?.is_mandatory,
      days_until_expiry: Math.ceil((new Date(doc.expiry_date) - new Date()) / (1000 * 60 * 60 * 24))
    }));
    
    res.json({
      expired: transform(expired),
      expiring_soon: transform(expiring)
    });
  } catch (err) {
    console.error('Error fetching compliance alerts:', err);
    res.status(500).json({ error: err.message });
  }
});

// Upload document file to Supabase Storage
app.post('/api/upload-document', async (req, res) => {
  try {
    // Configure multer for memory storage (not disk)
    const storage = multer.memoryStorage();
    
    const upload = multer({ 
      storage,
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
      fileFilter: (req, file, cb) => {
        const allowedTypes = /pdf|jpg|jpeg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
          return cb(null, true);
        } else {
          cb(new Error('Only PDF, JPG, and PNG files are allowed'));
        }
      }
    }).single('file');
    
    upload(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      try {
        // Generate unique filename
        const fileExt = path.extname(req.file.originalname);
        const fileName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${fileExt}`;
        const filePath = `compliance-documents/${req.body.truck_id || 'general'}/${fileName}`;
        
        console.log('Uploading file to Supabase Storage:', filePath);
        
        // Upload to Supabase Storage using admin client for better permissions
        const { data, error } = await supabaseAdmin.storage
          .from('documents')
          .upload(filePath, req.file.buffer, {
            contentType: req.file.mimetype,
            upsert: false
          });
        
        if (error) {
          console.error('Supabase Storage error:', JSON.stringify(error, null, 2));
          throw new Error(`Storage upload failed: ${error.message || JSON.stringify(error)}`);
        }
        
        console.log('File uploaded successfully:', data);
        
        // Get public URL using regular client
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        console.log('Public URL generated:', urlData.publicUrl);
        
        // Return file info
        res.json({
          url: urlData.publicUrl,
          filename: req.file.originalname,
          size: req.file.size,
          path: filePath
        });
      } catch (uploadError) {
        console.error('Error uploading to Supabase Storage:', uploadError);
        res.status(500).json({ 
          error: uploadError.message,
          details: 'Make sure the "documents" storage bucket exists in Supabase and is set to public'
        });
      }
    });
  } catch (err) {
    console.error('Error uploading document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create truck document
app.post('/api/truck-documents', async (req, res) => {
  const { 
    truck_id, document_type_id, document_number, provider,
    issue_date, expiry_date, cost, coverage_amount, coverage_type, notes,
    document_url, document_filename, document_size
  } = req.body;
  const userId = req.headers['x-user-id'];
  
  try {
    const { data, error } = await supabase
      .from('truck_documents')
      .insert([{
        truck_id,
        document_type_id,
        document_number,
        provider,
        issue_date,
        expiry_date,
        cost,
        coverage_amount,
        coverage_type,
        notes,
        document_url,
        document_filename,
        document_size,
        status: 'active',
        created_by: userId
      }])
      .select()
      .single();
    
    if (error) {
      console.error('Supabase error creating document:', JSON.stringify(error, null, 2));
      throw error;
    }
    
    await logActivity(userId, 'DOCUMENT_CREATED', 'truck_document', data.id, { truck_id, document_type_id });
    
    res.json(data);
  } catch (err) {
    console.error('Error creating truck document:', err);
    console.error('Error details:', JSON.stringify(err, null, 2));
    res.status(500).json({ 
      error: err.message || 'Failed to create document',
      details: err.details || err.hint || 'Check server logs for more information'
    });
  }
});

// Update truck document
app.patch('/api/truck-documents/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const updates = req.body;
  
  try {
    updates.updated_at = new Date().toISOString();
    updates.updated_by = userId;
    
    const { data, error } = await supabase
      .from('truck_documents')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    await logActivity(userId, 'DOCUMENT_UPDATED', 'truck_document', data.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error updating truck document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Renew document (create new with reference to old)
app.post('/api/truck-documents/:id/renew', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { expiry_date, cost, document_number, notes } = req.body;
  
  try {
    // Get old document
    const { data: oldDoc, error: fetchError } = await supabase
      .from('truck_documents')
      .select('*')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Mark old as expired
    await supabase
      .from('truck_documents')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', req.params.id);
    
    // Create new document
    const { data: newDoc, error: createError } = await supabase
      .from('truck_documents')
      .insert([{
        truck_id: oldDoc.truck_id,
        document_type_id: oldDoc.document_type_id,
        document_number: document_number || oldDoc.document_number,
        provider: oldDoc.provider,
        issue_date: new Date().toISOString().split('T')[0],
        expiry_date,
        cost,
        coverage_amount: oldDoc.coverage_amount,
        coverage_type: oldDoc.coverage_type,
        notes,
        status: 'active',
        created_by: userId
      }])
      .select()
      .single();
    
    if (createError) throw createError;
    
    await logActivity(userId, 'DOCUMENT_RENEWED', 'truck_document', newDoc.id, { old_id: req.params.id });
    
    res.json(newDoc);
  } catch (err) {
    console.error('Error renewing document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete truck document
app.delete('/api/truck-documents/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  try {
    const { error } = await supabase
      .from('truck_documents')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    await logActivity(userId, 'DOCUMENT_DELETED', 'truck_document', req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting document:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get compliance status by truck
app.get('/api/trucks/:id/compliance', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('truck_documents')
      .select(`
        *,
        document_types(name, category, is_mandatory)
      `)
      .eq('truck_id', req.params.id)
      .order('expiry_date');
    
    if (error) throw error;
    
    const today = new Date();
    const transformed = data.map(doc => ({
      ...doc,
      document_type_name: doc.document_types?.name,
      category: doc.document_types?.category,
      is_mandatory: doc.document_types?.is_mandatory,
      days_until_expiry: Math.ceil((new Date(doc.expiry_date) - today) / (1000 * 60 * 60 * 24)),
      is_expired: new Date(doc.expiry_date) < today
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching truck compliance:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ MAINTENANCE ENDPOINTS ============

// Get service types
app.get('/api/service-types', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('service_types')
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching service types:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all maintenance records
app.get('/api/maintenance', async (req, res) => {
  const { truck_id, status, from_date, to_date } = req.query;
  
  try {
    let query = supabase
      .from('maintenance_records')
      .select(`
        *,
        trucks(plate_number, model),
        service_types(name),
        assignee:assigned_to(name),
        completer:completed_by(name),
        creator:created_by(name)
      `)
      .order('service_date', { ascending: false });
    
    if (truck_id) query = query.eq('truck_id', truck_id);
    if (status) query = query.eq('status', status);
    if (from_date) query = query.gte('service_date', from_date);
    if (to_date) query = query.lte('service_date', to_date);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const transformed = data.map(record => ({
      ...record,
      truck_plate: record.trucks?.plate_number,
      truck_model: record.trucks?.model,
      service_type_name: record.service_types?.name,
      assigned_to_name: record.assignee?.name,
      completed_by_name: record.completer?.name,
      created_by_name: record.creator?.name
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching maintenance records:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get maintenance stats
app.get('/api/maintenance/stats', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select('status, total_cost');
    
    if (error) throw error;
    
    const stats = {
      total: data.length,
      scheduled: data.filter(r => r.status === 'scheduled').length,
      in_progress: data.filter(r => r.status === 'in_progress').length,
      completed: data.filter(r => r.status === 'completed').length,
      total_cost: data.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0)
    };
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching maintenance stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get upcoming/overdue maintenance
app.get('/api/maintenance/upcoming', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Get trucks with their maintenance info
    const { data: trucks, error: trucksError } = await supabase
      .from('trucks')
      .select('id, plate_number, model, current_mileage, next_service_date, next_service_mileage');
    
    if (trucksError) throw trucksError;
    
    // Get scheduled maintenance
    const { data: scheduled, error: schedError } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        trucks(plate_number, model),
        service_types(name)
      `)
      .eq('status', 'scheduled')
      .lte('service_date', nextMonth)
      .order('service_date');
    
    if (schedError) throw schedError;
    
    // Categorize
    const upcoming = [];
    const overdue = [];
    
    scheduled.forEach(record => {
      const item = {
        ...record,
        truck_plate: record.trucks?.plate_number,
        truck_model: record.trucks?.model,
        service_type_name: record.service_types?.name
      };
      
      if (record.service_date < today) {
        overdue.push(item);
      } else {
        upcoming.push(item);
      }
    });
    
    res.json({ upcoming, overdue, trucks_needing_service: trucks.filter(t => t.next_service_date && t.next_service_date <= nextMonth) });
  } catch (err) {
    console.error('Error fetching upcoming maintenance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create maintenance record
app.post('/api/maintenance', async (req, res) => {
  const { 
    truck_id, service_type_id, service_date, description, mileage_at_service,
    parts_cost, labor_cost, vendor_name, vendor_contact, invoice_number,
    assigned_to, next_service_km, next_service_date, notes, status
  } = req.body;
  const userId = req.headers['x-user-id'];
  
  try {
    const total_cost = parseFloat(parts_cost || 0) + parseFloat(labor_cost || 0);
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .insert([{
        truck_id,
        service_type_id,
        service_date,
        description,
        mileage_at_service,
        parts_cost: parts_cost || 0,
        labor_cost: labor_cost || 0,
        total_cost,
        vendor_name,
        vendor_contact,
        invoice_number,
        assigned_to,
        next_service_km,
        next_service_date,
        notes,
        status: status || 'scheduled',
        created_by: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Log activity
    await logActivity(userId, 'MAINTENANCE_CREATED', 'maintenance', data.id, { truck_id, description });
    
    res.json(data);
  } catch (err) {
    console.error('Error creating maintenance record:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update maintenance record
app.patch('/api/maintenance/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const updates = req.body;
  
  try {
    // Recalculate total cost if parts or labor changed
    if (updates.parts_cost !== undefined || updates.labor_cost !== undefined) {
      const { data: current } = await supabase
        .from('maintenance_records')
        .select('parts_cost, labor_cost')
        .eq('id', req.params.id)
        .single();
      
      const parts = updates.parts_cost !== undefined ? updates.parts_cost : current.parts_cost;
      const labor = updates.labor_cost !== undefined ? updates.labor_cost : current.labor_cost;
      updates.total_cost = parseFloat(parts || 0) + parseFloat(labor || 0);
    }
    
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('maintenance_records')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    await logActivity(userId, 'MAINTENANCE_UPDATED', 'maintenance', data.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error updating maintenance record:', err);
    res.status(500).json({ error: err.message });
  }
});

// Complete maintenance
app.patch('/api/maintenance/:id/complete', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { next_service_km, next_service_date, notes } = req.body;
  
  try {
    // Get the maintenance record
    const { data: record, error: fetchError } = await supabase
      .from('maintenance_records')
      .select('truck_id, mileage_at_service, service_date')
      .eq('id', req.params.id)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Update maintenance record
    const { data, error } = await supabase
      .from('maintenance_records')
      .update({
        status: 'completed',
        completed_by: userId,
        completed_at: new Date().toISOString(),
        next_service_km,
        next_service_date,
        notes: notes || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update truck's maintenance info
    await supabase
      .from('trucks')
      .update({
        last_service_date: record.service_date,
        last_service_mileage: record.mileage_at_service,
        next_service_date,
        next_service_mileage: next_service_km
      })
      .eq('id', record.truck_id);
    
    await logActivity(userId, 'MAINTENANCE_COMPLETED', 'maintenance', data.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error completing maintenance:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get maintenance history for a truck
app.get('/api/trucks/:id/maintenance', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('maintenance_records')
      .select(`
        *,
        service_types(name)
      `)
      .eq('truck_id', req.params.id)
      .order('service_date', { ascending: false });
    
    if (error) throw error;
    
    const transformed = data.map(r => ({
      ...r,
      service_type_name: r.service_types?.name
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching truck maintenance history:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ EQUIPMENT MANAGEMENT ENDPOINTS ============

// Get all equipment
app.get('/api/equipment', async (req, res) => {
  const { category } = req.query;
  
  try {
    let query = supabase
      .from('equipment')
      .select('*')
      .order('category')
      .order('name');
    
    if (category) query = query.eq('category', category);
    
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (err) {
    console.error('Error fetching equipment:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create equipment
app.post('/api/equipment', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { name, category, model, serial_number, quantity, condition, location, notes } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('equipment')
      .insert([{
        name, category, model, serial_number, quantity,
        condition: condition || 'good',
        status: 'available',
        location, notes,
        created_by: userId
      }])
      .select()
      .single();
    
    if (error) throw error;
    await logActivity(userId, 'EQUIPMENT_CREATED', 'equipment', data.id, { name, category });
    res.json(data);
  } catch (err) {
    console.error('Error creating equipment:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ FUEL MANAGEMENT ENDPOINTS ============

// Get all fuel records
app.get('/api/fuel', async (req, res) => {
  const { truck_id, from_date, to_date, limit = 100 } = req.query;
  
  try {
    let query = supabase
      .from('fuel_records')
      .select(`
        *,
        trucks(plate_number, model),
        drivers(name),
        recorder:recorded_by(name),
        job_cards(job_number)
      `)
      .order('fuel_date', { ascending: false })
      .limit(limit);
    
    if (truck_id) query = query.eq('truck_id', truck_id);
    if (from_date) query = query.gte('fuel_date', from_date);
    if (to_date) query = query.lte('fuel_date', to_date);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const transformedData = data.map(record => ({
      ...record,
      truck_plate: record.trucks?.plate_number,
      truck_model: record.trucks?.model,
      driver_name: record.drivers?.name,
      recorded_by_name: record.recorder?.name,
      job_number: record.job_cards?.job_number
    }));
    
    res.json(transformedData);
  } catch (err) {
    console.error('Error fetching fuel records:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get fuel stats summary
app.get('/api/fuel/stats', async (req, res) => {
  const { from_date, to_date } = req.query;
  
  try {
    let query = supabase
      .from('fuel_records')
      .select('quantity_liters, total_cost, truck_id');
    
    if (from_date) query = query.gte('fuel_date', from_date);
    if (to_date) query = query.lte('fuel_date', to_date);
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    const stats = {
      total_records: data.length,
      total_liters: data.reduce((sum, r) => sum + parseFloat(r.quantity_liters || 0), 0),
      total_cost: data.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0),
      unique_trucks: new Set(data.map(r => r.truck_id)).size,
      avg_cost_per_liter: 0
    };
    
    if (stats.total_liters > 0) {
      stats.avg_cost_per_liter = stats.total_cost / stats.total_liters;
    }
    
    res.json(stats);
  } catch (err) {
    console.error('Error fetching fuel stats:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get fuel consumption by truck
app.get('/api/fuel/by-truck', async (req, res) => {
  try {
    const { data: fuelData, error: fuelError } = await supabase
      .from('fuel_records')
      .select('truck_id, quantity_liters, total_cost, fuel_date');
    
    if (fuelError) throw fuelError;
    
    const { data: trucks, error: trucksError } = await supabase
      .from('trucks')
      .select('id, plate_number, model');
    
    if (trucksError) throw trucksError;
    
    // Aggregate by truck
    const truckStats = trucks.map(truck => {
      const truckFuel = fuelData.filter(f => f.truck_id === truck.id);
      return {
        truck_id: truck.id,
        plate_number: truck.plate_number,
        model: truck.model,
        total_refills: truckFuel.length,
        total_liters: truckFuel.reduce((sum, r) => sum + parseFloat(r.quantity_liters || 0), 0),
        total_cost: truckFuel.reduce((sum, r) => sum + parseFloat(r.total_cost || 0), 0),
        last_refill: truckFuel.length > 0 ? truckFuel.sort((a, b) => new Date(b.fuel_date) - new Date(a.fuel_date))[0].fuel_date : null
      };
    });
    
    res.json(truckStats.sort((a, b) => b.total_cost - a.total_cost));
  } catch (err) {
    console.error('Error fetching fuel by truck:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create fuel record
app.post('/api/fuel', async (req, res) => {
  const { 
    truck_id, driver_id, job_card_id, fuel_date, quantity_liters, 
    cost_per_liter, fuel_station, station_location, receipt_number,
    odometer_reading, fuel_type, payment_method, notes,
    gps_coordinates, gps_accuracy, gps_timestamp
  } = req.body;
  const userId = req.headers['x-user-id'];
  
  try {
    const total_cost = parseFloat(quantity_liters) * parseFloat(cost_per_liter);
    
    const { data, error } = await supabase
      .from('fuel_records')
      .insert([{
        truck_id,
        driver_id,
        job_card_id,
        recorded_by: userId,
        fuel_date,
        quantity_liters,
        cost_per_liter,
        total_cost,
        fuel_station,
        station_location,
        receipt_number,
        odometer_reading,
        fuel_type: fuel_type || 'diesel',
        payment_method: payment_method || 'cash',
        notes,
        approval_status: 'pending',
        gps_coordinates,
        gps_accuracy,
        gps_timestamp
      }])
      .select()
      .single();
    
    if (error) throw error;
    
    // Update truck mileage if provided
    if (odometer_reading) {
      await supabase
        .from('trucks')
        .update({ current_mileage: odometer_reading })
        .eq('id', truck_id);
    }
    
    // Log activity
    await logActivity(userId, 'FUEL_RECORDED', 'fuel_record', data.id, { 
      truck_id, 
      quantity_liters, 
      total_cost 
    });
    
    res.json(data);
  } catch (err) {
    console.error('Error creating fuel record:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update fuel record
app.patch('/api/fuel/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const updates = req.body;
  
  try {
    // Recalculate total if quantity or cost changed
    if (updates.quantity_liters && updates.cost_per_liter) {
      updates.total_cost = parseFloat(updates.quantity_liters) * parseFloat(updates.cost_per_liter);
    }
    
    updates.updated_at = new Date().toISOString();
    
    const { data, error } = await supabase
      .from('fuel_records')
      .update(updates)
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    
    await logActivity(userId, 'FUEL_UPDATED', 'fuel_record', data.id);
    
    res.json(data);
  } catch (err) {
    console.error('Error updating fuel record:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete fuel record
app.delete('/api/fuel/:id', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  try {
    const { error } = await supabase
      .from('fuel_records')
      .delete()
      .eq('id', req.params.id);
    
    if (error) throw error;
    
    await logActivity(userId, 'FUEL_DELETED', 'fuel_record', req.params.id);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting fuel record:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get monthly fuel report
app.get('/api/fuel/report/monthly', async (req, res) => {
  const { year = new Date().getFullYear() } = req.query;
  
  try {
    const { data, error } = await supabase
      .from('fuel_records')
      .select('fuel_date, quantity_liters, total_cost')
      .gte('fuel_date', `${year}-01-01`)
      .lte('fuel_date', `${year}-12-31`);
    
    if (error) throw error;
    
    // Group by month
    const monthlyData = {};
    for (let i = 1; i <= 12; i++) {
      monthlyData[i] = { month: i, liters: 0, cost: 0, count: 0 };
    }
    
    data.forEach(record => {
      const month = new Date(record.fuel_date).getMonth() + 1;
      monthlyData[month].liters += parseFloat(record.quantity_liters || 0);
      monthlyData[month].cost += parseFloat(record.total_cost || 0);
      monthlyData[month].count++;
    });
    
    res.json(Object.values(monthlyData));
  } catch (err) {
    console.error('Error fetching monthly report:', err);
    res.status(500).json({ error: err.message });
  }
});

// ============ FUEL APPROVAL ENDPOINTS (Finance Role) ============

// Get pending fuel records for approval
app.get('/api/fuel/pending', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('fuel_records')
      .select(`
        *,
        trucks(plate_number, model),
        drivers(name),
        recorder:recorded_by(name)
      `)
      .eq('approval_status', 'pending')
      .order('fuel_date', { ascending: false });
    
    if (error) throw error;
    
    const transformed = data.map(record => ({
      ...record,
      truck_plate: record.trucks?.plate_number,
      driver_name: record.drivers?.name,
      recorded_by_name: record.recorder?.name
    }));
    
    res.json(transformed);
  } catch (err) {
    console.error('Error fetching pending fuel:', err);
    res.status(500).json({ error: err.message });
  }
});

// Approve fuel record
app.patch('/api/fuel/:id/approve', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  try {
    const { data, error } = await supabase
      .from('fuel_records')
      .update({
        approval_status: 'approved',
        approved_by: userId,
        approved_at: new Date().toISOString()
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    await logActivity(userId, 'FUEL_APPROVED', 'fuel_record', data.id);
    res.json(data);
  } catch (err) {
    console.error('Error approving fuel:', err);
    res.status(500).json({ error: err.message });
  }
});

// Reject fuel record
app.patch('/api/fuel/:id/reject', async (req, res) => {
  const userId = req.headers['x-user-id'];
  const { rejection_reason } = req.body;
  
  try {
    const { data, error } = await supabase
      .from('fuel_records')
      .update({
        approval_status: 'rejected',
        approved_by: userId,
        approved_at: new Date().toISOString(),
        rejection_reason
      })
      .eq('id', req.params.id)
      .select()
      .single();
    
    if (error) throw error;
    await logActivity(userId, 'FUEL_REJECTED', 'fuel_record', data.id, { rejection_reason });
    res.json(data);
  } catch (err) {
    console.error('Error rejecting fuel:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Land Mawe server running on port ${PORT}`);
});
