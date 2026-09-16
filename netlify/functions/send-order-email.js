// ============================================================
// Netlify Function : envoie un e-mail (via Gmail SMTP) à chaque
// nouvelle commande. Appelée par js/store.js après l'écriture
// de la commande dans Firestore.
//
// Variables d'environnement requises (à définir dans Netlify,
// PAS dans ce fichier) :
//   GMAIL_USER          -> l'adresse Gmail qui envoie et reçoit
//   GMAIL_APP_PASSWORD  -> le mot de passe d'application Gmail
// Voir README.md section "3) Gmail SMTP".
// ============================================================

const nodemailer = require("nodemailer");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.error("Variables GMAIL_USER / GMAIL_APP_PASSWORD manquantes.");
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: "SMTP non configuré" }) };
  }

  let order;
  try {
    order = JSON.parse(event.body || "{}");
  } catch {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: "Corps invalide" }) };
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });

    const items = Array.isArray(order.items) ? order.items : [];
    const itemsHtml = items
      .map(
        (it) =>
          `<tr><td style="padding:6px 10px;border:1px solid #e5d9c8;">${escapeHtml(it.name)}</td><td style="padding:6px 10px;border:1px solid #e5d9c8;text-align:center;">${it.qty}</td><td style="padding:6px 10px;border:1px solid #e5d9c8;text-align:right;">${it.price} DH</td><td style="padding:6px 10px;border:1px solid #e5d9c8;text-align:right;">${(it.qty * it.price).toFixed(2)} DH</td></tr>`
      )
      .join("");

    const paymentLabel =
      order.paymentMethod === "virement"
        ? `Virement bancaire${order.virementRef ? " — réf: " + escapeHtml(order.virementRef) : ""}`
        : "Cash à la livraison";

    const html = `
      <div style="font-family:Poppins,Arial,sans-serif;color:#4a342a;max-width:560px;margin:0 auto;">
        <h2 style="color:#4a342a;">🛍️ Nouvelle commande Primadija</h2>
        <p><b>Référence :</b> ${escapeHtml(order.orderId || "—")}</p>
        <p><b>Client :</b> ${escapeHtml(order.customer?.name || "")} — ${escapeHtml(order.customer?.phone || "")}</p>
        <p><b>Ville :</b> ${escapeHtml(order.customer?.city || "")}</p>
        <p><b>Adresse :</b> ${escapeHtml(order.customer?.address || "-")}</p>
        <p><b>Paiement :</b> ${paymentLabel}</p>
        ${order.customer?.notes ? `<p><b>Notes :</b> ${escapeHtml(order.customer.notes)}</p>` : ""}
        <table style="border-collapse:collapse;width:100%;margin-top:12px;">
          <thead>
            <tr style="background:#f2e8da;">
              <th style="padding:6px 10px;border:1px solid #e5d9c8;text-align:left;">Article</th>
              <th style="padding:6px 10px;border:1px solid #e5d9c8;">Qté</th>
              <th style="padding:6px 10px;border:1px solid #e5d9c8;text-align:right;">Prix</th>
              <th style="padding:6px 10px;border:1px solid #e5d9c8;text-align:right;">Sous-total</th>
            </tr>
          </thead>
          <tbody>${itemsHtml}</tbody>
        </table>
        <p style="font-size:1.1rem;margin-top:14px;"><b>Total : ${order.total} DH</b></p>
        <p style="margin-top:20px;font-size:.85rem;opacity:.7;">Connectez-vous à l'espace admin pour confirmer ou annuler cette commande.</p>
      </div>
    `;

    await transporter.sendMail({
      from: `"Primadija" <${process.env.GMAIL_USER}>`,
      to: process.env.GMAIL_USER,
      subject: `Nouvelle commande — ${order.customer?.name || "Client"} (${order.total} DH)`,
      html,
    });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: JSON.stringify({ ok: false, error: err.message }) };
  }
};

function escapeHtml(str = "") {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
