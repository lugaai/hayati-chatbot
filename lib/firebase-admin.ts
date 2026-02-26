import * as admin from 'firebase-admin';

function getAdminDb() {
    if (!admin.apps.length) {
        try {
            if (process.env.FIREBASE_SERVICE_ACCOUNT) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
                admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                });
            } else {
                console.warn("FIREBASE_SERVICE_ACCOUNT not found, DB storage disabled.");
                return null;
            }
        } catch (e) {
            console.error("Firebase admin init error:", e);
            return null;
        }
    }
    return admin.firestore();
}

export const adminDb = getAdminDb();
