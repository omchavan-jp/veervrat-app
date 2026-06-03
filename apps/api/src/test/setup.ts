import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment variables before anything else
config({ path: resolve(__dirname, '../../.env.test') });
