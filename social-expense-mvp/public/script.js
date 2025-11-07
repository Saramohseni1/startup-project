let isLogin = true;

const title = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const errorMsg = document.getElementById("error-message");
const formBox = document.getElementById("formBox");
const switchText = document.querySelector(".switch-text");
const switchLink = document.getElementById("switchMode");

function toggleMode(e) {
  e.preventDefault();
  isLogin = !isLogin;
  formBox.classList.add("slide");

  setTimeout(() => {
    title.innerText = isLogin ? "ورود" : "ثبت‌نام";
    submitBtn.innerText = isLogin ? "ورود" : "ثبت‌نام";
    switchText.innerHTML = isLogin
      ? 'حساب نداری؟ <a href="#" class="switch-link">ثبت‌نام کن</a>'
      : 'قبلاً ثبت‌نام کردی؟ <a href="#" class="switch-link">وارد شو</a>';
    errorMsg.innerText = "";
    formBox.classList.remove("slide");

    // وصل کردن دوباره event listener به لینک جدید
    document
      .querySelector(".switch-link")
      .addEventListener("click", toggleMode);
  }, 400);
}

switchLink.addEventListener("click", toggleMode);

document.getElementById("authForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  errorMsg.innerText = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();

  if (!/^[A-Za-z0-9_]+$/.test(username)) {
    errorMsg.innerText = "⚠️ فقط حروف انگلیسی، عدد یا _ مجاز است.";
    return;
  }

  const endpoint = isLogin ? "/login" : "/register";

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (response.redirected) {
      window.location.href = response.url;
      return;
    }

    const text = await response.text();
    if (!response.ok) throw new Error(text);
    alert(isLogin ? "ورود موفق ✅" : "ثبت‌نام موفق ✅");
    if (isLogin) window.location.href = "/dashboard.html";
  } catch (err) {
    errorMsg.innerText = err.message || "خطا در ارتباط با سرور.";
  }
});
