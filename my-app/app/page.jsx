"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function GoogleIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.655 32.657 29.233 36 24 36c-6.627 0-12-5.373-12-12S17.373 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.277 4 24 4c-7.682 0-14.347 4.337-17.694 10.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.176 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.212 0-9.62-3.318-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.05 12.05 0 0 1-4.084 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

export default function App() {
  const router = useRouter();

  const [screen, setScreen] = useState("login");

  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef([]);

  const [pendingOtpEmail, setPendingOtpEmail] = useState("");
  const [pendingVerifyEmail, setPendingVerifyEmail] = useState("");

  const [err, setErr] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecking, setSessionChecking] = useState(true);

  const [modal, setModal] = useState(null);
  const [resetAllowed, setResetAllowed] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const [sessionUser, setSessionUser] = useState(null);
  const [signupIsOwner, setSignupIsOwner] = useState(false);
  const [ownerUidInput, setOwnerUidInput] = useState("");

  const TOKEN_KEYS_TO_SAVE = ["AUTH_TOKEN_V1", "token", "authToken", "duwims_token"];

  const API_BASE =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE ||
    "http://localhost:3001";

  function getToken() {
    if (typeof window === "undefined") return null;
    for (const k of TOKEN_KEYS_TO_SAVE) {
      const localValue = window.localStorage.getItem(k);
      if (localValue) return localValue;
      const sessionValue = window.sessionStorage.getItem(k);
      if (sessionValue) return sessionValue;
    }
    return null;
  }

  function saveToken(token) {
    if (typeof window === "undefined" || !token) return false;
    let saved = false;

    for (const k of TOKEN_KEYS_TO_SAVE) {
      try {
        window.localStorage.setItem(k, token);
        saved = true;
      } catch {}

      try {
        window.sessionStorage.setItem(k, token);
        saved = true;
      } catch {}
    }

    return saved;
  }

  function clearToken() {
    if (typeof window === "undefined") return;
    for (const k of TOKEN_KEYS_TO_SAVE) {
      try {
        window.localStorage.removeItem(k);
      } catch {}
      try {
        window.sessionStorage.removeItem(k);
      } catch {}
    }
  }

  function decodeJwtPayload(token) {
    try {
      const base64Url = String(token || "").split(".")[1] || "";
      if (!base64Url) return null;
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
      const json = window.atob(padded);
      return JSON.parse(json);
    } catch {
      return null;
    }
  }

  function buildSessionUser(user, token) {
    const payload = decodeJwtPayload(token) || {};
    return {
      id: user?.id || payload?.id || "",
      email: user?.email || payload?.email || "",
      nickname: user?.nickname || payload?.nickname || "",
      role: user?.role || payload?.role || "",
      provider: user?.provider || payload?.provider || "local",
      ownerUid: user?.ownerUid ?? payload?.ownerUid ?? "",
      ownerRef: user?.ownerRef ?? payload?.ownerRef ?? "",
      isEmailVerified:
        user?.isEmailVerified !== undefined ? !!user.isEmailVerified : true,
    };
  }

  function isEmployeeWithoutOwner(user) {
    return (
      String(user?.role || "").toLowerCase() === "employee" &&
      !String(user?.ownerRef || "").trim()
    );
  }

  function goToDashboard() {
  setTimeout(() => {
    window.location.replace("/dashboard");
  }, 250);
}

  function finishLoginFlow(user) {
    setSessionUser(user || null);

    if (isEmployeeWithoutOwner(user)) {
      setOwnerUidInput("");
      setScreen("linkOwner");
      setInfo("Please verify the orchard owner before accessing the system.");
      return;
    }

    goToDashboard();
  }

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(v || "").trim());
  }

  function getPasswordChecks(v) {
    const s = String(v || "");
    return {
      length: s.length >= 8,
      upper: /[A-Z]/.test(s),
      lower: /[a-z]/.test(s),
      number: /\d/.test(s),
    };
  }

  function isValidPassword(v) {
    const c = getPasswordChecks(v);
    return c.length && c.upper && c.lower && c.number;
  }

  function resetFormSensitive() {
    setPw("");
    setPw2("");
    setOtp(["", "", "", "", "", ""]);
    setErr("");
    setInfo("");
    setShowPassword(false);
    setShowPassword2(false);
  }

  const title = useMemo(() => {
    if (screen === "login") return "Login";
    if (screen === "signup") return "Create your account";
    if (screen === "verifySignup") return "Verify your email";
    if (screen === "forgot") return "Reset Your Password";
    if (screen === "otp") return "Verify OTP";
    if (screen === "reset") return "Set a New Password";
    if (screen === "linkOwner") return "Orchard Owner Verification";
    return "";
  }, [screen]);

  const passwordChecks = useMemo(() => getPasswordChecks(pw), [pw]);

  async function run(fn) {
    try {
      setErr("");
      setInfo("");
      setLoading(true);
      await fn();
    } catch (e) {
      setErr(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

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
      const msg = data?.error
        ? `${data.message || "Error"}: ${data.error}`
        : data?.message || `HTTP ${res.status}`;
      const error = new Error(msg);
      error.status = res.status;
      error.payload = data;
      throw error;
    }

    return data;
  }

  function onGo(to) {
    setScreen(to);
    resetFormSensitive();
    if (to !== "otp") setResetAllowed(false);
  }

  async function handleLogin() {
    await run(async () => {
      const emailN = email.trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");
      if (!pw) throw new Error("Enter password");

      const data = await api("/auth/login", {
        method: "POST",
        body: { email: emailN, password: pw },
      });

      const token =
        data?.token ||
        data?.accessToken ||
        data?.jwt ||
        data?.data?.token ||
        "";

      if (!token) {
        throw new Error("Login success but token is missing");
      }

      if (!saveToken(token) || !getToken()) {
        throw new Error("Login success but token could not be saved");
      }

      const nextUser = buildSessionUser(data?.user || null, token);
      finishLoginFlow(nextUser);
    });
  }

  async function handleSignup() {
    await run(async () => {
      const emailN = email.trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      if (!isValidPassword(pw)) {
        throw new Error(
          "Password must be at least 8 characters and include uppercase, lowercase, and number"
        );
      }

      if (pw !== pw2) throw new Error("Password not match");

      await api("/auth/register", {
        method: "POST",
        body: {
          email: emailN,
          password: pw,
          role: signupIsOwner ? "owner" : "employee",
        },
      });


      setPendingVerifyEmail(emailN);
      setOtp(["", "", "", "", "", ""]);
      setScreen("verifySignup");
      setInfo("เราได้ส่งรหัสยืนยันอีเมล 6 หลักไปที่อีเมลของคุณแล้ว");
    });
  }

  async function handleVerifySignupEmail() {
    await run(async () => {
      const emailN = (pendingVerifyEmail || email || "").trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      const code = otp.join("");
      if (code.length !== 6) throw new Error("Enter 6 digits verification code");

      await api("/auth/verify-email", {
        method: "POST",
        body: { email: emailN, code },
      });

      setModal({
        title: "Email verified successfully",
        desc: "ยืนยันอีเมลเรียบร้อยแล้ว ตอนนี้คุณสามารถเข้าสู่ระบบได้",
        buttonText: "Go to Login",
        onClose: () => {
          setModal(null);
          setPw("");
          setPw2("");
          setOtp(["", "", "", "", "", ""]);
          setScreen("login");
          setInfo("Email verified. Please login.");
          setErr("");
        },
      });
    });
  }

  async function handleResendSignupVerification() {
    await run(async () => {
      const emailN = (pendingVerifyEmail || email || "").trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      await api("/auth/send-email-verification", {
        method: "POST",
        body: { email: emailN },
      });

      setInfo("ส่งรหัสยืนยันใหม่ไปที่อีเมลแล้ว");
    });
  }

  function logout() {
  clearToken();
  setSessionUser(null);
  setEmail("");
  setPw("");
  setPw2("");
  setScreen("login");

  if (typeof window !== "undefined") {
    window.location.replace("http://localhost:3000/");
  }
}

  function handleGoogleSignIn(roleOverride = null) {
    setErr("");
    setInfo("");

    const finalRole = roleOverride || (signupIsOwner ? "owner" : "employee");
    const params = new URLSearchParams();
    params.set("role", finalRole);

    window.location.href = `${API_BASE}/auth/google/start?${params.toString()}`;
  }

  async function handleLinkOwner() {
    await run(async () => {
      const token = getToken();
      if (!token) throw new Error("Session expired. Please login again.");

      const safeOwnerUid = ownerUidInput.trim();
      if (!safeOwnerUid) throw new Error("Please provide the orchard code");

      const data = await api("/auth/link-owner", {
        method: "POST",
        token,
        body: { ownerUid: safeOwnerUid },
      });

      const nextToken =
        data?.token ||
        data?.accessToken ||
        data?.jwt ||
        data?.data?.token ||
        token;

      saveToken(nextToken);

      const nextUser = buildSessionUser(data?.user || sessionUser || null, nextToken);
      setInfo("เชื่อมสำเร็จ");
      finishLoginFlow(nextUser);
    });
  }

  async function handleSendOtp() {
    await run(async () => {
      const emailN = email.trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      await api("/auth/forgot-password/send-otp", {
        method: "POST",
        body: { email: emailN },
      });

      setPendingOtpEmail(emailN);
      setScreen("otp");
      setOtp(["", "", "", "", "", ""]);
      setResetAllowed(false);

      setInfo("OTP has been sent to your email (check inbox/spam).");
    });
  }

  function setOtpAt(i, v) {
    if (!/^\d?$/.test(v)) return;
    const next = [...otp];
    next[i] = v;
    setOtp(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  }

  async function handleVerifyOtp() {
    await run(async () => {
      const emailN = (pendingOtpEmail || "").trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      const code = otp.join("");
      if (code.length !== 6) throw new Error("Enter 6 digits OTP");

      await api("/auth/forgot-password/verify-otp", {
        method: "POST",
        body: { email: emailN, code },
      });

      setResetAllowed(true);
      setScreen("reset");
      setPw("");
      setPw2("");
      setErr("");
      setInfo("OTP verified. Set your new password.");
    });
  }

  async function handleResetPassword() {
    await run(async () => {
      if (!resetAllowed) throw new Error("Reset not allowed. Verify OTP first.");

      const emailN = (pendingOtpEmail || email || "").trim().toLowerCase();
      if (!isValidEmail(emailN)) throw new Error("Invalid email");

      if (!isValidPassword(pw)) {
        throw new Error(
          "Password must be at least 8 characters and include uppercase, lowercase, and number"
        );
      }

      if (pw !== pw2) throw new Error("Password not match");

      await api("/auth/forgot-password/reset", {
        method: "POST",
        body: { email: emailN, code: otp.join(""), newPassword: pw },
      });

      setResetAllowed(false);

      setModal({
        title: "Password updated successfully",
        desc: "Password changed successfully, you can login again with new password",
        buttonText: "Back to Login",
        onClose: () => {
          setModal(null);
          setEmail("");
          setPendingOtpEmail("");
          resetFormSensitive();
          setScreen("login");
        },
      });
    });
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
        const saved = saveToken(tokenFromUrl);
        if (!saved) throw new Error("Google login success but token could not be saved");

        url.searchParams.delete("token");
        url.searchParams.delete("error");
        window.history.replaceState({}, "", url.pathname);
      }

      const activeToken = tokenFromUrl || getToken();

      if (!activeToken) {
        if (!mounted) return;
        setSessionUser(null);
        setSessionChecking(false);
        return;
      }

      const me = await api("/auth/me", { token: activeToken });
      const nextUser = buildSessionUser(me?.user || null, activeToken);

      if (!mounted) return;
      setSessionUser(nextUser);
      setSessionChecking(false);

      if (isEmployeeWithoutOwner(nextUser)) {
        setOwnerUidInput("");
        setScreen("linkOwner");
        setInfo("Please verify the orchard owner before accessing the system.");
        return;
      }

      window.location.replace("/dashboard");
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
        <div className="brandWrap">
          <div className="brandText">DOEMS</div>
          <div className="brandSub">(Durian Orchard Environmental Monitoring System)</div>
        </div>

        <h1>{title}</h1>

        {err && <div className="err">{err}</div>}
        {info && <div className="info">{info}</div>}
        {sessionChecking && <div className="info">กำลังตรวจสอบ session...</div>}

        {screen === "login" && (
          <>
            <div className="label">Email</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />

            <div className="label">Password</div>
            <div className="pwWrap">
              <input
                className="input withToggle"
                type={showPassword ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
              <button
                type="button"
                className="pwToggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <button className="btn blue" onClick={handleLogin} disabled={loading || sessionChecking}>
              {loading ? "Loading..." : "Login"}
            </button>

            <div className="row">
              <button className="linkBtn" onClick={() => onGo("signup")}>
                Create Account
              </button>
              <button className="linkBtn" onClick={() => onGo("forgot")}>
                Forget Password ?
              </button>
            </div>

            <div className="hr">
              <span>OR</span>
            </div>

            <button
              className="btn googleBtn"
              onClick={() => handleGoogleSignIn()}
              disabled={loading || sessionChecking}
            >
              <span className="gIcon"><GoogleIcon /></span>
              <span>Sign in with Google</span>
            </button>

            <div className="small">Use your verified email address to continue.</div>
          </>
        )}

        {screen === "signup" && (
          <>
            <div className="label">Email</div>
            <input
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />

            <div className="label">Password</div>
            <div className="pwWrap">
              <input
                className="input withToggle"
                type={showPassword ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="Create password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwToggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="passwordHelp">
              <div className={passwordChecks.length ? "ok" : ""}>• อย่างน้อย 8 ตัวอักษร</div>
              <div className={passwordChecks.upper ? "ok" : ""}>• มีตัวพิมพ์ใหญ่ (A-Z)</div>
              <div className={passwordChecks.lower ? "ok" : ""}>• มีตัวพิมพ์เล็ก (a-z)</div>
              <div className={passwordChecks.number ? "ok" : ""}>• มีตัวเลข (0-9)</div>
            </div>

            <div className="label">Confirm Password</div>
            <div className="pwWrap">
              <input
                className="input withToggle"
                type={showPassword2 ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Confirm password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwToggle"
                onClick={() => setShowPassword2((v) => !v)}
              >
                {showPassword2 ? "Hide" : "Show"}
              </button>
            </div>

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

            <button className="btn blue" onClick={handleSignup} disabled={loading}>
              {loading ? "Loading..." : "Sign up"}
            </button>

            <div className="hr">
              <span>OR</span>
            </div>

            <button className="btn googleBtn" onClick={() => handleGoogleSignIn()} disabled={loading}>
              <span className="gIcon"><GoogleIcon /></span>
              <span>Sign up with Google</span>
            </button>

            <div className="small">หลังสมัคร ระบบจะส่งอีเมลให้ยืนยันก่อนเข้าใช้งาน</div>

            <div className="row" style={{ justifyContent: "center" }}>
              <button className="linkBtn" onClick={() => onGo("login")}>
                Back to Login
              </button>
            </div>
          </>
        )}

        {screen === "verifySignup" && (
          <>
            <div className="otpHint">
              ใส่รหัสยืนยัน 6 หลักที่ส่งไปยังอีเมล
              <br />
              <strong>{pendingVerifyEmail || email}</strong>
            </div>

            <div className="otpRow">
              {otp.map((d, i) => (
                <input
                  key={i}
                  className="otpBox"
                  value={d}
                  onChange={(e) => setOtpAt(i, e.target.value)}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  inputMode="numeric"
                  maxLength={1}
                />
              ))}
            </div>

            <button className="btn blue" onClick={handleVerifySignupEmail} disabled={loading}>
              {loading ? "Verifying..." : "Verify Email"}
            </button>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="linkBtn" onClick={handleResendSignupVerification} disabled={loading}>
                Resend code
              </button>
              <button className="linkBtn" onClick={() => onGo("login")}>
                Back
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
              placeholder="Enter your email"
              autoComplete="email"
            />

            <button className="btn blue" onClick={handleSendOtp} disabled={loading}>
              {loading ? "Sending..." : "Reset Password"}
            </button>

            <div className="row">
              <button className="linkBtn" onClick={() => onGo("login")}>
                Back
              </button>
              <span />
            </div>
          </>
        )}

        {screen === "linkOwner" && (
          <>
            <div className="otpHint">
              Employees must connect to an orchard owner before using the system.
              <br />
              <strong>Link to Orchard Owner</strong>
            </div>

            <div className="label">Orchard code</div>
            <input
              className="input"
              value={ownerUidInput}
              onChange={(e) => setOwnerUidInput(e.target.value.toUpperCase())}
              placeholder="เช่น DW-AB12CD34"
              autoComplete="off"
            />

            <button className="btn blue" onClick={handleLinkOwner} disabled={loading}>
              {loading ? "กำลังเชื่อม..." : "Confirm Orchard Owner"}
            </button>

            <div className="small">Once connected successfully, you will be automatically redirected to the dashboard.</div>

            <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
              <button className="linkBtn" onClick={logout}>
                Logout
              </button>
            </div>
          </>
        )}

        {screen === "otp" && (
          <>
            <div className="otpHint">Enter your 6 digit OTP code in order to reset password.</div>

            <div className="otpRow">
              {otp.map((d, i) => (
                <input
                  key={i}
                  className="otpBox"
                  value={d}
                  onChange={(e) => setOtpAt(i, e.target.value)}
                  ref={(el) => {
                    otpRefs.current[i] = el;
                  }}
                  inputMode="numeric"
                  maxLength={1}
                />
              ))}
            </div>

            <button className="btn blue" onClick={handleVerifyOtp} disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>

            <div className="small">Didn't receive the code?</div>

            <div className="row" style={{ marginTop: 10 }}>
              <button className="linkBtn" onClick={handleSendOtp} disabled={loading}>
                Resend
              </button>
              <button className="linkBtn" onClick={() => onGo("login")}>
                Back
              </button>
            </div>
          </>
        )}

        {screen === "reset" && (
          <>
            <div className="label">Create Password</div>
            <div className="pwWrap">
              <input
                className="input withToggle"
                type={showPassword ? "text" : "password"}
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                placeholder="New password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwToggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>

            <div className="passwordHelp">
              <div className={passwordChecks.length ? "ok" : ""}>• อย่างน้อย 8 ตัวอักษร</div>
              <div className={passwordChecks.upper ? "ok" : ""}>• มีตัวพิมพ์ใหญ่ (A-Z)</div>
              <div className={passwordChecks.lower ? "ok" : ""}>• มีตัวพิมพ์เล็ก (a-z)</div>
              <div className={passwordChecks.number ? "ok" : ""}>• มีตัวเลข (0-9)</div>
            </div>

            <div className="label">Confirm Password</div>
            <div className="pwWrap">
              <input
                className="input withToggle"
                type={showPassword2 ? "text" : "password"}
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                placeholder="Confirm new password"
                autoComplete="new-password"
              />
              <button
                type="button"
                className="pwToggle"
                onClick={() => setShowPassword2((v) => !v)}
              >
                {showPassword2 ? "Hide" : "Show"}
              </button>
            </div>

            <button className="btn blue" onClick={handleResetPassword} disabled={loading}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </>
        )}

        {modal && (
          <div className="modalOverlay" onMouseDown={() => {}}>
            <div className="modal">
              <div className="checkWrap">
                <div className="checkInner">✓</div>
              </div>

              <div className="modalTitle">{modal.title}</div>
              <div className="modalDesc">{modal.desc}</div>

              <button className="btn solid" style={{ marginTop: 16 ,width: "min(320px, 78vw)"  }} onClick={modal.onClose}>
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
  --bg1:#baff9f;
  --bg2:#159a44;
  --blue:#0a66ff;
  --green:#22c55e;
}
*{ box-sizing:border-box; }
html,body{ height:100%; margin:0; font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial; }

.page{
  min-height:100vh;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:28px 16px;
  background: linear-gradient(135deg, var(--bg1), var(--bg2));
}
.panel{
  width:min(720px, 94vw);
  text-align:center;
}

.brandWrap{
  margin:0 0 20px;
  text-align:center;
}
.brandText{
  color:#fff;
  font-size:64px;
  line-height:1;
  font-weight:900;
  letter-spacing:8px;
  text-shadow:0 2px 12px rgba(0,0,0,.15);
}
.brandSub{
  margin-top:12px;
  color:rgba(255,255,255,.82);
  font-size:15px;
  font-weight:800;
  letter-spacing:2px;
}

.checkboxRow{ width:min(540px, 94vw); margin:8px auto 10px; text-align:left; }
.check{ display:flex; align-items:center; gap:10px; color:rgba(255,255,255,.85); font-size:13px; font-weight:700; }
.check input{ width:16px; height:16px; }

h1{
  color:#fff;
  font-size:38px;
  margin:0 0 18px;
  text-shadow:0 2px 12px rgba(0,0,0,.15);
}
.label{
  width:min(540px, 94vw);
  margin:0 auto 6px;
  text-align:left;
  color:rgba(255,255,255,.8);
  font-size:12px;
  font-weight:700;
}
.input{
  width:min(540px, 94vw);
  height:46px;
  border-radius:16px;
  border:1px solid rgba(0,0,0,.22);
  outline:none;
  padding:0 14px;
  background:#fff;
  display:block;
  margin:0 auto 14px;
  font-weight:700;
  font-size:14px;
}
.input:focus{
  border-color:#0a66ff;
  box-shadow:0 0 0 3px rgba(10,102,255,.14);
}
.pwWrap{
  width:min(540px, 94vw);
  margin:0 auto 10px;
  position:relative;
}
.withToggle{
  width:100%;
  margin:0;
  padding-right:76px;
}
.pwToggle{
  position:absolute;
  right:10px;
  top:50%;
  transform:translateY(-50%);
  border:0;
  background:transparent;
  color:#0a66ff;
  font-weight:800;
  cursor:pointer;
}
.passwordHelp{
  width:min(540px, 94vw);
  margin:0 auto 14px;
  padding:10px 12px;
  border-radius:12px;
  background:rgba(255,255,255,.14);
  text-align:left;
  font-size:12px;
  font-weight:700;
  color:rgba(255,255,255,.72);
  display:grid;
  gap:5px;
}
.passwordHelp .ok{
  color:#ffffff;
}
.btn{
  width:min(540px, 94vw);
  height:46px;
  border-radius:22px;
  border:2px solid rgba(0,0,0,.25);
  background:transparent;
  cursor:pointer;
  font-weight:900;
  display:flex;
  align-items:center;
  justify-content:center;
  margin:0 auto 14px;
}
.btn.blue{
  background:#0a66ff;
  border:2px solid #0a66ff;
  color:#fff;
}
.btn.solid{
  background:var(--green);
  border-color:rgba(0,0,0,.18);
  color:#fff;
}
.row{
  width:min(540px, 94vw);
  margin:4px auto 14px;
  display:flex;
  justify-content:space-between;
  gap:12px;
  font-weight:800;
}
.linkBtn{
  background:transparent;
  border:0;
  color:#0b4bd6;
  font-weight:900;
  cursor:pointer;
  padding:0;
}
.hr{
  width:min(540px, 94vw);
  margin:10px auto 12px;
  display:flex;
  align-items:center;
  gap:12px;
  color:rgba(255,255,255,.75);
  font-weight:900;
  font-size:12px;
}
.hr:before,.hr:after{
  content:"";
  height:1px;
  background:rgba(255,255,255,.35);
  flex:1;
}
.googleBtn{
  background:#fff;
  color:#1f1f1f;
  border:1px solid #dadce0;
  gap:10px;
  box-shadow:0 1px 2px rgba(0,0,0,.08);
}
.gIcon{
  width:20px;
  height:20px;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  flex:0 0 auto;
}
.small{
  color:rgba(255,255,255,.82);
  font-size:11px;
}
.otpHint{
  color:rgba(255,255,255,.92);
  margin:0 auto 10px;
  width:min(540px, 94vw);
  font-weight:700;
  font-size:13px;
}
.otpRow{
  display:flex;
  gap:8px;
  justify-content:center;
  margin:10px 0 18px;
}
.otpBox{
  width:42px;
  height:46px;
  border-radius:12px;
  border:1px solid rgba(0,0,0,.15);
  text-align:center;
  font-weight:900;
  font-size:18px;
  outline:none;
}
.otpBox:focus{
  border-color:#0a66ff;
  box-shadow:0 0 0 3px rgba(10,102,255,.14);
}
.err{
  width:min(540px, 94vw);
  margin:0 auto 10px;
  color:#7f1d1d;
  font-weight:900;
  background:rgba(255,255,255,.92);
  border-radius:12px;
  padding:8px 10px;
  text-align:left;
}
.info{
  width:min(540px, 94vw);
  margin:0 auto 10px;
  color:#065f46;
  font-weight:900;
  background:rgba(255,255,255,.92);
  border-radius:12px;
  padding:8px 10px;
  text-align:left;
}
.modalOverlay{
  position:fixed;
  inset:0;
  background:rgba(0,0,0,.12);
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
}
.modal{
  width:min(520px, 92vw);
  background:rgba(255,255,255,.96);
  border-radius:18px;
  box-shadow:0 12px 36px rgba(0,0,0,.18);
  padding:22px;
  text-align:center;
}
.checkWrap{
  width:78px;
  height:78px;
  border-radius:999px;
  margin:0 auto 12px;
  background:rgba(34,197,94,.18);
  display:flex;
  align-items:center;
  justify-content:center;
}

.modalActionBtn{
  width:min(320px, 78vw);
  margin-left:auto;
  margin-right:auto;
}

.checkInner{
  width:54px;
  height:54px;
  border-radius:999px;
  background:rgba(34,197,94,.9);
  color:#fff;
  display:flex;
  align-items:center;
  justify-content:center;
  font-weight:900;
  font-size:20px;
}
.modalTitle{ font-weight:900; font-size:16px; }
.modalDesc{ margin-top:6px; opacity:.7; font-size:12px; }

@media (max-width: 640px){
  .brandText{ font-size:42px; letter-spacing:4px; }
  .brandSub{ font-size:11px; letter-spacing:1px; }
  h1{ font-size:36px; }
  .row{ flex-wrap:wrap; justify-content:center; }
}
`;