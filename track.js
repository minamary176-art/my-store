const STEPS = ["جديد", "قيد التجهيز", "تم التسليم"];
const form = document.getElementById("trackForm");
const result = document.getElementById("result");

form.addEventListener("submit", async e => {
  e.preventDefault();
  result.textContent = "جاري البحث...";

  try {
    const res = await fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        number: document.getElementById("tNumber").value.trim(),
        phone: document.getElementById("tPhone").value.trim()
      })
    });

    if (!res.ok) {
      result.innerHTML = "<p class='notfound'>لم نجد طلباً بهذه البيانات. تأكد من الرقمين.</p>";
      return;
    }

    const o = await res.json();
    const current = STEPS.indexOf(o.status);

    result.innerHTML = `
      <div class="track-box">
        <p>طلب <strong>#${Number(o.number)}</strong> · ${Number(o.total)} درهم</p>
        <ol class="steps">
          ${STEPS.map((s, i) =>
            `<li class="${i <= current ? "done" : ""}">${s}</li>`
          ).join("")}
        </ol>
      </div>`;
  } catch {
    result.innerHTML = "<p class='notfound'>تعذر الاتصال بالسيرفر.</p>";
  }
});