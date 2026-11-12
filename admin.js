function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

const box = document.getElementById("orders");

async function loadOrders() {
  try {
    const res = await fetch("/api/orders");
    const orders = await res.json();
    orders.reverse();

    document.getElementById("count").textContent = orders.length;
    document.getElementById("sOrders").textContent = orders.length;
    document.getElementById("sSales").textContent =
      orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    document.getElementById("sNew").textContent =
      orders.filter(o => (o.status || "جديد") === "جديد").length;

    box.innerHTML = orders.length
      ? orders.map(o => {
          const lines = Object.keys(o.items).map(id => {
            const p = products.find(x => x.id == id);
            return `<li>${p ? (esc(p.name)) : "منتج #" + esc(id)} × ${esc(o.items[id])}</li>`;
          }).join("");

          return `
            <article class="order">
              <div class="order-top">
                <strong>طلب #${o.number}</strong>
                <small>${new Date(o.date).toLocaleString("ar")}</small>
                <button class="del" onclick="deleteOrder(${Number(o.number)})">حذف</button>
              </div>
              <p>👤 ${esc(o.name)} &nbsp; 📞 ${esc(o.phone)}</p>
              <p>📍 ${(esc(o.address))}</p>
              <ul>${lines}</ul>
              <select class="status" onchange="setStatus(${Number(o.number)}, this.value)">
                ${["جديد", "قيد التجهيز", "تم التسليم"].map(s =>
                  `<option ${(o.status || "جديد") === s ? "selected" : ""}>${s}</option>`
                ).join("")}
              </select>
              ${o.coupon ? `<p>🏷️ كوبون ${esc(o.coupon)}: خصم ${esc(o.discount)} درهم</p>` : ""}
              <div class="order-total">المجموع: ${o.total} درهم</div>
            </article>`;
        }).join("")
      : "<p>لا توجد طلبات بعد.</p>";
  } catch {
    box.innerHTML = "<p>تعذر تحميل الطلبات. تأكد أن السيرفر شغال.</p>";
  }
}

loadOrders();

const pform = document.getElementById("productForm");

function buildForm() {
  const fd = new FormData(pform);
  const cat = catSelect.value === "__new" ? newCat.value : catSelect.value;
  fd.set("category", cat.trim());
  return fd;
}

pform.addEventListener("submit", async e => {
  e.preventDefault();
  const msg = document.getElementById("formMsg");

  try {
    const res = await fetch("/api/products", {
      method: "POST",
      body: buildForm()
    });
    if (!res.ok) throw new Error();
    pform.reset();
    loadCategories();
    newCat.hidden = true;
    msg.textContent = "تمت إضافة المنتج ✓ افتح المتجر وحدّث الصفحة.";
    loadproducts();
    
  } catch {
    msg.textContent = "تعذرت الإضافة، راجع البيانات.";
  }
});

const plist = document.getElementById("plist");

async function loadProducts() {
  const res = await fetch("/api/products");
  const items = await res.json();
  window.currentItems = items;

  document.getElementById("pcount").textContent = items.length;
  document.getElementById("sProducts").textContent = items.length;

  plist.innerHTML = items.length
    ? items.map(p => `
        <div class="prow">
          <img src="image/${p.image}" alt=""
               onerror="this.onerror=null;this.src='image/placeholder.jpeg'">
          <div class="pinfo">
            <strong>${esc(p.name)}</strong>
            <small>${esc(p.category)} · ${esc(p.price)} درهم</small>
          </div>
          <button class="edit" onclick="editProduct(${p.id})">تعديل</button>
          <button class="del" onclick="deleteProduct(${p.id})">حذف</button>
        </div>`).join("")
    : "<p>لا توجد منتجات.</p>";
}

async function deleteProduct(id) {
  if (!confirm("متأكد من حذف المنتج؟")) return;
  await fetch("/api/products/" + id, { method: "DELETE" });
  loadProducts();
}

loadProducts();

const catSelect = document.getElementById("catSelect");
const newCat = document.getElementById("newCat");

async function loadCategories() {
  const res = await fetch("/api/products");
  const items = await res.json();
  const cats = [...new Set(items.map(p => p.category))];

  catSelect.innerHTML =
    cats.map(c => `<option value="${c}">${c}</option>`).join("") +
    `<option value="__new">+ تصنيف جديد...</option>`;
}

catSelect.addEventListener("change", () => {
  newCat.hidden = catSelect.value !== "__new";
  newCat.required = catSelect.value === "__new";
});

loadCategories();

async function editProduct(id) {
  const p = window.currentItems.find(x => x.id === id);

  const name = prompt("اسم المنتج:", p.name);
  if (name === null) return;

  const price = prompt("السعر بالدرهم:", p.price);
  if (price === null) return;

  await fetch("/api/products/" + id, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, price })
  });

  loadProducts();
}

async function deleteOrder(number) {
  if (!confirm("متأكد من حذف الطلب؟")) return;
  await fetch("/api/orders/" + number, { method: "DELETE" });
  loadOrders();
}

document.getElementById("clearAll").addEventListener("click", async () => {
  if (!confirm("هيتم حذف كل الطلبات نهائياً. متأكد؟")) return;
  await fetch("/api/orders", { method: "DELETE" });
  loadOrders();
});

async function setStatus(number, status) {
  await fetch("/api/orders/" + number, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status })
  });
  loadOrders();
}