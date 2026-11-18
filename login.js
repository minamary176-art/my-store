const tabLogin = document.getElementById("tabLogin");
const tabRegister = document.getElementById("tabRegister");
const form = document.getElementById("authForm");
const nameInput = document.getElementById("aName");
const passInput = document.getElementById("aPass");
const submit = document.getElementById("aSubmit");
const msg = document.getElementById("aMsg");

let mode = "login";

function setMode(m) {
  mode = m;
  const reg = m === "register";
  tabLogin.classList.toggle("active", !reg);
  tabRegister.classList.toggle("active", reg);
  nameInput.hidden = !reg;
  nameInput.required = reg;
  passInput.autocomplete = reg ? "new-password" : "current-password";
  submit.textContent = reg ? "إنشاء الحساب" : "دخول";
  msg.textContent = "";
}

tabLogin.onclick = () => setMode("login");
tabRegister.onclick = () => setMode("register");

form.addEventListener("submit", async e => {
  e.preventDefault();
  msg.textContent = "";

  const body = {
    email: document.getElementById("aEmail").value.trim(),
    password: passInput.value
  };
  if (mode === "register") body.name = nameInput.value.trim();

  try {
    const res = await fetch("/api/" + mode, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
    const data = await res.json();

    if (!res.ok) {
      msg.textContent = data.error || "حدث خطأ";
      return;
    }
    location.href = "index.html";
  } catch {
    msg.textContent = "تعذر الاتصال بالسيرفر";
  }
});