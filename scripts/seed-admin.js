import { Pool } from 'pg';
import { scrypt, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16);
  const passwordHash = await scryptAsync(password, salt, 64);
  return {
    salt: Buffer.from(salt).toString('hex'),
    passwordHash: Buffer.from(passwordHash).toString('hex')
  };
}

async function seedAdmin() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL não configurada. Configure no .env ou variável de ambiente.');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: databaseUrl });

  const email = 'leandro2703palmeira@gmail.com';
  const name = 'Leandro Palmeira';
  const password = '123456';

  try {
    console.log('🔄 Conectando ao banco de dados...');
    
    const credentials = await hashPassword(password);
    console.log('🔐 Senha hasheada com scrypt (salt único gerado)');

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO kdp_users (email, name, password_salt, password_hash)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO UPDATE SET
           name = EXCLUDED.name,
           password_salt = EXCLUDED.password_salt,
           password_hash = EXCLUDED.password_hash
         RETURNING id, email, name, created_at`,
        [email, name, credentials.salt, credentials.passwordHash]
      );

      const user = result.rows[0];
      await client.query('COMMIT');

      console.log('✅ Usuário admin criado/atualizado com sucesso:');
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Nome: ${user.name}`);
      console.log(`   Criado em: ${user.created_at}`);
      console.log('');
      console.log('🔑 Credenciais de acesso:');
      console.log(`   Email: ${email}`);
      console.log(`   Senha: ${password}`);
      console.log('');
      console.log('⚠️  IMPORTANTE: Altere a senha no primeiro login!');

    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Erro ao criar usuário admin:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

seedAdmin();