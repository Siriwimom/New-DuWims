"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";

export default function LoginPage() {
  const [screen, setScreen] = useState("login");

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [nickname, setNickname] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [pendingOtpEmail, setPendingOtpEmail] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const [modal, setModal] = useState(null);
  const [resetAllowed, setResetAllowed] = useState(false);

  const [sessionUser, setSessionUser] = useState(null);
  const [sessionChecking, setSessionChecking] = useState(true);
  const [signupIsOwner, setSignupIsOwner] = useState(false);

  const TOKEN_KEYS = ["AUTH_TOKEN_V1", "token"];

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:3001";

  function getToken() {
    if (typeof window === "undefined") return null;
    for (const key of TOKEN_KEYS) {
      const value = window.localStorage.getItem(key);
      if (value) return value;
    }
    return null;
  }

  function saveToken(token) {
    if (typeof window === "undefined" || !token) return;
    TOKEN_KEYS.forEach((key) => window.localStorage.setItem(key, token));
  }

  function clearToken() {
    if (typeof window === "undefined") return;
    TOKEN_KEYS.forEach((key) => window.localStorage.removeItem(key));
  }

  function isValidEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function isValidPassword(value) {
    return String(value || "").length >= 6;
  }

  function resetSensitiveForm() {
    setPw("");
    setPw2("");
    setOtp(["", "", "", "", "", ""]);
    setErr("");
  }

  const title = useMemo(() => {
    if (screen === "login") return "Login";
    if (screen === "signup") return "Sign up";
    if (screen === "forgot") return "Reset Your Password";
    if (screen === "otp") return "Enter OTP";
    if (screen === "reset") return "Set a Password";
    return "Login";
  }, [screen]);

  async function api(path, { method = "GET", body, token } = {}) {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const message = data?.error
        ? `${data.message || "Error"}: ${data.error}`
        : data?.message || `HTTP ${res.status}`;
      const error = new Error(message);
      error.status = res.status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  async function run(fn) {
    try {
      setErr("");
      setLoading(true);
      await fn();
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function goTo(nextScreen) {
    setScreen(nextScreen);
    setErr("");
    resetSensitiveForm();

    if (nextScreen !== "otp") {
      setResetAllowed(false);
    }
  }

  async function handleLogin() {
    await run(async () => {
      const safeEmail = email.trim().toLowerCase();

      if (!isValidEmail(safeEmail)) throw new Error("Invalid email");
      if (!pw) throw new Error("Enter password");

      const data = await api("/auth/login", {
        method: "POST",
        body: {
          email: safeEmail,
          password: pw,
        },
      });

      if (!data?.token) throw new Error("Login success but token is missing");

      saveToken(data.token);
      setSessionUser(data.user || null);

      window.location.href = "/";
    });
  }

  async function handleSignup() {
    await run(async () => {
      const safeEmail = email.trim().toLowerCase();
      const safeNickname = nickname.trim();

      if (!isValidEmail(safeEmail)) throw new Error("Invalid email");
      if (!safeNickname) throw new Error("กรุณากรอกชื่อนามสกุล");
      if (!isValidPassword(pw)) {
        throw new Error("Password must be at least 6 characters");
      }
      if (pw !== pw2) throw new Error("Password not match");

      const data = await api("/auth/register", {
        method: "POST",
        body: {
          email: safeEmail,
          password: pw,
          nickname: safeNickname,
          role: signupIsOwner ? "owner" : "employee",
        },
      });

      if (!data?.token) throw new Error("Signup success but token is missing");

      saveToken(data.token);
      setSessionUser(data.user || null);

      window.location.href = "/";
    });
  }

  function handleLogout() {
    clearToken();
    setSessionUser(null);
    setEmail("");
    setPw("");
    setPw2("");
    setNickname("");
    setPendingOtpEmail("");
    setOtp(["", "", "", "", "", ""]);
    setResetAllowed(false);
    setErr("");
    setScreen("login");

    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("token");
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.pathname);
    }
  }

  function handleGoogleSignIn() {
    setErr("");
    window.location.href = `${API_BASE}/auth/google/start`;
  }

  async function handleSendOtp() {
    await run(async () => {
      const safeEmail = email.trim().toLowerCase();
      if (!isValidEmail(safeEmail)) throw new Error("Invalid email");

      await api("/auth/forgot-password/send-otp", {
        method: "POST",
        body: { email: safeEmail },
      });

      setPendingOtpEmail(safeEmail);
      setOtp(["", "", "", "", "", ""]);
      setResetAllowed(false);
      setScreen("otp");
      setErr("OTP has been sent to your email");
    });
  }

  function setOtpAt(index, value) {
    if (!/^\d?$/.test(value)) return;

    const next = [...otp];
    next[index] = value;
    setOtp(next);

    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, event) {
    if (event.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowLeft" && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
    if (event.key === "ArrowRight" && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  async function handleVerifyOtp() {
    await run(async () => {
      const safeEmail = (pendingOtpEmail || email || "").trim().toLowerCase();
      const code = otp.join("");

      if (!isValidEmail(safeEmail)) throw new Error("Invalid email");
      if (code.length !== 6) throw new Error("Enter 6 digits OTP");

      await api("/auth/forgot-password/verify-otp", {
        method: "POST",
        body: { email: safeEmail, code },
      });

      setResetAllowed(true);
      setPw("");
      setPw2("");
      setErr("");
      setScreen("reset");
    });
  }

  async function handleResetPassword() {
    await run(async () => {
      const safeEmail = (pendingOtpEmail || email || "").trim().toLowerCase();

      if (!resetAllowed) throw new Error("Reset not allowed. Verify OTP first.");
      if (!isValidEmail(safeEmail)) throw new Error("Invalid email");
      if (!isValidPassword(pw)) {
        throw new Error("Password must be at least 6 characters");
      }
      if (pw !== pw2) throw new Error("Password not match");

      await api("/auth/forgot-password/reset", {
        method: "POST",
        body: {
          email: safeEmail,
          newPassword: pw,
        },
      });

      setResetAllowed(false);

      setModal({
        title: "Password Updated Successfully",
        desc: "Password changed successfully. Please login again.",
        buttonText: "Back to Login",
        onClose: () => {
          setModal(null);
          setEmail("");
          setPw("");
          setPw2("");
          setPendingOtpEmail("");
          setOtp(["", "", "", "", "", ""]);
          setScreen("login");
          setErr("");
        },
      });
    });
  }

  function handleKeySubmit(event, action) {
    if (event.key === "Enter") {
      action();
    }
  }

  useEffect(() => {
    let mounted = true;

    async function bootstrapSession() {
      try {
        const url = new URL(window.location.href);
        const tokenFromUrl = url.searchParams.get("token");
        const errorFromUrl = url.searchParams.get("error");

        if (errorFromUrl) {
          if (!mounted) return;
          setErr(errorFromUrl);

          url.searchParams.delete("token");
          url.searchParams.delete("error");
          window.history.replaceState({}, "", url.pathname);

          setSessionChecking(false);
          return;
        }

        if (tokenFromUrl) {
          saveToken(tokenFromUrl);

          url.searchParams.delete("token");
          url.searchParams.delete("error");
          window.history.replaceState({}, "", url.pathname);

          try {
            const me = await api("/auth/me", { token: tokenFromUrl });

            if (!mounted) return;
            setSessionUser(me.user || null);
            setSessionChecking(false);
            window.location.href = "/";
            return;
          } catch (e) {
            clearToken();
            if (!mounted) return;
            setSessionUser(null);
            setErr(e?.message || "Google login failed");
            setSessionChecking(false);
            return;
          }
        }

        const savedToken = getToken();

        if (!savedToken) {
          if (!mounted) return;
          setSessionUser(null);
          setSessionChecking(false);
          return;
        }

        try {
          const me = await api("/auth/me", { token: savedToken });
          if (!mounted) return;
          setSessionUser(me.user || null);
        } catch (e) {
          clearToken();
          if (!mounted) return;
          setSessionUser(null);
        } finally {
          if (mounted) setSessionChecking(false);
        }
      } catch (e) {
        clearToken();
        if (!mounted) return;
        setSessionUser(null);
        setSessionChecking(false);
      }
    }

    bootstrapSession();

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="page">
      <style>{css}</style>

      <div className="panel">
        <div className="sessionBar">
          {sessionChecking ? (
            <span className="muted">Checking session...</span>
          ) : sessionUser ? (
            <>
              <div className="sessionLeft">
                <div className="sessionName">
                  {sessionUser.nickname || sessionUser.name || "No username"}
                </div>
                <div className="sessionSub">{sessionUser.email || "-"}</div>
                <div className="sessionRole">{sessionUser.role || "-"}</div>
              </div>
              <button className="btn ghostBtn" onClick={handleLogout} disabled={loading}>
                Logout
              </button>
            </>
          ) : (
            <span className="muted">Not logged in</span>
          )}
        </div>

        <h1>{title}</h1>

        {err && <div className="err">{err}</div>}

        {screen === "login" && (
          <>
            <div className="label">Email</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleLogin)}
              autoComplete="email"
            />

            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleLogin)}
              autoComplete="current-password"
            />

            <button className="btn blueBtn" onClick={handleLogin} disabled={loading}>
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="row">
              <button className="linkBtn" onClick={() => goTo("signup")}>
                Create Account
              </button>
              <button className="linkBtn" onClick={() => goTo("forgot")}>
                Forgot Password?
              </button>
            </div>

            <div className="hr">
              <span>OR</span>
            </div>

            <button className="btn googleBtn" onClick={handleGoogleSignIn} disabled={loading}>
              <span className="gIcon">G</span>
              <span>Sign in with Google</span>
            </button>
          </>
        )}

        {screen === "signup" && (
          <>
            <div className="label">ชื่อนามสกุล</div>
            <input
              className="input"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="ชื่อ นามสกุล"
              onKeyDown={(e) => handleKeySubmit(e, handleSignup)}
            />

            <div className="label">Email</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleSignup)}
              autoComplete="email"
            />

            <div className="label">Password</div>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleSignup)}
              autoComplete="new-password"
            />

            <div className="label">Password Confirm</div>
            <input
              className="input"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleSignup)}
              autoComplete="new-password"
            />

            <div className="checkboxRow">
              <label className="check">
                <input
                  type="checkbox"
                  checked={signupIsOwner}
                  onChange={(e) => setSignupIsOwner(e.target.checked)}
                />
                <span>สมัครเป็น Owner (ถ้าไม่ติ๊กจะเป็นพนักงาน)</span>
              </label>
            </div>

            <button className="btn blueBtn" onClick={handleSignup} disabled={loading}>
              {loading ? "Loading..." : "Sign up"}
            </button>

            <div className="hr">
              <span>OR</span>
            </div>

            <button className="btn googleBtn" onClick={handleGoogleSignIn} disabled={loading}>
              <span className="gIcon">G</span>
              <span>Sign up with Google</span>
            </button>

            <div className="row centerRow">
              <button className="linkBtn" onClick={() => goTo("login")}>
                Back to Login
              </button>
            </div>
          </>
        )}

        {screen === "forgot" && (
          <>
            <div className="label">Email Address</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleSendOtp)}
              autoComplete="email"
            />

            <button className="btn blueBtn" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending..." : "Reset Password"}
            </button>

            <div className="row centerRow">
              <button className="linkBtn" onClick={() => goTo("login")}>
                Back
              </button>
            </div>
          </>
        )}

        {screen === "otp" && (
          <>
            <div className="otpHint">Enter your 6 digit OTP code</div>

            <div className="otpRow">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  className="otpBox"
                  value={digit}
                  onChange={(e) => setOtpAt(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  ref={(el) => (otpRefs.current[index] = el)}
                  inputMode="numeric"
                  maxLength={1}
                />
              ))}
            </div>

            <button className="btn blueBtn" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="row">
              <button className="linkBtn" onClick={handleSendOtp} disabled={loading}>
                Resend
              </button>
              <button className="linkBtn" onClick={() => goTo("login")}>
                Back
              </button>
            </div>
          </>
        )}

        {screen === "reset" && (
          <>
            <div className="label">Create Password</div>
            <input
              className="input"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleResetPassword)}
              autoComplete="new-password"
            />

            <div className="label">Confirm Password</div>
            <input
              className="input"
              type="password"
              value={pw2}
              onChange={(e) => setPw2(e.target.value)}
              onKeyDown={(e) => handleKeySubmit(e, handleResetPassword)}
              autoComplete="new-password"
            />

            <button className="btn blueBtn" onClick={handleResetPassword} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}

        {modal && (
          <div className="modalOverlay">
            <div className="modal">
              <div className="checkWrap">
                <div className="checkInner">✓</div>
              </div>

              <div className="modalTitle">{modal.title}</div>
              <div className="modalDesc">{modal.desc}</div>

              <button className="btn solidBtn" style={{ marginTop: 16 }} onClick={modal.onClose}>
                {modal.buttonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const css = `
:root{
  --bg1:#8ad67b;
  --bg2:#2fb356;
  --blue:#0a66ff;
  --text:#ffffff;
}

*{ box-sizing:border-box; }
html,body{ margin:0; padding:0; min-height:100%; font-family: Arial, Helvetica, sans-serif; }

.page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:24px 16px;
  background: linear-gradient(180deg, var(--bg1), var(--bg2));
}

.panel{
  width:min(760px, 94vw);
  text-align:center;
}

.sessionBar{
  width:min(604px, 94vw);
  margin:0 auto 22px;
  min-height:38px;
  border-radius:20px;
  background:rgba(255,255,255,.15);
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  padding:8px 14px;
}

.sessionLeft{
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:2px;
}

.sessionName{
  color:#fff;
  font-weight:800;
  font-size:14px;
}

.sessionSub,.sessionRole,.muted{
  color:rgba(255,255,255,.85);
  font-size:12px;
  font-weight:700;
}

h1{
  margin:0 0 20px;
  color:#fff;
  font-size:64px;
  font-weight:900;
  line-height:1;
}

.err{
  width:min(604px, 94vw);
  margin:0 auto 12px;
  border-radius:14px;
  background:rgba(255,255,255,.72);
  color:#8b1111;
  text-align:left;
  padding:10px 12px;
  font-weight:900;
  font-size:16px;
}

.label{
  width:min(604px, 94vw);
  margin:0 auto 6px;
  text-align:left;
  color:rgba(255,255,255,.78);
  font-size:12px;
  font-weight:700;
}

.input{
  width:min(604px, 94vw);
  height:46px;
  margin:0 auto 18px;
  display:block;
  border-radius:23px;
  border:2px solid rgba(94,94,120,.9);
  background:#dfe7f3;
  outline:none;
  padding:0 16px;
  font-size:16px;
  font-weight:700;
  color:#111;
}

.btn{
  width:min(604px, 94vw);
  height:46px;
  margin:0 auto 14px;
  display:flex;
  align-items:center;
  justify-content:center;
  border-radius:23px;
  font-size:16px;
  font-weight:900;
  cursor:pointer;
}

.blueBtn{
  border:2px solid #0a66ff;
  background:transparent;
  color:#fff;
}

.googleBtn{
  border:2px solid rgba(94,94,120,.7);
  background:#ffffff;
  color:#1e1e1e;
  gap:10px;
}

.ghostBtn{
  width:auto;
  min-width:90px;
  height:34px;
  margin:0;
  border:1px solid rgba(255,255,255,.35);
  background:rgba(255,255,255,.12);
  color:#fff;
  padding:0 14px;
}

.solidBtn{
  border:0;
  background:#22c55e;
  color:#fff;
}

.row{
  width:min(604px, 94vw);
  margin:0 auto 18px;
  display:flex;
  justify-content:space-between;
  align-items:center;
}

.centerRow{
  justify-content:center;
}

.linkBtn{
  border:0;
  background:transparent;
  padding:0;
  cursor:pointer;
  color:#0a42ff;
  font-size:16px;
  font-weight:900;
}

.hr{
  width:min(604px, 94vw);
  margin:8px auto 16px;
  display:flex;
  align-items:center;
  gap:12px;
  color:rgba(255,255,255,.85);
  font-size:12px;
  font-weight:900;
}

.hr::before,.hr::after{
  content:"";
  flex:1;
  height:1px;
  background:rgba(255,255,255,.35);
}

.gIcon{
  width:18px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
}

.checkboxRow{
  width:min(604px, 94vw);
  margin:0 auto 14px;
  text-align:left;
}

.check{
  display:flex;
  align-items:center;
  gap:10px;
  color:#fff;
  font-size:13px;
  font-weight:700;
}

.otpHint{
  width:min(604px, 94vw);
  margin:0 auto 12px;
  color:rgba(255,255,255,.88);
  font-size:13px;
  font-weight:700;
}

.otpRow{
  display:flex;
  justify-content:center;
  gap:8px;
  margin:8px 0 18px;
}

.otpBox{
  width:42px;
  height:42px;
  border:0;
  border-radius:10px;
  outline:none;
  text-align:center;
  font-size:18px;
  font-weight:900;
  background:#fff;
}

.modalOverlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.18);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
}

.modal{
  width:min(440px, 92vw);
  background:#fff;
  border-radius:18px;
  padding:24px;
  text-align:center;
  box-shadow:0 20px 50px rgba(0,0,0,.2);
}

.checkWrap{
  width:78px;
  height:78px;
  margin:0 auto 12px;
  border-radius:999px;
  background:rgba(34,197,94,.18);
  display:flex;
  align-items:center;
  justify-content:center;
}

.checkInner{
  width:54px;
  height:54px;
  border-radius:999px;
  background:#22c55e;
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:22px;
  font-weight:900;
}

.modalTitle{
  font-size:18px;
  font-weight:900;
}

.modalDesc{
  margin-top:8px;
  font-size:13px;
  color:#666;
}
`;