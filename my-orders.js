function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

(async function () {
  const box = document.getElementById("list");

  try {
    const res = await fetch("/api/my-orders");

    if (res.status === 401) {
      box.innerHTML = "<p>سجّل الدخول لعرض طلباتك. <a href='login.html'>دخول</a></p>";
      return;
    }

    const orders = await res.json();

    box.innerHTML = orders.length
      ? orders.map(o => {
          const lines = Object.keys(o.items).map(id => {
            const p = products.find(x => x.id == id);
            return `<li>${p ? esc(p.name) : "منتج #" + esc(id)} × ${esc(o.items[id])}</li>`;
          }).join("");

          return `
            <article class="order">
              <div class="order-top">
                <strong>طلب #${esc(o.number)}</strong>
                <small>${new Date(o.date).toLocaleString("ar")}</small>
              </div>
              <ul>${lines}</ul>
              ${o.coupon ? `<p>🏷️ كوبون ${esc(o.coupon)}: خصم ${esc(o.discount)} درهم</p>` : ""}
              <div class="order-total">المجموع: ${esc(o.total)} درهم</div>
              <p>الحالة: <strong>${esc(o.status)}</strong></p>
            </article>`;
        }).join("")
      : "<p>لا توجد طلبات بعد.</p>";
  } catch {
    box.innerHTML = "<p>تعذر تحميل الطلبات.</p>";
  }
})();