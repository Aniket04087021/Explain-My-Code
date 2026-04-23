const fs = require('fs/promises');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, '..', 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readUsers() {
  await ensureStore();

  try {
    const raw = await fs.readFile(USERS_FILE, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }

    // If the file is corrupted or unreadable, start fresh instead of crashing auth.
    return [];
  }
}

async function writeUsers(users) {
  await ensureStore();
  await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

async function findUserByEmail(email) {
  const users = await readUsers();
  return users.find(user => user.email === email) || null;
}

async function createUser({ name, email, password }) {
  const users = await readUsers();

  const user = {
    id: uuidv4(),
    name,
    email,
    password,
    createdAt: new Date().toISOString()
  };

  users.push(user);
  await writeUsers(users);
  return user;
}

module.exports = {
  createUser,
  findUserByEmail
};
