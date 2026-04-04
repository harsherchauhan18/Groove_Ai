import { Sequelize } from 'sequelize';
import { ENV } from './env.js';

export const sequelize = new Sequelize(ENV.DATABASE_URL, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Required for Neon
    },
  },
  logging: ENV.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
});

export const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ PostgreSQL connected');
    await sequelize.sync({ alter: ENV.NODE_ENV === 'development' });
    console.log('✅ Models synced');
  } catch (err) {
    console.error('❌ PostgreSQL connection error:', err.message);
    process.exit(1);
  }
};
