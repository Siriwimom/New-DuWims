"use client";

export default function LoginPage() {
  const fakeLogin = () => {
    try {
      window.localStorage.setItem("AUTH_TOKEN_V1", "demo-token");
    } catch {}
    window.location.href = "/";
  };

  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "linear-gradient(135deg,#eef7f3,#f7fbff)" }}>
      <div style={{ width: "min(420px,92vw)", background: "#fff", borderRadius: 24, padding: 28, boxShadow: "0 20px 50px rgba(15,23,42,.12)" }}>
        <div style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>เข้าสู่ระบบ DUWIMS</div>
        <div style={{ color: "#64748b", marginBottom: 18 }}>หน้านี้เป็นตัวอย่าง route /login สำหรับเชื่อมกับปุ่มใน topbar</div>
        <div style={{ display: "grid", gap: 12 }}>
          <input placeholder="อีเมล" style={inputStyle} />
          <input placeholder="รหัสผ่าน" type="password" style={inputStyle} />
          <button onClick={fakeLogin} style={primaryBtn}>เข้าสู่ระบบ</button>
        </div>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  height: 44,
  borderRadius: 12,
  border: "1px solid #cbd5e1",
  padding: "0 14px",
  outline: "none",
};

const primaryBtn = {
  height: 44,
  border: "none",
  borderRadius: 12,
  background: "linear-gradient(135deg,#22c55e,#16a34a)",
  color: "#fff",
  fontWeight: 700,
  cursor: "pointer",
};
