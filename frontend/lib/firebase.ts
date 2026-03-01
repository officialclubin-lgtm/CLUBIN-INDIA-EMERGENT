import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDAttaEeoCcT2xRR1-P811AqTphpp7jgY4",
  authDomain: "clubin-india-3d02c.firebaseapp.com",
  projectId: "clubin-india-3d02c",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const auth = getAuth(app);
