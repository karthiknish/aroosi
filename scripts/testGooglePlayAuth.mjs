import { GoogleAuth } from 'google-auth-library';

async function main() {
  try {
    const scope = 'https://www.googleapis.com/auth/androidpublisher';
    const auth = new GoogleAuth({ scopes: [scope] });
    const token = await auth.getAccessToken();
    if (!token) throw new Error('No access token returned');
    console.log(JSON.stringify({ ok: true, tokenLength: token.length }));
    process.exit(0);
  } catch (e) {
    console.error(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) })
    );
    process.exit(1);
  }
}

main();
