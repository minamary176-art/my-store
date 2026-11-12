

const id = new URLSearchParams(location.search).get("id");
const p = products.find(x => x.id == id);
const box = document.getElementById("details");

if (!p) {
  box.innerHTML = "<p style='padding:16px'>المنتج غير موجود.</p>";
} else {
  document.title = p.name;
  box.innerHTML = `
    <div class="product-page">
      <img src="${IMG_FOLDER}/${p.image}" alt="${p.name}"
        onerror="this.onerror=null;this.src='${IMG_FOLDER}/placeholder.jpeg'">
      <div class="info">
        <h2>${p.name}</h2>
        <p>التصنيف: ${p.category}</p>
        <p>⭐ ${p.rating} (${p.ratingCount || 0} تقييم)</p>
        <div class="big-price">${p.price} درهم</div>
        <p>${p.description}</p>
        <button class="add" onclick="addToCart()">أضف إلى السلة</button>
        <p id="msg"></p>
        <div class="rate">
          <p>قيّم المنتج:</p>
          <div>
            ${[1, 2, 3, 4, 5].map(n =>
            `<button type="button" class="star" data-n="${n}">☆</button>`
            ).join("")}
          </div>
          <p id="rateMsg"></p>
        </div>

      </div>
    </div>`;
}

function addToCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || {};
  cart[p.id] = (cart[p.id] || 0) + 1;
  localStorage.setItem("cart", JSON.stringify(cart));
  document.getElementById("msg").textContent = "تمت الإضافة إلى السلة ✓";
}

document.querySelectorAll(".star").forEach(btn => {
  btn.addEventListener("click", async () => {
    const n = Number(btn.dataset.n);
    const msg = document.getElementById("rateMsg");

    const res = await fetch("/api/products/" + p.id + "/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stars: n })
    });

    if (res.ok) {
      document.querySelectorAll(".star").forEach(s => {
        s.textContent = Number(s.dataset.n) <= n ? "★" : "☆";
      });
      msg.textContent = "شكراً لتقييمك ✓";
    } else {
      const data = await res.json();
      msg.textContent = data.error || "تعذر إرسال التقييم";
    }
  });
});