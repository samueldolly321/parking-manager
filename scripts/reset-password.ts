/**
 * Sets a new password for an account (forgotten password).
 * Usage : npm run reset-password -- email@exemple.mg NouveauMotDePasse2026
 */
import 'dotenv/config';
import { findUserByEmail, passwordProblem, setUserPassword } from '../src/db/auth.ts';
import { getPool } from '../src/db/index.ts';

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage : npm run reset-password -- email@exemple.mg NouveauMotDePasse2026');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL est vide : ce script agit sur la base PostgreSQL définie dans .env.');
    process.exit(1);
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  const found = await findUserByEmail(email);
  if (!found) {
    console.error(`Aucun compte avec l'email ${email}.`);
    process.exit(1);
  }
  await setUserPassword(found.user.id, password);
  console.log(`Mot de passe changé pour ${found.user.fullName} (${found.user.email}).`);
  await getPool()?.end();
}

main().catch((err) => {
  console.error('Erreur :', err instanceof Error ? err.message : err);
  process.exit(1);
});
