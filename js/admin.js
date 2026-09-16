// ============================================================
// PRIMADIJA — logique de l'espace admin (admin.html)
// ============================================================

import { db, auth } from "./firebase-init.js";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { uploadImageToCloudinary } from "./cloudinary-upload.js";

let orders = [];
let products = [];
let currentStatusFilter = "all";
let editingProductId = null;

// ============ AUTH ============
onAuthStateChanged(auth, (user) => {
  if (user) {
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("dashboard").style.display = "block";
    startListeners();
  } else {
    document.getElementById("loginBox").style.display = "block";
    document.getElementById("dashboard").style.display = "none";
  }
});

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const msg = document.getElementById("loginMsg");
  msg.textContent = "";
  msg.className = "form-msg";
  try {
    await signInWithEmailAndPassword(auth, fd.get("email"), fd.get("password"));
  } catch (err) {
    msg.className = "form-msg error";
    msg.textContent = "E-mail ou mot de passe incorrect.";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => signOut(auth));

// ============ TABS ============
document.getElementById("tabOrdersBtn").addEventListener("click", () => switchTab("orders"));
document.getElementById("tabProductsBtn").addEventListener("click", () => switchTab("products"));

function switchTab(tab) {
  document.getElementById("ordersSection").style.display = tab === "orders" ? "block" : "none";
  document.getElementById("productsSection").style.display = tab === "products" ? "block" : "none";
  document.getElementById("tabOrdersBtn").classList.toggle("active", tab === "orders");
  document.getElementById("tabProductsBtn").classList.toggle("active", tab === "products");
}

// ============ LISTENERS (temps réel) ============
let listenersStarted = false;
function startListeners() {
  if (listenersStarted) return;
  listenersStarted = true;

  const ordersQ = query(collection(db, "orders"), orderBy("createdAt", "desc"));
  onSnapshot(ordersQ, (snap) => {
    orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderOrders();
  });

  onSnapshot(collection(db, "products"), (snap) => {
    products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderProductsGrid();
  });
}

// ============ ORDERS ============
document.querySelectorAll("#statusChips .chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    currentStatusFilter = chip.dataset.status;
    document.querySelectorAll("#statusChips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    renderOrders();
  });
});

const STATUS_LABEL = { pending: "En attente", confirmed: "Confirmée", cancelled: "Annulée" };
const STATUS_CLASS = { pending: "status-pending", confirmed: "status-confirmed", cancelled: "status-cancelled" };

function renderOrders() {
  renderStats();
  const body = document.getElementById("ordersBody");
  const list = currentStatusFilter === "all" ? orders : orders.filter((o) => o.status === currentStatusFilter);

  if (list.length === 0) {
    body.innerHTML = `<tr><td colspan="7"><div class="empty-state">Aucune commande.</div></td></tr>`;
    return;
  }

  body.innerHTML = "";
  list.forEach((o) => {
    const tr = document.createElement("tr");
    const date = o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString("fr-FR") : "—";
    const itemsStr = (o.items || []).map((it) => `${it.qty}× ${it.name}`).join(", ");
    const payLabel = o.paymentMethod === "virement" ? `Virement${o.virementRef ? " (" + escapeHtml(o.virementRef) + ")" : ""}` : "Cash à la livraison";

    tr.innerHTML = `
      <td data-label="Date">${date}</td>
      <td data-label="Client">
        <strong>${escapeHtml(o.customer?.name || "")}</strong><br/>
        ${escapeHtml(o.customer?.phone || "")}<br/>
        <span style="opacity:.75">${escapeHtml(o.customer?.city || "")} — ${escapeHtml(o.customer?.address || "")}</span>
        ${o.customer?.notes ? `<br/><em style="opacity:.7">${escapeHtml(o.customer.notes)}</em>` : ""}
      </td>
      <td class="order-items-mini" data-label="Articles">${escapeHtml(itemsStr)}</td>
      <td data-label="Total"><strong>${o.total} DH</strong></td>
      <td data-label="Paiement">${payLabel}</td>
      <td data-label="Statut"><span class="status-pill ${STATUS_CLASS[o.status] || ""}">${STATUS_LABEL[o.status] || o.status}</span></td>
      <td data-label="Actions">
        <div class="row-actions">
          ${o.status !== "confirmed" ? `<button class="mini-btn confirm" data-act="confirmed">Confirmer</button>` : ""}
          ${o.status !== "pending" ? `<button class="mini-btn pending" data-act="pending">En attente</button>` : ""}
          ${o.status !== "cancelled" ? `<button class="mini-btn cancel" data-act="cancelled">Annuler</button>` : ""}
        </div>
      </td>
    `;
    tr.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => updateOrderStatus(o.id, btn.dataset.act));
    });
    body.appendChild(tr);
  });
}

function renderStats() {
  const total = orders.length;
  const pending = orders.filter((o) => o.status === "pending").length;
  const confirmed = orders.filter((o) => o.status === "confirmed").length;
  const revenue = orders
    .filter((o) => o.status === "confirmed")
    .reduce((sum, o) => sum + (o.total || 0), 0);

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPending").textContent = pending;
  document.getElementById("statConfirmed").textContent = confirmed;
  document.getElementById("statRevenue").textContent = `${revenue} DH`;
}

async function updateOrderStatus(orderId, status) {
  try {
    await updateDoc(doc(db, "orders", orderId), { status });
  } catch (err) {
    alert("Erreur lors de la mise à jour : " + err.message);
  }
}

// ============ PRODUCTS ============
function renderProductsGrid() {
  const grid = document.getElementById("productsGrid");
  if (products.length === 0) {
    grid.innerHTML = `<div class="empty-state">Aucun article. Cliquez sur "+ Ajouter un article".</div>`;
    return;
  }
  grid.innerHTML = "";
  products.forEach((p) => {
    const card = document.createElement("div");
    card.className = "product-admin-card";
    card.innerHTML = `
      <img src="${p.image || ""}" alt="${escapeHtml(p.name)}" />
      <div class="pbody">
        <div class="pname">${escapeHtml(p.name)}</div>
        <div class="pprice">${p.price} DH</div>
        ${p.category ? `<div style="font-size:.8rem;opacity:.7">${escapeHtml(p.category)}</div>` : ""}
        ${p.inStock === false ? `<div class="stock-off">Rupture de stock</div>` : ""}
        <div class="pactions">
          <button class="mini-btn edit" data-act="edit">Modifier</button>
          <button class="mini-btn delete" data-act="delete">Supprimer</button>
        </div>
      </div>
    `;
    card.querySelector('[data-act="edit"]').addEventListener("click", () => openProductModal(p));
    card.querySelector('[data-act="delete"]').addEventListener("click", () => deleteProduct(p));
    grid.appendChild(card);
  });
}

function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

document.getElementById("addProductBtn").addEventListener("click", () => openProductModal(null));
document.getElementById("cancelProductBtn").addEventListener("click", closeProductModal);
document.getElementById("productModalOverlay").addEventListener("click", (e) => {
  if (e.target.id === "productModalOverlay") closeProductModal();
});

function openProductModal(product) {
  editingProductId = product?.id || null;
  const form = document.getElementById("productForm");
  form.reset();
  document.getElementById("productFormMsg").textContent = "";
  document.getElementById("productModalTitle").textContent = product ? "Modifier l'article" : "Ajouter un article";
  const preview = document.getElementById("productPreview");

  if (product) {
    form.name.value = product.name || "";
    form.price.value = product.price ?? "";
    form.category.value = product.category || "";
    form.description.value = product.description || "";
    form.inStock.checked = product.inStock !== false;
    if (product.image) {
      preview.src = product.image;
      preview.style.display = "block";
    } else {
      preview.style.display = "none";
    }
  } else {
    form.inStock.checked = true;
    preview.style.display = "none";
  }

  document.getElementById("productModalOverlay").classList.add("open");
}

function closeProductModal() {
  document.getElementById("productModalOverlay").classList.remove("open");
  editingProductId = null;
}

document.getElementById("productForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = e.target;
  const fd = new FormData(form);
  const msg = document.getElementById("productFormMsg");
  const saveBtn = document.getElementById("saveProductBtn");
  msg.textContent = "";
  msg.className = "form-msg";
  saveBtn.disabled = true;
  saveBtn.textContent = "Enregistrement…";

  try {
    const data = {
      name: fd.get("name").trim(),
      price: parseFloat(fd.get("price")),
      category: fd.get("category").trim(),
      description: fd.get("description").trim(),
      inStock: fd.get("inStock") === "on",
    };

    const file = fd.get("image");
    if (file && file.size > 0) {
      data.image = await uploadImageToCloudinary(file);
    }

    if (editingProductId) {
      await updateDoc(doc(db, "products", editingProductId), data);
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "products"), data);
    }

    closeProductModal();
  } catch (err) {
    msg.className = "form-msg error";
    msg.textContent = "Erreur : " + err.message;
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Enregistrer";
  }
});

document.querySelector('input[name="image"]').addEventListener("change", (e) => {
  const file = e.target.files[0];
  const preview = document.getElementById("productPreview");
  if (file) {
    preview.src = URL.createObjectURL(file);
    preview.style.display = "block";
  }
});

async function deleteProduct(product) {
  if (!confirm(`Supprimer "${product.name}" ? Cette action est irréversible.`)) return;
  try {
    await deleteDoc(doc(db, "products", product.id));
    // Note : la photo reste sur Cloudinary (un upload "non signé" ne permet
    // pas de la supprimer depuis le navigateur). Sans conséquence vu le
    // quota gratuit généreux ; supprimable manuellement depuis le tableau
    // de bord Cloudinary si besoin.
  } catch (err) {
    alert("Erreur lors de la suppression : " + err.message);
  }
}
