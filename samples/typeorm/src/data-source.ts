import 'reflect-metadata';
import { DataSource } from 'typeorm';
import dotenv from 'dotenv';
import { User } from './entity/User';
import { Task } from './entity/Task';

dotenv.config();

const useSQLite = !process.env.DB_HOST;

export const AppDataSource = useSQLite
    ? new DataSource({
          type: 'sqlite',
          database: ':memory:',
          synchronize: true,
          logging: false,
          entities: [User, Task],
      })
    : new DataSource({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: Number(process.env.DB_PORT) || 5432,
          database: process.env.DB_NAME || 'swaggiffy_tasks',
          username: process.env.DB_USER || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          synchronize: true,
          logging: false,
          entities: [User, Task],
      });

export const dbMode = useSQLite ? 'SQLite (in-memory)' : 'PostgreSQL';
