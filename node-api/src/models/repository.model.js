import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './user.model.js';

const Repository = sequelize.define(
  'Repository',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    url: {
      type: DataTypes.STRING(1024),
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('pending', 'cloning', 'parsing', 'analyzing', 'completed', 'failed'),
      defaultValue: 'pending',
    },
    branch: {
      type: DataTypes.STRING(100),
      defaultValue: 'main',
    },
    lastAnalyzedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {},
    },
  },
  {
    tableName: 'repositories',
    timestamps: true,
  }
);

User.hasMany(Repository, { foreignKey: 'userId', as: 'repositories' });
Repository.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default Repository;
