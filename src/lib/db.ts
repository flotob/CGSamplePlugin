import { Pool, QueryResultRow } from 'pg';

// Ensure environment variables are loaded (e.g., via dotenv in scripts or next.config.js)
// Alternatively, Next.js automatically loads .env.local

const pool = new Pool({
  host: process.env.POSTGRES_HOST,
  port: process.env.POSTGRES_PORT ? parseInt(process.env.POSTGRES_PORT, 10) : 5433,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  // Recommended settings for connection pooling
  max: 20, // set pool max size
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 2000, // return an error after 2 seconds if connection could not be established
});

// Optional: Add a listener for connection errors
// eslint-disable-next-line @typescript-eslint/no-unused-vars
pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err);
  // Recommended action: terminate the process or attempt to reconnect
  // process.exit(-1); // Example: exit the process
});

console.log('Database connection pool created.');

// Export the pool for querying
export default pool;

// Optional: Function to test connection or perform a simple query
/**
 * Executes a SQL query using the connection pool.
 *
 * @template T The expected type of the rows returned, must satisfy QueryResultRow.
 * @param {string} text The SQL query text.
 * @param {any[]} [params] Optional parameters for the query.
 * @returns {Promise<import('pg').QueryResult<T>>} The query result, with rows typed as T[].
 */
export const query = async <T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<import('pg').QueryResult<T>> => {
  const start = Date.now();
  try {
    // The underlying pool.query is already generic, pass the type through.
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    console.log('executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Error executing query', { text, error });
    throw error;
  }
}; 