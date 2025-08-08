// This file already exists, let's modify it to hash a password
const { Scrypt } = require("lucia");

async function hashPassword() {
  const password = "password123";
  const scrypt = new Scrypt();
  const hashed = await scrypt.hash(password);
  console.log("Hashed password:", hashed);
  
  // Test verification
  const isValid = await scrypt.verify(hashed, password);
  console.log("Password verification:", isValid);
}

hashPassword().catch(console.error);