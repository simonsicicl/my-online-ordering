#!/usr/bin/env node
import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import postgres from 'postgres';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function runMigration() {
  try {
    console.log('Getting database URL from environment...');
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Connecting to database...');
    const sql = postgres(dbUrl, { max: 1 });
    
    console.log('Reading migration file...');
    const migrationPath = join(__dirname, 'migrations', 'add_cognito_sub_id.sql');
    const migrationSql = await readFile(migrationPath, 'utf-8');
    
    console.log('Applying migration...');
    await sql.unsafe(migrationSql);
    
    console.log('✅ Migration completed successfully!');
    console.log('\nVerifying column was added...');
    
    const result = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'cognito_sub_id'
    `;
    
    if (result.length > 0) {
      console.log('✅ Column verified:', result[0]);
    } else {
      console.log('⚠️  Column not found after migration');
    }
    
    await sql.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
