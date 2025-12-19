import pg from 'pg';

const pool = new pg.Pool(
  process.env.DATABASE_URL 
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'land_mawe',
        user: process.env.DB_USER || 'munyao',
        password: process.env.DB_PASSWORD || 'P@ssw0rd'
      }
);

export default pool;
