// public/dashboard.js (final)
document.addEventListener("DOMContentLoaded", () => {
  const tbody = document.querySelector("#expenseTable tbody");
  const expenseChartEl = document.getElementById("expenseChart");
  const modal = document.getElementById("expenseModal");
  const openModalBtn = document.getElementById("openModal");
  const closeModalBtn = document.getElementById("closeModal");
  const expenseForm = document.getElementById("expenseForm");
  const exportPdfBtn = document.getElementById("exportPdf");
  const logoutBtn = document.getElementById("logoutBtn");

  const filterText = document.getElementById("filterText");
  const fromDate = document.getElementById("fromDate");
  const toDate = document.getElementById("toDate");
  const applyFilters = document.getElementById("applyFilters");
  const clearFilters = document.getElementById("clearFilters");

  const settleGroup = document.getElementById("settleGroup");
  const calcSettleBtn = document.getElementById("calcSettleBtn");
  const settleResult = document.getElementById("settleResult");

  const modalGroup = document.getElementById("modalGroup");
  const modalMember = document.getElementById("modalMember");

  const groupList = document.getElementById("groupList");
  const createGroupBtn = document.getElementById("createGroupBtn");
  const newGroupName = document.getElementById("newGroupName");
  const newGroupDesc = document.getElementById("newGroupDesc");

  const totalExpensesEl = document.getElementById("totalExpenses");
  const monthExpensesEl = document.getElementById("monthExpenses");
  const membersCountEl = document.getElementById("membersCount");
  const progressBar = document.getElementById("progressBar");
  const progressText = document.getElementById("progressText");
  const goalLabel = document.getElementById("goalLabel");

  let chart = null;
  const monthlyGoal = 5000000;
  function fmt(n){ return Number(n).toLocaleString("fa-IR"); }

  async function loadSummary(){
    try {
      const res = await fetch("/api/summary");
      const s = await res.json();
      totalExpensesEl.innerText = fmt(s.totalExpenses) + " تومان";
      monthExpensesEl.innerText = fmt(s.monthExpenses) + " تومان";
      membersCountEl.innerText = s.membersCount || 0;
      const pct = Math.min(100, Math.round((s.monthExpenses / monthlyGoal) * 100));
      progressBar.style.width = pct + "%";
      progressText.innerText = pct + "%";
      goalLabel.innerText = `هدف: ${fmt(monthlyGoal)} تومان`;
    } catch (err) { console.error(err); }
  }

  async function loadGroups(){
    try {
      const res = await fetch("/api/groups");
      const groups = await res.json();
      settleGroup.innerHTML = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
      modalGroup.innerHTML = groups.map(g => `<option value="${g.id}">${g.name}</option>`).join("");
      groupList.innerHTML = groups.map(g => `<div style="padding:6px 0;border-bottom:1px solid rgba(255,255,255,0.03)"><strong>${g.name}</strong><div class="small">${g.description||""}</div></div>`).join("") || "<div class='small'>گروهی وجود ندارد.</div>";
      if (groups.length) loadMembers(groups[0].id);
    } catch (err) { console.error("loadGroups",err); }
  }

  async function loadMembers(groupId){
    try {
      const res = await fetch(`/api/groups/${groupId}/members`);
      const members = await res.json();
      modalMember.innerHTML = members.map(m => `<option value="${m.id}">${m.name}</option>`).join("") || `<option value="1">عضو پیش‌فرض</option>`;
    } catch (err) { console.error("loadMembers",err); }
  }

  createGroupBtn.addEventListener("click", async () => {
    const name = newGroupName.value.trim();
    const desc = newGroupDesc.value.trim();
    if (!name) return alert("نام گروه را وارد کنید");
    await fetch("/api/groups", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ name, description:desc }) });
    newGroupName.value = ""; newGroupDesc.value = "";
    await loadGroups(); await loadSummary();
  });

  settleGroup.addEventListener("change", (e)=> loadMembers(e.target.value) );

  async function loadExpenses(filters = {}){
    try {
      const qs = new URLSearchParams();
      if (filters.from) qs.set("from", filters.from);
      if (filters.to) qs.set("to", filters.to);
      if (filters.category) qs.set("category", filters.category);
      const res = await fetch("/api/expenses?" + qs.toString());
      const data = await res.json();
      renderTable(data);
      renderChart(data);
    } catch (err) { console.error("loadExpenses",err); }
  }

  function renderTable(items){
    tbody.innerHTML = "";
    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" class="small">هیچ هزینه‌ای ثبت نشده است.</td></tr>`;
      return;
    }
    items.forEach(it => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${it.description || "سایر"}</td>
        <td>${fmt(it.amount)}</td>
        <td>${it.description || "-"}</td>
        <td>${it.date || ""}</td>
        <td><button data-id="${it.id}" class="btn ghost deleteBtn">حذف</button></td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll(".deleteBtn").forEach(b=>{
      b.addEventListener("click", async (ev)=>{
        const id = ev.target.dataset.id;
        if (!confirm("آیا حذف شود؟")) return;
        const res = await fetch("/api/expenses/" + id, { method:"DELETE" });
        if (res.ok) { await loadExpenses(); await loadSummary(); }
        else alert("خطا در حذف");
      });
    });
  }

  function renderChart(items){
    const grouped = {};
    items.forEach(i => { const k = i.description || "سایر"; grouped[k] = (grouped[k]||0) + Number(i.amount); });
    const labels = Object.keys(grouped);
    const data = Object.values(grouped);
    if (chart) chart.destroy();
    chart = new Chart(expenseChartEl, { type:"doughnut", data:{ labels, datasets:[{ data, backgroundColor:["#ff9db3","#c0c0c8","#ffd4da","#8bc34a","#9575cd","#ff7043"] }] }, options:{ responsive:true, plugins:{ legend:{ position:"bottom" } } } });
  }

  applyFilters.addEventListener("click", ()=> {
    const f = { from: fromDate.value || undefined, to: toDate.value || undefined, category: filterText.value.trim() || undefined };
    loadExpenses(f);
  });
  clearFilters.addEventListener("click", ()=> { filterText.value=""; fromDate.value=""; loadExpenses(); });

  expenseForm.addEventListener("submit", async (ev)=> {
    ev.preventDefault();
    const category = document.getElementById("category").value.trim();
    const amount = document.getElementById("amount").value.trim();
    const note = document.getElementById("note").value.trim();
    const gid = modalGroup.value || 1;
    const mid = modalMember.value || 1;
    if (!category || !amount) return alert("فیلدهای لازم را پر کنید");
    const res = await fetch("/api/expenses", { method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({ category, amount, note, group_id:gid, member_id:mid }) });
    if (res.ok) {
      modal.style.display = "none";
      expenseForm.reset();
      await loadExpenses();
      await loadSummary();
    } else {
      const err = await res.json();
      alert("خطا: " + (err.error || "unknown"));
    }
  });

  openModalBtn.addEventListener("click", ()=> modal.style.display = "flex");
  closeModalBtn.addEventListener("click", ()=> modal.style.display = "none");
  window.addEventListener("click", (e)=> { if (e.target === modal) modal.style.display = "none"; });

  calcSettleBtn.addEventListener("click", async ()=> {
    const gid = settleGroup.value;
    if (!gid) return alert("گروهی انتخاب کنید");
    const res = await fetch(`/api/groups/${gid}/settlement`);
    if (!res.ok) return settleResult.innerHTML = "<p>خطا</p>";
    const data = await res.json();
    if (data.message) return settleResult.innerHTML = `<p>${data.message}</p>`;
    let html = `<p>💰 مجموع: ${fmt(data.total)} تومان — ⚖️ سهم: ${fmt(data.share)} تومان</p><ul>`;
    data.members.forEach(m => {
      const bal = Number(m.balance);
      const st = bal>0 ? `<span style="color:#9df5b0">طلبکار ${fmt(bal)}</span>` : bal<0 ? `<span style="color:#ff9db3">بدهکار ${fmt(Math.abs(bal))}</span>` : `<span style="color:#c0c0c8">تسویه</span>`;
      html += `<li style="margin-top:6px">👤 ${m.name} — ${st}</li>`;
    });
    html += `</ul>`;
    settleResult.innerHTML = html;
  });

  exportPdfBtn.addEventListener("click", async ()=> {
    try {
      const el = document.querySelector(".container-inner");
      const canvas = await html2canvas(el, { scale:2 });
      const img = canvas.toDataURL("image/png");
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ unit:"px", format:[canvas.width, canvas.height] });
      pdf.addImage(img, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save("report.pdf");
    } catch (err) { console.error("pdf err", err); alert("خطا در ساخت PDF"); }
  });

  logoutBtn.addEventListener("click", ()=> { window.location.href = "/"; });

  (async function init(){
    await loadSummary();
    await loadGroups();
    await loadExpenses();
  })();
});
