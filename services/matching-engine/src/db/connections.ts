import { Pool } from 'pg';
import neo4j, { Driver } from 'neo4j-driver';
import Redis from 'ioredis';
import { logger } from '../index';

// PostgreSQL
export const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'hirewire_dev',
  user: process.env.POSTGRES_USER || 'hirewire',
  password: process.env.POSTGRES_PASSWORD || 'hirewire_dev_password',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Neo4j
export let neo4jDriver: Driver;

// Redis
export const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || 'hirewire_redis_password',
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

export async function connectDatabases() {
  // Test PostgreSQL
  try {
    await pool.query('SELECT NOW()');
    logger.info('PostgreSQL connected');
  } catch (error) {
    logger.error('PostgreSQL connection failed:', error);
    throw error;
  }

  // Connect Neo4j
  try {
    neo4jDriver = neo4j.driver(
      process.env.NEO4J_URI || 'bolt://localhost:7687',
      neo4j.auth.basic(
        process.env.NEO4J_USER || 'neo4j',
        process.env.NEO4J_PASSWORD || 'hirewire_neo4j_password'
      )
    );
    
    const session = neo4jDriver.session();
    await session.run('RETURN 1');
    await session.close();
    logger.info('Neo4j connected');
  } catch (error) {
    logger.error('Neo4j connection failed:', error);
    throw error;
  }

  // Test Redis
  try {
    await redis.ping();
    logger.info('Redis connected');
  } catch (error) {
    logger.error('Redis connection failed:', error);
    throw error;
  }
}

export async function closeDatabases() {
  await pool.end();
  await neo4jDriver.close();
  redis.disconnect();
  logger.info('All database connections closed');
}
