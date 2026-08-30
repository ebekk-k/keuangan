const { useState, useEffect, useMemo } = React;
const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = Recharts;

// Polifil untuk meniru window.storage lokal jika dijalankan di browser standar
if (!window.storage) {
  window.storage = {
    get: async (key) => ({ status: 'fulfilled', value: { value: localStorage.getItem(key) } }),
    set: async (key, val) => localStorage.setItem(key, val)
  };
}

// Ikon Lucide dikonversi menjadi komponen SVG
const Pencil = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>;
const Trash2 = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>;
const ChevronLeft = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>;
const ChevronRight = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
const X = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
const Wallet = ({ size, color }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"></path><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"></path><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"></path></svg>;
const User = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
const Users = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><polyline points="16 11 16 11 16 11"></polyline><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
const Settings2 = ({ size }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 7h-9"></path><path d="M14 17H5"></path><circle cx="17" cy="17" r="3"></circle><circle cx="7" cy="7" r="3"></circle></svg>;

const MONTHS_ID = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

const DEFAULT_CATEGORIES = {
  pribadi: {
    pengeluaran: ["Makanan & Minuman", "Transportasi", "Belanja", "Tagihan & Utilitas", "Kesehatan", "Hiburan", "Pendidikan", "Lainnya"],
    pemasukan: ["Gaji", "Bonus / THR", "Usaha / Bisnis", "Investasi", "Hadiah / Transfer", "Lainnya"],
  },
  tim: {
    pengeluaran: ["Sewa Alat", "Transportasi & Logistik", "Konsumsi Kru", "Talent & Kru", "Lokasi / Venue", "Pasca Produksi", "Perlengkapan", "Lainnya"],
    pemasukan: ["Dana / Budget Masuk", "Sponsor", "Investor / Modal", "Reimburse", "Lainnya"],
  },
};

const DEFAULT_ACCOUNTS = {
  pribadi: ["Cash", "BRI", "BNI", "BCA", "Mandiri"],
  tim: ["Kas Tim", "Rekening Produksi"],
};

const SCOPE_META = {
  pribadi: { label: "Keuangan Pribadi", shortLabel: "Pribadi", icon: "user" },
  tim: { label: "Kas Tim Produksi", shortLabel: "Tim Produksi", icon: "users" },
};

const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(n || 0);
const todayStr = () => new Date().toISOString().slice(0, 10);
const uid = () => (window.crypto.randomUUID ? window.crypto.randomUUID() : "id-" + Date.now() + Math.random().toString(16).slice(2));

function emptyForm(scope, categories, accounts) {
  return {
    id: null,
    date: todayStr(),
    type: "pengeluaran",
    category: (categories[scope] && categories[scope].pengeluaran[0]) || "",
    detail: "",
    amount: "",
    account: (accounts[scope] && accounts[scope][0]) || "",
  };
}

function FinanceApp() {
  const [loading, setLoading] = useState(true);
  const [activeScope, setActiveScope] = useState("pribadi");
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState(DEFAULT_ACCOUNTS);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [form, setForm] = useState(() => emptyForm("pribadi", DEFAULT_CATEGORIES, DEFAULT_ACCOUNTS));
  const [manageOpen, setManageOpen] = useState({ category: false, account: false });
  const [newCategoryInput, setNewCategoryInput] = useState("");
  const [newAccountInput, setNewAccountInput] = useState("");
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [chartTab, setChartTab] = useState("pengeluaran");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [tx, acc, cat] = await Promise.allSettled([
          window.storage.get("transactions"),
          window.storage.get("accounts"),
          window.storage.get("categories"),
        ]);
        let loadedAccounts = DEFAULT_ACCOUNTS;
        let loadedCategories = DEFAULT_CATEGORIES;
        
        if (tx.status === "fulfilled" && tx.value && tx.value.value) {
          const parsed = JSON.parse(tx.value.value);
          setTransactions(parsed.map((t) => ({ ...t, scope: t.scope || "pribadi" })));
        }
        if (acc.status === "fulfilled" && acc.value && acc.value.value) {
          const parsed = JSON.parse(acc.value.value);
          loadedAccounts = {
            pribadi: parsed.pribadi && parsed.pribadi.length ? parsed.pribadi : DEFAULT_ACCOUNTS.pribadi,
            tim: parsed.tim && parsed.tim.length ? parsed.tim : DEFAULT_ACCOUNTS.tim,
          };
          setAccounts(loadedAccounts);
        }
        if (cat.status === "fulfilled" && cat.value && cat.value.value) {
          const parsed = JSON.parse(cat.value.value);
          loadedCategories = {
            pribadi: {
              pengeluaran: parsed.pribadi?.pengeluaran?.length ? parsed.pribadi.pengeluaran : DEFAULT_CATEGORIES.pribadi.pengeluaran,
              pemasukan: parsed.pribadi?.pemasukan?.length ? parsed.pribadi.pemasukan : DEFAULT_CATEGORIES.pribadi.pemasukan,
            },
            tim: {
              pengeluaran: parsed.tim?.pengeluaran?.length ? parsed.tim.pengeluaran : DEFAULT_CATEGORIES.tim.pengeluaran,
              pemasukan: parsed.tim?.pemasukan?.length ? parsed.tim.pemasukan : DEFAULT_CATEGORIES.tim.pemasukan,
            },
          };
          setCategories(loadedCategories);
        }
        setForm(emptyForm("pribadi", loadedCategories, loadedAccounts));
      } catch (e) {
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function persistTransactions(next) {
    setTransactions(next);
    try { await window.storage.set("transactions", JSON.stringify(next)); } 
    catch (e) { setError("Gagal menyimpan data. Coba lagi."); }
  }

  async function persistAccounts(next) {
    setAccounts(next);
    try { await window.storage.set("accounts", JSON.stringify(next)); } 
    catch (e) { setError("Gagal menyimpan daftar akun."); }
  }

  async function persistCategories(next) {
    setCategories(next);
    try { await window.storage.set("categories", JSON.stringify(next)); } 
    catch (e) { setError("Gagal menyimpan daftar kategori."); }
  }

  function switchScope(scope) {
    if (scope === activeScope) return;
    setActiveScope(scope);
    setForm(emptyForm(scope, categories, accounts));
    setError("");
    setManageOpen({ category: false, account: false });
    setChartTab("pengeluaran");
  }

  function resetForm() {
    setForm(emptyForm(activeScope, categories, accounts));
  }

  function handleTypeChange(type) {
    setForm((f) => ({ ...f, type, category: categories[activeScope][type][0] || "" }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const amountNum = Number(String(form.amount).replace(/[^0-9]/g, ""));
    if (!form.date || !amountNum || amountNum <= 0 || !form.account || !form.category) {
      setError("Lengkapi tanggal, kategori, nominal (lebih dari 0), dan akun terlebih dahulu.");
      return;
    }
    setSaving(true);
    const record = {
      id: form.id || uid(),
      scope: activeScope,
      date: form.date,
      type: form.type,
      category: form.category,
      detail: form.detail.trim(),
      amount: amountNum,
      account: form.account,
      createdAt: form.id ? undefined : Date.now(),
    };
    let next;
    if (form.id) {
      next = transactions.map((t) => (t.id === form.id ? { ...t, ...record, createdAt: t.createdAt } : t));
    } else {
      next = [...transactions, record];
    }
    await persistTransactions(next);
    setSaving(false);
    resetForm();
  }

  function handleEdit(t) {
    setForm({
      id: t.id,
      date: t.date,
      type: t.type,
      category: t.category,
      detail: t.detail,
      amount: String(t.amount),
      account: t.account,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleDelete(id) {
    const next = transactions.filter((t) => t.id !== id);
    await persistTransactions(next);
    if (form.id === id) resetForm();
  }

  async function addCategory() {
    const name = newCategoryInput.trim();
    if (!name) return;
    const list = categories[activeScope][form.type];
    if (list.some((c) => c.toLowerCase() === name.toLowerCase())) {
      setNewCategoryInput("");
      return;
    }
    const next = { ...categories, [activeScope]: { ...categories[activeScope], [form.type]: [...list, name] } };
    await persistCategories(next);
    setNewCategoryInput("");
  }

  async function removeCategory(name) {
    const list = categories[activeScope][form.type];
    if (list.length <= 1) {
      setError("Minimal harus ada 1 kategori.");
      return;
    }
    const nextList = list.filter((c) => c !== name);
    const next = { ...categories, [activeScope]: { ...categories[activeScope], [form.type]: nextList } };
    await persistCategories(next);
    if (form.category === name) setForm((f) => ({ ...f, category: nextList[0] }));
  }

  async function addAccount() {
    const name = newAccountInput.trim();
    if (!name) return;
    const list = accounts[activeScope];
    if (list.some((a) => a.toLowerCase() === name.toLowerCase())) {
      setNewAccountInput("");
      return;
    }
    const next = { ...accounts, [activeScope]: [...list, name] };
    await persistAccounts(next);
    setNewAccountInput("");
  }

  async function removeAccount(name) {
    const list = accounts[activeScope];
    if (list.length <= 1) {
      setError("Minimal harus ada 1 akun.");
      return;
    }
    const nextList = list.filter((a) => a !== name);
    const next = { ...accounts, [activeScope]: nextList };
    await persistAccounts(next);
    if (form.account === name) setForm((f) => ({ ...f, account: nextList[0] }));
  }

  async function handleResetScope() {
    const label = SCOPE_META[activeScope].label;
    if (!window.confirm(`Hapus semua transaksi pada buku "${label}"? Tindakan ini tidak bisa dibatalkan.`)) return;
    const next = transactions.filter((t) => t.scope !== activeScope);
    await persistTransactions(next);
  }

  const scopeTx = useMemo(() => transactions.filter((t) => t.scope === activeScope), [transactions, activeScope]);
  const monthTx = useMemo(() => scopeTx.filter((t) => {
    const d = new Date(t.date + "T00:00:00");
    return d.getFullYear() === cursor.year && d.getMonth() === cursor.month;
  }), [scopeTx, cursor]);

  const monthIncome = monthTx.filter((t) => t.type === "pemasukan").reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTx.filter((t) => t.type === "pengeluaran").reduce((s, t) => s + t.amount, 0);
  const monthSaldo = monthIncome - monthExpense;
  const scopeSaldo = useMemo(() => scopeTx.reduce((s, t) => s + (t.type === "pemasukan" ? t.amount : -t.amount), 0), [scopeTx]);

  const scopeAccounts = accounts[activeScope];
  const scopeCategories = categories[activeScope];

  const accountBalances = useMemo(() => {
    const map = {};
    scopeAccounts.forEach((a) => (map[a] = 0));
    scopeTx.forEach((t) => { map[t.account] = (map[t.account] || 0) + (t.type === "pemasukan" ? t.amount : -t.amount); });
    return scopeAccounts.map((a) => ({ account: a, balance: map[a] || 0 }));
  }, [scopeTx, scopeAccounts]);

  const categoryChartData = useMemo(() => {
    const cats = scopeCategories[chartTab];
    const map = {};
    cats.forEach((c) => (map[c] = 0));
    monthTx.filter((t) => t.type === chartTab).forEach((t) => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return cats.map((c) => ({ name: c, total: map[c] })).filter((c) => c.total > 0).sort((a, b) => b.total - a.total);
  }, [monthTx, chartTab, scopeCategories]);

  const sortedMonthTx = useMemo(() => [...monthTx].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0)), [monthTx]);

  function shiftMonth(delta) {
    setCursor((c) => {
      let m = c.month + delta;
      let y = c.year;
      if (m < 0) { m = 11; y -= 1; } 
      else if (m > 11) { m = 0; y += 1; }
      return { year: y, month: m };
    });
  }

  const categoryOptions = scopeCategories[form.type] || [];
  const barColor = chartTab === "pengeluaran" ? "#B54B3E" : "#3F7A5C";
  const scopeAccent = activeScope === "pribadi" ? "#B98D3E" : "#4E7FB0";

  if (loading) {
    return (
      <div className="page page-loading">
        <div className="loading-text">Memuat catatan keuangan...</div>
      </div>
    );
  }

  return (
    <div className="page">
      <header className="header">
        <div className="header-inner">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="header-icon">
              <Wallet size={20} color="#F6F1E4" />
            </div>
            <div>
              <div className="header-title">Buku Kas Digital</div>
              <div className="header-subtitle">Catatan pemasukan &amp; pengeluaran harian</div>
            </div>
          </div>
          <div className="stamp" style={{ borderColor: `${scopeAccent}A6` }}>
            <div className="stamp-inner" style={{ color: scopeAccent === "#B98D3E" ? "#E9C77E" : "#AFCBE8" }}>
              <div style={{ fontSize: 8.5, letterSpacing: "0.1em", opacity: 0.9 }}>SALDO {SCOPE_META[activeScope].shortLabel.toUpperCase()}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 14 }}>
                {rupiah(scopeSaldo)}
              </div>
            </div>
          </div>
        </div>

        <div className="scope-tabs-wrap">
          <div className="scope-tabs">
            {Object.keys(SCOPE_META).map((key) => (
              <button
                key={key}
                onClick={() => switchScope(key)}
                className={`scope-tab-btn ${activeScope === key ? 'scope-tab-active' : ''}`}
              >
                {SCOPE_META[key].icon === "user" ? <User size={14} /> : <Users size={14} />}
                {SCOPE_META[key].label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="main fin-grid">
        <section className="slip">
          <div className="slip-perforation" />
          <div style={{ padding: "22px 22px 24px" }}>
            <div className="slip-header-row">
              <h2 className="slip-title">{form.id ? "Ubah Transaksi" : "Slip Transaksi"}</h2>
              {form.id && (
                <button type="button" onClick={resetForm} className="icon-btn-ghost" aria-label="Batalkan ubah">
                  <X size={16} />
                </button>
              )}
            </div>
            <div className="slip-scope-note">
              Buku aktif: <strong>{SCOPE_META[activeScope].label}</strong>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="toggle-row">
                <button type="button" onClick={() => handleTypeChange("pemasukan")} className={`toggle-btn ${form.type === "pemasukan" ? "toggle-btn-active-income" : ""}`}>
                  + Pemasukan
                </button>
                <button type="button" onClick={() => handleTypeChange("pengeluaran")} className={`toggle-btn ${form.type === "pengeluaran" ? "toggle-btn-active-expense" : ""}`}>
                  − Pengeluaran
                </button>
              </div>

              <label className="label">Tanggal</label>
              <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} className="input" required />

              <div className="label-row">
                <label className="label" style={{ margin: 0 }}>Rincian (kategori)</label>
                <button type="button" onClick={() => setManageOpen((m) => ({ ...m, category: !m.category, account: false }))} className="manage-link">
                  <Settings2 size={12} /> {manageOpen.category ? "Tutup" : "Kelola"}
                </button>
              </div>
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} className="input">
                {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              {manageOpen.category && (
                <div className="manage-panel">
                  <div className="manage-hint">Kategori {form.type} — {SCOPE_META[activeScope].shortLabel}</div>
                  <div className="chip-wrap">
                    {categoryOptions.map((c) => (
                      <span key={c} className="chip">
                        {c}
                        <button type="button" onClick={() => removeCategory(c)} className="chip-remove" aria-label={`Hapus kategori ${c}`}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input placeholder="Tambah kategori baru" value={newCategoryInput} onChange={(e) => setNewCategoryInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }} className="input" style={{ flex: 1, background: "#fff" }} />
                    <button type="button" onClick={addCategory} className="small-btn">Tambah</button>
                  </div>
                </div>
              )}

              <label className="label">Detail</label>
              <textarea placeholder={activeScope === "pribadi" ? "Contoh: Makan siang bersama tim di kantor" : "Contoh: Sewa kamera + lensa untuk syuting hari 1"} value={form.detail} onChange={(e) => setForm((f) => ({ ...f, detail: e.target.value }))} className="input" style={{ minHeight: 64, resize: "vertical" }} />

              <label className="label">Nominal</label>
              <div style={{ position: "relative" }}>
                <span className="rp-prefix">Rp</span>
                <input type="text" inputMode="numeric" placeholder="0" value={form.amount === "" ? "" : Number(String(form.amount).replace(/[^0-9]/g, "")).toLocaleString("id-ID")} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value.replace(/[^0-9]/g, "") }))} className="input" style={{ paddingLeft: 40, fontFamily: "'IBM Plex Mono', monospace" }} />
              </div>

              <div className="label-row">
                <label className="label" style={{ margin: 0 }}>Sumber / tujuan dana</label>
                <button type="button" onClick={() => setManageOpen((m) => ({ ...m, account: !m.account, category: false }))} className="manage-link">
                  <Settings2 size={12} /> {manageOpen.account ? "Tutup" : "Kelola"}
                </button>
              </div>
              <select value={form.account} onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))} className="input">
                {scopeAccounts.map((a) => <option key={a} value={a}>{a}</option>)}
              </select>
              {manageOpen.account && (
                <div className="manage-panel">
                  <div className="manage-hint">Akun — {SCOPE_META[activeScope].shortLabel}</div>
                  <div className="chip-wrap">
                    {scopeAccounts.map((a) => (
                      <span key={a} className="chip">
                        {a}
                        <button type="button" onClick={() => removeAccount(a)} className="chip-remove" aria-label={`Hapus akun ${a}`}>
                          <X size={11} />
                        </button>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                    <input placeholder="Tambah akun baru" value={newAccountInput} onChange={(e) => setNewAccountInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAccount(); } }} className="input" style={{ flex: 1, background: "#fff" }} />
                    <button type="button" onClick={addAccount} className="small-btn">Tambah</button>
                  </div>
                </div>
              )}

              {error && <div className="error-text">{error}</div>}
              <button type="submit" disabled={saving} className="submit-btn">
                {saving ? "Menyimpan..." : form.id ? "Simpan Perubahan" : "Catat Transaksi"}
              </button>
            </form>
          </div>
        </section>

        <section>
          <div className="month-nav">
            <button onClick={() => shiftMonth(-1)} className="nav-btn" aria-label="Bulan sebelumnya"><ChevronLeft size={18} /></button>
            <div className="month-label">{MONTHS_ID[cursor.month]} {cursor.year}</div>
            <button onClick={() => shiftMonth(1)} className="nav-btn" aria-label="Bulan berikutnya"><ChevronRight size={18} /></button>
          </div>

          <div className="summary-row">
            <div className="summary-card" style={{ borderTop: "3px solid #3F7A5C" }}>
              <div className="summary-label">Pemasukan</div>
              <div className="summary-value" style={{ color: "#2C5A42" }}>{rupiah(monthIncome)}</div>
            </div>
            <div className="summary-card" style={{ borderTop: "3px solid #B54B3E" }}>
              <div className="summary-label">Pengeluaran</div>
              <div className="summary-value" style={{ color: "#9A3B2F" }}>{rupiah(monthExpense)}</div>
            </div>
            <div className="summary-card" style={{ borderTop: `3px solid ${scopeAccent}` }}>
              <div className="summary-label">Saldo Bulan Ini</div>
              <div className="summary-value" style={{ color: monthSaldo >= 0 ? "#2C5A42" : "#9A3B2F" }}>{rupiah(monthSaldo)}</div>
            </div>
          </div>

          <div className="account-row fin-scrollbar">
            {accountBalances.map((a) => (
              <div key={a.account} className="account-chip">
                <div style={{ fontSize: 11, opacity: 0.75 }}>{a.account}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontWeight: 600, fontSize: 13 }}>{rupiah(a.balance)}</div>
              </div>
            ))}
          </div>

          <div className="panel">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <h3 className="panel-title">Rincian per Kategori</h3>
              <div className="chart-tabs">
                <button onClick={() => setChartTab("pengeluaran")} className={`chart-tab-btn ${chartTab === "pengeluaran" ? "chart-tab-active" : ""}`}>Pengeluaran</button>
                <button onClick={() => setChartTab("pemasukan")} className={`chart-tab-btn ${chartTab === "pemasukan" ? "chart-tab-active" : ""}`}>Pemasukan</button>
              </div>
            </div>
            {categoryChartData.length === 0 ? (
              <div className="empty-state">Belum ada data {chartTab} pada bulan ini.</div>
            ) : (
              <div style={{ width: "100%", height: Math.max(120, categoryChartData.length * 40) }}>
                <ResponsiveContainer>
                  <BarChart data={categoryChartData} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4DAC4" horizontal={false} />
                    <XAxis type="number" tickFormatter={(v) => (v >= 1000000 ? `${(v / 1000000).toFixed(1)}jt` : `${Math.round(v / 1000)}rb`)} tick={{ fontSize: 11, fill: "#6B5F4C" }} axisLine={{ stroke: "#D8CDB4" }} />
                    <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 12, fill: "#3A322A" }} axisLine={{ stroke: "#D8CDB4" }} />
                    <Tooltip formatter={(v) => rupiah(v)} contentStyle={{ fontSize: 12, borderRadius: 6 }} />
                    <Bar dataKey="total" radius={[0, 4, 4, 0]}>
                      {categoryChartData.map((_, i) => <Cell key={i} fill={barColor} fillOpacity={1 - i * 0.08} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          <div className="panel">
            <h3 className="panel-title">Transaksi {MONTHS_ID[cursor.month]}</h3>
            {sortedMonthTx.length === 0 ? (
              <div className="empty-state">Belum ada transaksi {SCOPE_META[activeScope].shortLabel.toLowerCase()} di bulan ini. Isi slip di sebelah kiri untuk mulai mencatat.</div>
            ) : (
              <div>
                {sortedMonthTx.map((t) => (
                  <div key={t.id} className="tx-row">
                    <div className="tx-date">{new Date(t.date + "T00:00:00").toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, fontSize: 13.5, color: "#2B2320" }}>{t.category}</div>
                      {t.detail && <div style={{ fontSize: 12.5, color: "#7A6E5A", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.detail}</div>}
                    </div>
                    <div className="tx-account">{t.account}</div>
                    <div className="tx-amount" style={{ color: t.type === "pemasukan" ? "#2C5A42" : "#9A3B2F" }}>
                      {t.type === "pemasukan" ? "+" : "−"} {rupiah(t.amount)}
                    </div>
                    <div style={{ display: "flex", gap: 4 }}>
                      <button onClick={() => handleEdit(t)} className="icon-btn-ghost" aria-label="Ubah"><Pencil size={14} /></button>
                      <button onClick={() => handleDelete(t.id)} className="icon-btn-ghost" aria-label="Hapus"><Trash2 size={14} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="footer">
            {scopeTx.length > 0 && (
              <button onClick={handleResetScope} className="reset-link">
                Hapus semua data {SCOPE_META[activeScope].shortLabel.toLowerCase()}
              </button>
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

// Inisialisasi React DOM[cite: 1]
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<FinanceApp />);
