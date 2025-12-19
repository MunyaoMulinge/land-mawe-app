import pg from 'pg';

// Replace with your actual Supabase connection string
const DATABASE_URL = 'postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres';

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function testConnection() {
  try {
    const result = await pool.query('SELECT COUNT(*) FROM trucks');
    console.log('✅ Database connected successfully!');
    console.log('Trucks count:', result.rows[0].count);
    
    const users = await pool.query('SELECT COUNT(*) FROM users');
    console.log('Users count:', users.rows[0].count);
    
    process.exit(0);
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
}

testConnection();