import postgres from 'postgres';

export const handler = async (event) => {
  try {
    console.log('Getting database URL from environment...');
    const dbUrl = process.env.DATABASE_URL;
    
    if (!dbUrl) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    console.log('Connecting to database...');
    const sql = postgres(dbUrl, { 
      max: 1,
      ssl: 'require'  // Enable SSL/TLS encryption for RDS
    });
    
    console.log('Adding cognitoSubId column...');
    const migrationSql = `
      -- Drop old snake_case column if it exists
      ALTER TABLE users DROP COLUMN IF EXISTS cognito_sub_id;
      
      -- Add cognitoSubId column with proper camelCase naming
      ALTER TABLE users ADD COLUMN IF NOT EXISTS "cognitoSubId" VARCHAR(255);
      
      -- Create unique index on cognitoSubId for fast lookups and ensure uniqueness
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_cognito_sub_id ON users ("cognitoSubId") WHERE "cognitoSubId" IS NOT NULL;
    `;
    
    await sql.unsafe(migrationSql);
    
    console.log('✅ Migration completed successfully!');
    console.log('Verifying column was added...');
    
    const result = await sql`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users' AND column_name = 'cognitoSubId'
    `;
    
    console.log('Column details:', result[0]);
    
    // Also check all columns in users table
    const allColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    
    console.log('All columns in users table:', allColumns);
    
    await sql.end();
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Migration completed successfully',
        cognitoSubIdColumn: result[0],
        allColumns: allColumns.map(c => c.column_name)
      }, null, 2)
    };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      }, null, 2)
    };
  }
};
