const cart = JSON.parse(localStorage.getItem("cart")) || {};
const ids = Object.keys(cart);
const summary = document.getElementById("summary");
const form = document.getElementById("orderForm");
const thanks = document.getElementById("thanks");

let total = 0;

if (ids.length === 0) {
  summary.innerHTML = "<p>السلة فارغة. <a href='index.html'>ارجع للمتجر</a></p>";
  form.hidden = true;
} else {
  summary.innerHTML = "<h2>ملخص الطلب</h2>" + ids.map(id => {
    const p = products.find(x => x.id == id);
    const line = cart[id] * p.price;
    total += line;
    return `
      <div class="cart-line">
        <img src="${IMG_FOLDER}/${p.image}" alt=""
          onerror="this.onerror=null;this.src='${IMG_FOLDER}/placeholder.jpeg'">
        <div class="cart-info">${p.name} × ${cart[id]}</div>
        <strong>${line} درهم</strong>
      </div>`;
  }).join("") + `<div class="cart-total">المجموع: <strong id="grand">${total}</strong> درهم</div>`;
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const address = document.getElementById("address").value.trim();

  if (phone.length < 8) {
    alert("أدخل رقم هاتف صحيح.");
    return;
  }

  try {
    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone, address, items: cart, coupon: couponCode })
    });
    if (!res.ok) throw new Error();
    const data = await res.json();

    localStorage.removeItem("cart");
    summary.hidden = true;
    form.hidden = true;
    thanks.hidden = false;
    thanks.innerHTML = `
      <div class="ok">
        <div class="big">✅</div>
        <h2>شكراً لك!</h2>
        <p>رقم طلبك: <strong>${data.number}</strong></p>
        <p>المجموع: ${data.total} درهم</p>
        <a href="index.html" class="checkout-btn">العودة للمتجر</a>
      </div>`;
  } catch {
    alert("تعذر إرسال الطلب، تأكد أن السيرفر شغال.");
  }
});

let percent = 0;
let couponCode = "";

document.getElementById("applyCoupon").addEventListener("click", async () => {
  const code = document.getElementById("coupon").value.trim();
  const msg = document.getElementById("couponMsg");
  const grand = document.getElementById("grand");

  const res = await fetch("/api/coupon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code })
  });

  if (!res.ok) {
    percent = 0;
    couponCode = "";
    grand.textContent = total;
    msg.textContent = "الكود غير صحيح";
    return;
  }

  const data = await res.json();
  percent = data.percent;
  couponCode = code;
  grand.textContent = total - Math.round(total * percent) / 100;
  msg.textContent = "تم تطبيق خصم " + percent + "% ✓";
});