let currentCategory = "الكل";
let searchText = "";

const STEP = 12;
let visible = STEP;

function showMore() {
  visible += STEP;
  renderProducts();
}

let sortMode = "default";

function stars(r) {
  const full = Math.round(r);
  return "★".repeat(full) + "☆".repeat(5 - full);
}

function showToast(text) {
  const t = document.getElementById("toast");
  t.textContent = text;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 1500);
}

const list = document.getElementById("products");
const catBox = document.getElementById("categories");
const searchInput = document.getElementById("search");

function renderCategories() {
  const cats = ["الكل", ...new Set(products.map(p => p.category))];
  catBox.innerHTML = cats
    .map(c => `<button class="${c === currentCategory ? "active" : ""}"
               onclick="setCategory('${c}')">${c}</button>`)
    .join("");
}

function renderProducts() {
  const shown = products.filter(p =>
    (currentCategory === "الكل" || p.category === currentCategory) &&
    p.name.includes(searchText)
  );

  if (sortMode === "low") shown.sort((a, b) => a.price - b.price);
  if (sortMode === "high") shown.sort((a, b) => b.price - a.price);
  if (sortMode === "rating") shown.sort((a, b) => b.rating - a.rating);

  const page = shown.slice(0, visible);

  list.innerHTML = page.length
    ? page.map(p => `
        <article class="card">
          <a href="product.html?id=${p.id}">
            <div class="pic">
              <img src="${IMG_FOLDER}/${p.image}" alt="${p.name}"
                onerror="this.onerror=null;this.src='${IMG_FOLDER}/placeholder.jpeg'">
            </div>
            <h3>${p.name}</h3>
          </a>
          <p class="stars">${stars(p.rating)} <small>${p.rating}</small></p>
          <strong>${p.price} درهم</strong>
          <button class="add" onclick="addToCart(${p.id})">أضف إلى السلة</button>
        </article>`).join("")
    : "<p>لا توجد نتائج.</p>";

  document.getElementById("more").innerHTML = shown.length > visible
    ? `<p class="count">عرض ${page.length} من ${shown.length} منتج</p>
       <button class="more" onclick="showMore()">عرض المزيد</button>`
    : "";
}

function setCategory(c) {
  currentCategory = c;
  visible = STEP;
  renderCategories();
  renderProducts();
}

searchInput.addEventListener("input", e => {
  searchText = e.target.value.trim();
  visible = STEP;
  renderProducts();
});

document.getElementById("sort").addEventListener("change", e => {
  sortMode = e.target.value;
  visible = STEP;
  renderProducts();
});

renderCategories();
renderProducts();

let cart = JSON.parse(localStorage.getItem("cart")) || {};

const cartEl = document.getElementById("cart");
const cartItems = document.getElementById("cartItems");

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function addToCart(id) {
  cart[id] = (cart[id] || 0) + 1;
  renderCart();
  showToast("تمت الإضافة إلى السلة ✓");
}

function changeQty(id, step) {
  cart[id] += step;
  if (cart[id] <= 0) delete cart[id];
  renderCart();
}

function renderCart() {
  let count = 0, total = 0;
  const ids = Object.keys(cart);

  cartItems.innerHTML = ids.length
    ? ids.map(id => {
        const p = products.find(x => x.id == id);
        count += cart[id];
        total += cart[id] * p.price;
        return `
          <div class="cart-line">
            <img src="${IMG_FOLDER}/${p.image}" alt=""
              onerror="this.onerror=null;this.src='${IMG_FOLDER}/placeholder.jpeg'">
            <div class="cart-info">
              <div>${p.name}</div>
              <small>${p.price} درهم</small>
            </div>
            <div class="qty">
              <button onclick="changeQty(${p.id}, -1)">−</button>
              <span>${cart[id]}</span>
              <button onclick="changeQty(${p.id}, 1)">+</button>
            </div>
          </div>`;
      }).join("")
    : "<p>السلة فارغة.</p>";

  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartTotal").textContent = total;
  saveCart();
}

document.getElementById("cartBtn").onclick = () => cartEl.classList.add("open");
document.getElementById("closeCart").onclick = () => cartEl.classList.remove("open");

renderCart();