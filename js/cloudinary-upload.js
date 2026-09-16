// ============================================================
// Upload d'une image vers Cloudinary (upload "non signé", donc
// utilisable directement depuis le navigateur sans clé secrète).
// ============================================================

import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from "./cloudinary-config.js";

export async function uploadImageToCloudinary(file) {
  if (CLOUDINARY_CLOUD_NAME === "REMPLACE_MOI" || CLOUDINARY_UPLOAD_PRESET === "REMPLACE_MOI") {
    throw new Error("Configure d'abord js/cloudinary-config.js (voir README.md).");
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  fd.append("folder", "primadija-products");

  const res = await fetch(url, { method: "POST", body: fd });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error("Échec de l'envoi de l'image sur Cloudinary : " + errText);
  }
  const data = await res.json();
  return data.secure_url;
}
