// helper script to run Prisma commands with the correct environment variables
// This script is intended to be run from the package directory
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Find workspace root (where nx.json is)
let dir = process.cwd();
while (
  !fs.existsSync(path.join(dir, 'nx.json')) &&
  dir !== path.parse(dir).root
) {
  dir = path.dirname(dir);
}

const env = process.argv[2];
const command = process.argv.slice(3).join(' ');
const envPath = path.join(dir, `.env.${env}`);

try {
  execSync(`dotenv -e ${envPath} -- ${command}`, { stdio: 'inherit' });
} catch (error) {
  process.exit(error.status);
}
