const form = document.getElementById("pwForm");
const msg = document.getElementById("msg");

function say(text, ok) {
  msg.textContent = text;
  msg.className = ok ? "okmsg" : "notfound";
}

(async function () {
  const { user } = await (await fetch("/api/me")).json();
  if (!user) {
    form.hidden = true;
    msg.innerHTML = "<a href='login.html'>سجّل الدخول</a> أولاً.";
  } else {
    document.getElementById("who").textContent = user.email;
  }
})();

form.addEventListener("submit", async e => {
  e.preventDefault();

  const next = document.getElementById("nw").value;
  if (next !== document.getElementById("nw2").value) {
    say("كلمتا السر الجديدتان غير متطابقتين", false);
    return;
  }

  const res = await fetch("/api/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current: document.getElementById("cur").value, next })
  });
  const data = await res.json();

  if (!res.ok) {
    say(data.error || "حدث خطأ", false);
    return;
  }
  form.reset();
  say("تم تغيير كلمة السر ✓", true);
});