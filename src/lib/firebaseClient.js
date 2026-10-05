import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// Public web config. NEXT_PUBLIC_* values are inlined into the browser bundle
// at build time, so each one must be referenced literally.
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function getClientAuth() {
  const app = getApps().length ? getApp() : initializeApp(config);
  return getAuth(app);
}
