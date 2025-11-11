import dotenv from 'dotenv';

dotenv.config();

const parseNumber = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  server: {
    port: parseNumber(process.env.PORT, 4000),
  },
  database: {
    url: process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.PGURL || '',
    ssl: process.env.PGSSLMODE === 'require' || process.env.DATABASE_SSL === 'true',
  },
  uploads: {
    maxSizeMb: parseNumber(process.env.UPLOAD_MAX_MB, 25),
  },
};

export default config;

