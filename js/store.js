// ============================================================
// PRIMADIJA — logique de la boutique (page client index.html)
// ============================================================

import { db } from "./firebase-init.js";
import {
  collection,
  getDocs,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { WHATSAPP_NUMBER } from "./site-config.js";

const CART_KEY = "primadija_cart";

let products = [];
let currentFilter = "Tous";

// ---------- Panier (localStorage) ----------
function getCart() {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY)) || [];
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  renderCart();
}

function addToCart(product) {
  const cart = getCart();
  const line = cart.find((l) => l.id === product.id);
  if (line) {
    line.qty += 1;
  } else {
    cart.push({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      qty: 1,
    });
  }
  saveCart(cart);
  openCart();
}

function updateQty(id, delta) {
  let cart = getCart();
  cart = cart
    .map((l) => (l.id === id ? { ...l, qty: l.qty + delta } : l))
    .filter((l) => l.qty > 0);
  saveCart(cart);
}

function removeLine(id) {
  const cart = getCart().filter((l) => l.id !== id);
  saveCart(cart);
}

function cartTotal(cart) {
  return cart.reduce((sum, l) => sum + l.price * l.qty, 0);
}

// ---------- Rendu produits ----------
function renderFilters() {
  const cats = ["Tous", ...new Set(products.map((p) => p.category).filter(Boolean))];
  const el = document.getElementById("filters");
  el.innerHTML = "";
  if (cats.length <= 1) return; // pas de catégories -> pas de filtres
  cats.forEach((cat) => {
    const chip = document.createElement("button");
    chip.className = "chip" + (cat === currentFilter ? " active" : "");
    chip.textContent = cat;
    chip.onclick = () => {
      currentFilter = cat;
      renderFilters();
      renderProducts();
    };
    el.appendChild(chip);
  });
}

function renderProducts() {
  const grid = document.getElementById("productGrid");
  const list =
    currentFilter === "Tous"
      ? products
      : products.filter((p) => p.category === currentFilter);

  if (list.length === 0) {
    grid.innerHTML = `<div class="empty-state">Aucun article disponible pour le moment. Revenez bientôt ✨</div>`;
    return;
  }

  grid.innerHTML = "";
  list.forEach((p) => {
    const card = document.createElement("div");
    card.className = "card";
    const outOfStock = p.inStock === false;
    card.innerHTML = `
      <div class="thumb-wrap">
        ${outOfStock ? '<span class="badge-out">Rupture de stock</span>' : ""}
        <img class="thumb" src="${p.image || ""}" alt="${escapeHtml(p.name)}" loading="lazy" />
      </div>
      <div class="body">
        <div class="name">${escapeHtml(p.name)}</div>
        ${p.description ? `<div class="desc">${escapeHtml(p.description)}</div>` : ""}
        <div class="price">${p.price} DH</div>
        <button class="add-btn" ${outOfStock ? "disabled" : ""}>${outOfStock ? "Indisponible" : "Ajouter au panier"}</button>
      </div>
    `;
    if (!outOfStock) {
      card.querySelector(".add-btn").addEventListener("click", () => addToCart(p));
    }
    card.classList.add("reveal");
    grid.appendChild(card);
    revealObserver.observe(card);
  });
}

// Petite animation d'apparition des cartes au scroll
const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.1 }
);

function escapeHtml(str = "") {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Rendu panier ----------
function renderCart() {
  const cart = getCart();
  const itemsEl = document.getElementById("cartItems");
  const totalEl = document.getElementById("cartTotal");
  const countEl = document.getElementById("cartCount");
  const checkoutBtn = document.getElementById("checkoutBtn");

  countEl.textContent = cart.reduce((s, l) => s + l.qty, 0);

  if (cart.length === 0) {
    itemsEl.innerHTML = `<p class="empty-msg">Votre panier est vide.</p>`;
    checkoutBtn.disabled = true;
  } else {
    itemsEl.innerHTML = "";
    cart.forEach((l) => {
      const row = document.createElement("div");
      row.className = "cart-line";
      row.innerHTML = `
        <img src="${l.image || ""}" alt="${escapeHtml(l.name)}" />
        <div class="info">
          <div class="n">${escapeHtml(l.name)}</div>
          <div class="p">${l.price} DH</div>
          <div class="qty-ctrl">
            <button data-act="dec">−</button>
            <span>${l.qty}</span>
            <button data-act="inc">+</button>
            <button class="remove-line" data-act="rm">Retirer</button>
          </div>
        </div>
      `;
      row.querySelector('[data-act="inc"]').onclick = () => updateQty(l.id, 1);
      row.querySelector('[data-act="dec"]').onclick = () => updateQty(l.id, -1);
      row.querySelector('[data-act="rm"]').onclick = () => removeLine(l.id);
      itemsEl.appendChild(row);
    });
    checkoutBtn.disabled = false;
  }

  totalEl.textContent = `${cartTotal(cart)} DH`;

  // Barre flottante panier (mobile)
  const mobileBar = document.getElementById("mobileCartBar");
  document.getElementById("mcbTotal").textContent = `${cartTotal(cart)} DH`;
  mobileBar.classList.toggle("show", cart.length > 0);
  document.body.classList.toggle("has-mobile-bar", cart.length > 0);
}

// ---------- Drawer open/close ----------
function openCart() {
  document.getElementById("overlay").classList.add("open");
  document.getElementById("cartDrawer").classList.add("open");
}
function closeCart() {
  document.getElementById("overlay").classList.remove("open");
  document.getElementById("cartDrawer").classList.remove("open");
}

// ---------- Checkout modal ----------
function openCheckout() {
  if (getCart().length === 0) return;
  document.getElementById("checkoutOverlay").classList.add("open");
}
function closeCheckout() {
  document.getElementById("checkoutOverlay").classList.remove("open");
}

async function handleCheckoutSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const submitBtn = document.getElementById("submitOrderBtn");
  const msgEl = document.getElementById("formMsg");
  msgEl.className = "";
  msgEl.textContent = "";

  const cart = getCart();
  if (cart.length === 0) return;

  const fd = new FormData(form);
  const customer = {
    name: fd.get("name").trim(),
    phone: fd.get("phone").trim(),
    city: fd.get("city").trim(),
    address: fd.get("address").trim(),
    notes: fd.get("notes").trim(),
  };
  const paymentMethod = fd.get("paymentMethod");
  const virementRef = fd.get("virementRef")?.trim() || "";

  submitBtn.disabled = true;
  submitBtn.textContent = "Envoi en cours…";

  const order = {
    items: cart.map((l) => ({ id: l.id, name: l.name, price: l.price, qty: l.qty })),
    total: cartTotal(cart),
    customer,
    paymentMethod,
    virementRef,
    status: "pending",
    createdAt: serverTimestamp(),
  };

  try {
    const docRef = await addDoc(collection(db, "orders"), order);

    // Envoi de l'e-mail de notification (best-effort : la commande est
    // déjà enregistrée dans Firestore même si l'e-mail échoue)
    try {
      await fetch("/.netlify/functions/send-order-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: docRef.id, ...order, createdAt: undefined }),
      });
    } catch (mailErr) {
      console.warn("E-mail non envoyé :", mailErr);
    }

    localStorage.removeItem(CART_KEY);
    renderCart();
    msgEl.className = "form-msg success";
    msgEl.textContent = `Merci ${customer.name} ! Votre commande #${docRef.id.slice(-6).toUpperCase()} a bien été enregistrée. Nous vous contactons vite pour la confirmer.`;
    form.reset();
    document.querySelectorAll(".pay-option").forEach((el, i) => el.classList.toggle("selected", i === 0));
    document.getElementById("virementField").style.display = "none";

    setTimeout(() => {
      closeCheckout();
      closeCart();
      msgEl.textContent = "";
    }, 3500);
  } catch (err) {
    console.error(err);
    msgEl.className = "form-msg error";
    msgEl.textContent = "Une erreur est survenue. Merci de réessayer ou de nous contacter directement.";
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = "Confirmer la commande";
  }
}

// ---------- Init ----------
async function loadProducts() {
  try {
    const snap = await getDocs(collection(db, "products"));
    products = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    renderFilters();
    renderProducts();
  } catch (err) {
    console.error(err);
    document.getElementById("productGrid").innerHTML =
      '<div class="empty-state">Impossible de charger les articles. Vérifiez la configuration Firebase (js/firebase-config.js).</div>';
  }
}

function initEvents() {
  document.getElementById("openCartBtn").onclick = openCart;
  document.getElementById("closeCartBtn").onclick = closeCart;
  document.getElementById("overlay").onclick = closeCart;
  document.getElementById("checkoutBtn").onclick = openCheckout;
  document.getElementById("mcbBtn").onclick = openCart;

  const fab = document.getElementById("whatsappFab");
  if (WHATSAPP_NUMBER) {
    fab.href = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Bonjour, j'ai une question sur un article Primadija 🌸")}`;
    fab.style.display = "flex";
  }
  document.getElementById("checkoutOverlay").addEventListener("click", (e) => {
    if (e.target.id === "checkoutOverlay") closeCheckout();
  });
  document.getElementById("checkoutForm").addEventListener("submit", handleCheckoutSubmit);

  document.querySelectorAll(".pay-option").forEach((opt) => {
    opt.addEventListener("click", () => {
      document.querySelectorAll(".pay-option").forEach((o) => o.classList.remove("selected"));
      opt.classList.add("selected");
      document.querySelector('input[name="paymentMethod"]').value = opt.dataset.value;
      document.getElementById("virementField").style.display =
        opt.dataset.value === "virement" ? "block" : "none";
    });
  });
}

renderCart();
initEvents();
loadProducts();
