import * as admin from 'firebase-admin';
import { getRemoteConfig, ServerTemplate } from 'firebase-admin/remote-config';

function ensureAppInitialized(): admin.app.App {
  if (admin.apps.length) return admin.apps[0]!;
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  }
  throw new Error('FIREBASE_SERVICE_ACCOUNT not configured');
}

let cachedTemplate: ServerTemplate | null = null;
let cachedAt = 0;
const TTL = 5 * 60 * 1000; // 5 minutes

export async function getTranslatorURL(
  dialectId: 'RIY' | 'BEI',
): Promise<string | null> {
  try {
    const now = Date.now();
    if (!cachedTemplate || now - cachedAt > TTL) {
      const app = ensureAppInitialized();
      const rc = getRemoteConfig(app);
      cachedTemplate = await rc.getServerTemplate();
      cachedAt = now;
    }
    const config = cachedTemplate.evaluate();
    const url = config.getString(`${dialectId}translatorURL`);
    return url || null;
  } catch (err) {
    console.error('[Remote Config] Failed to fetch translator URL:', err);
    return null;
  }
}
