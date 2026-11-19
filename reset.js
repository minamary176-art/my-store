const form = document.getElementById("rForm");
const msg = document.getElementById("msg");
const token = new URLSearchParams(location.search).get("token");

function say(text, ok) {
  msg.textContent = text;
  msg.className = ok ? "okmsg" : "notfound";
}

if (!token) {
  form.hidden = true;
  say("الرابط غير صحيح.", false);
}

form.addEventListener("submit", async e => {
  e.preventDefault();

  const password = document.getElementById("p1").value;
  if (password !== document.getElementById("p2").value) {
    say("كلمتا السر غير متطابقتين", false);
    return;
  }

  const res = await fetch("/api/reset", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, password })
  });
  const data = await res.json();

  if (!res.ok) {
    say(data.error || "حدث خطأ", false);
    return;
  }
  form.hidden = true;
  msg.className = "okmsg";
  msg.innerHTML = "تم تغيير كلمة السر ✓ <a href='login.html'>سجّل الدخول</a>";
});