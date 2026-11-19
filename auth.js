(async function () {
  const link = document.getElementById("authLink");
  if (!link) return;

  try {
    const res = await fetch("/api/me");
    const { user } = await res.json();

    if (user) {
      link.textContent = "مرحباً " + user.name + "|خروج";
      link.href = "#";
      link.onclick = async e => {
        e.preventDefault();
        await fetch("/api/logout", { method: "POST" });
        location.reload();
      };
    }
  } catch {}
})();