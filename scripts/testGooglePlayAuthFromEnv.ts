import 'dotenv/config';
import { getAndroidPublisherAccessToken } from '../src/lib/googlePlay';

async function main() {
  try {
    const token = await getAndroidPublisherAccessToken();
    console.log(JSON.stringify({ ok: true, tokenLength: token?.length ?? 0 }));
    process.exit(0);
  } catch (e) {
    console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  }
}

main();
