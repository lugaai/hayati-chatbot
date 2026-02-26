import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

let configRaw = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_CONFIG || '{}';

// If the string appears to be Base64 (doesn't start with '{'), decode it
if (configRaw.trim() && !configRaw.trim().startsWith('{')) {
    try {
        configRaw = Buffer.from(configRaw, 'base64').toString();
    } catch (e) {
        console.error("Failed to decode Base64 Firebase config:", e);
    }
}

const firebaseConfig = JSON.parse(configRaw);

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getFirestore(app);
