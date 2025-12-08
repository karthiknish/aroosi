// CommonJS bridge for firebaseAdminInit to work around ts-node ESM resolution issues.
// Usage: const { adminDb, adminStorage } = await import('./firebaseAdminBridge.cjs');
module.exports = require('../src/lib/firebaseAdminInit');
