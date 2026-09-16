// ============================================================
// Initialisation Firebase (SDK modulaire v10, via CDN)
// Ce fichier est importé par store.js et admin.js
//
// NB : les photos ne sont PAS stockées sur Firebase Storage
// (ça demande un compte payant "Blaze") mais sur Cloudinary,
// qui est gratuit sans carte bancaire. Voir js/cloudinary-config.js
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);
