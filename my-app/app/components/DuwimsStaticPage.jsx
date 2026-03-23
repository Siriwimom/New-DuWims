"use client";

import { useEffect, useRef } from "react";
import { duwimsStyles } from "./duwimsStyles";
import TopBar from "./TopBar";

export default function DuwimsStaticPage({
  current = "dashboard",
  htmlContent = "",
  children = null,
  noPadding = false,
}) {
  const rootRef = useRef(null);

  useEffect(() => {
    // ถ้ามี children ไม่ต้อง bind DOM script แบบหน้า htmlContent เดิม
    if (children) return;

    const root = rootRef.current;
    if (!root) return;

    const scope = root;

    const qs = (sel) => scope.querySelector(sel);
    const qsa = (sel) => Array.from(scope.querySelectorAll(sel));

    function hmDateChange(type, input) {
      const d = new Date(input.value);
      if (Number.isNaN(d.getTime())) return;
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yyyy = d.getFullYear() + 543;
      const displayId = type === "start" ? "hmStartDateDisplay" : "hmEndDateDisplay";
      const el = qs(`#${displayId}`);
      if (el) el.textContent = `${dd}/${mm}/${yyyy}`;
    }

    const hmSensorColors = {
      temp: {
        bg: "radial-gradient(ellipse 90% 60% at 25% 35%,rgba(200,80,20,.70) 0%,rgba(230,130,50,.50) 18%,rgba(180,80,20,.30) 35%,transparent 55%),radial-gradient(ellipse 40% 35% at 65% 60%,rgba(255,100,20,.30) 0%,transparent 55%)",
      },
      humidity: {
        bg: "radial-gradient(ellipse 80% 55% at 40% 40%,rgba(30,100,210,.60) 0%,rgba(50,140,230,.40) 25%,transparent 55%),radial-gradient(ellipse 50% 40% at 70% 70%,rgba(20,80,180,.40) 0%,transparent 50%)",
      },
      wind: {
        bg: "radial-gradient(ellipse 70% 50% at 30% 50%,rgba(100,180,255,.55) 0%,rgba(60,140,220,.35) 30%,transparent 58%),radial-gradient(ellipse 60% 45% at 75% 30%,rgba(80,160,240,.40) 0%,transparent 50%)",
      },
      light: {
        bg: "radial-gradient(ellipse 85% 55% at 50% 35%,rgba(255,210,50,.60) 0%,rgba(255,180,30,.40) 22%,transparent 52%),radial-gradient(ellipse 40% 35% at 25% 65%,rgba(255,150,20,.30) 0%,transparent 50%)",
      },
      rain: {
        bg: "radial-gradient(ellipse 75% 55% at 35% 45%,rgba(30,160,200,.60) 0%,rgba(20,130,180,.40) 28%,transparent 55%),radial-gradient(ellipse 55% 40% at 72% 68%,rgba(40,180,220,.40) 0%,transparent 48%)",
      },
      soil: {
        bg: "radial-gradient(ellipse 80% 50% at 45% 55%,rgba(40,160,80,.60) 0%,rgba(30,130,60,.40) 26%,transparent 55%),radial-gradient(ellipse 45% 38% at 20% 30%,rgba(50,180,90,.35) 0%,transparent 50%)",
      },
      n: {
        bg: "radial-gradient(ellipse 70% 50% at 40% 40%,rgba(130,80,50,.60) 0%,rgba(100,60,40,.40) 28%,transparent 55%)",
      },
      p: {
        bg: "radial-gradient(ellipse 75% 52% at 55% 50%,rgba(220,60,50,.58) 0%,rgba(190,40,40,.38) 25%,transparent 55%)",
      },
      k: {
        bg: "radial-gradient(ellipse 78% 52% at 48% 42%,rgba(230,210,40,.58) 0%,rgba(210,190,30,.38) 24%,transparent 52%)",
      },
      water: {
        bg: "radial-gradient(ellipse 72% 50% at 42% 58%,rgba(30,160,150,.60) 0%,rgba(20,130,120,.40) 27%,transparent 54%)",
      },
    };

    function selectHmSensor(el, key, emoji, label, color) {
      qsa(".hm-sensor-item").forEach((i) => {
        i.classList.remove("active");
        const check = i.querySelector(".hm-si-check");
        if (check) check.textContent = "";
      });
      el.classList.add("active");
      const selfCheck = el.querySelector(".hm-si-check");
      if (selfCheck) selfCheck.textContent = "✓";

      const badge = qs("#hmSensorBadge");
      if (badge) badge.style.background = color;
      const sensorLabel = qs("#hmSensorLabel");
      if (sensorLabel) sensorLabel.textContent = label;
      const emojiEl = qs("#hmSensorEmoji");
      if (emojiEl) emojiEl.textContent = emoji;
      const overlay = qs("#hmTempOverlay");
      if (overlay && hmSensorColors[key]) overlay.style.background = hmSensorColors[key].bg;
    }

    function selectHmPlot() {}
    function selectHmPlotDd() {}

    let hmPlaying = false;
    let hmInterval = null;
    let hmPos = 64;
    let dragging = false;

    function syncThumb() {
      const thumb = qs("#hmThumb");
      if (thumb) thumb.style.left = `${hmPos}%`;
    }

    function hmTrackClick(e) {
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      hmPos = pct;
      syncThumb();
    }

    function toggleHmPlay(btn) {
      hmPlaying = !hmPlaying;
      btn.classList.toggle("playing", hmPlaying);
      btn.textContent = hmPlaying ? "⏸" : "▶";
      if (hmPlaying) {
        hmInterval = window.setInterval(() => {
          hmPos = (hmPos + 0.3) % 100;
          syncThumb();
        }, 80);
      } else if (hmInterval) {
        window.clearInterval(hmInterval);
      }
    }

    function toggleSensorDd() {
      const menu = qs("#sensorDdMenu");
      const arrow = qs("#sensorDdArrow");
      const trigger = qs("#sensorDdTrigger");
      if (!menu || !arrow || !trigger) return;
      const isOpen = menu.classList.contains("open");
      menu.classList.toggle("open", !isOpen);
      arrow.classList.toggle("open", !isOpen);
      trigger.classList.toggle("open", !isOpen);
      arrow.textContent = isOpen ? "▲" : "▼";
    }

    function closeSensorDd() {
      const menu = qs("#sensorDdMenu");
      const arrow = qs("#sensorDdArrow");
      const trigger = qs("#sensorDdTrigger");
      menu?.classList.remove("open");
      arrow?.classList.remove("open");
      trigger?.classList.remove("open");
      if (arrow) arrow.textContent = "▲";
    }

    function updateSensorDdLabel() {
      const checked = qsa(".sensor-dd-item.checked");
      const label = qs("#sensorDdLabel");
      if (!label) return;
      if (checked.length === 0) {
        label.textContent = "เลือก Sensor...";
      } else if (checked.length === 1) {
        label.textContent =
          checked[0].querySelector(".sensor-dd-name")?.textContent || "เลือก Sensor...";
      } else {
        label.textContent = `${checked.length} sensor ที่เลือก`;
      }
    }

    function toggleSensorItem(label) {
      label.classList.toggle("checked");
      const box = label.querySelector(".sensor-dd-box");
      if (box) box.textContent = label.classList.contains("checked") ? "✓" : "";
      updateSensorDdLabel();
    }

    function clearAllSensors(e) {
      e.stopPropagation();
      qsa(".sensor-dd-item").forEach((item) => {
        item.classList.remove("checked");
        const box = item.querySelector(".sensor-dd-box");
        if (box) box.textContent = "";
      });
      updateSensorDdLabel();
    }

    function toggleSensorCb(input) {
      const label = input.closest(".sensor-cb");
      if (label) label.classList.toggle("checked", input.checked);
    }

    function selectQuick(btn) {
      qsa(".quick-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
    }

    function toggleCb(label) {
      label.classList.toggle("checked");
    }

    const nodeIds = ["nc1", "nc2", "nc3"];
    function toggleNodeAccordion(id) {
      const card = qs(`#${id}`);
      if (!card) return;
      const wasOpen = card.classList.contains("open");
      nodeIds.forEach((n) => qs(`#${n}`)?.classList.remove("open"));
      if (!wasOpen) card.classList.add("open");
    }

    function toggleNode(id) {
      toggleNodeAccordion(id);
    }

    function switchNodeView(mode, type) {
      const view = qs("#nodeViewSection");
      const create = qs("#nodeCreateSection");
      const edit = qs("#nodeEditSection");
      if (view) view.style.display = mode === "view" ? "block" : "none";
      if (create) create.style.display = mode === "create" ? "block" : "none";
      if (edit) edit.style.display = mode === "edit" ? "block" : "none";

      if (mode === "edit") {
        const soil = type === "soil";
        const badge = qs("#editNodeTypeBadge");
        if (badge) {
          badge.textContent = soil ? "Soil Node" : "Air Node";
          badge.style.background = soil ? "#4e342e" : "#1565c0";
        }
        const editAir = qs("#editAirSensors");
        const editSoil = qs("#editSoilSensors");
        if (editAir) editAir.style.display = soil ? "none" : "block";
        if (editSoil) editSoil.style.display = soil ? "block" : "none";
        const uid = qs("#editUidDisplay");
        const name = qs("#editNodeName");
        if (uid) uid.value = soil ? "Soil - 0000002" : "Air - 0000001";
        if (name) name.value = soil ? "ขอบแปลง" : "กลางไร่";
      }

      if (mode === "create") {
        const createUid = qs("#createUidInput");
        const hint = qs("#createNodeTypeHint");
        const air = qs("#createAirSensors");
        const soil = qs("#createSoilSensors");
        if (createUid) createUid.value = "";
        if (hint) hint.style.display = "none";
        if (air) air.style.display = "block";
        if (soil) soil.style.display = "none";
      }
    }

    function onUidInput(inp) {
      const v = inp.value.trim().toLowerCase();
      const hint = qs("#createNodeTypeHint");
      const soil = v.startsWith("soil");
      const air = v.startsWith("air");
      const detected = qs("#detectedNodeType");
      const createAir = qs("#createAirSensors");
      const createSoil = qs("#createSoilSensors");

      if (v.length >= 3 && (soil || air)) {
        if (hint) hint.style.display = "block";
        if (detected) detected.textContent = soil ? "Soil Node" : "Air Node";
        if (createAir) createAir.style.display = soil ? "none" : "block";
        if (createSoil) createSoil.style.display = soil ? "block" : "none";
      } else {
        if (hint) hint.style.display = "none";
        if (createAir) createAir.style.display = "block";
        if (createSoil) createSoil.style.display = "none";
      }
    }

    function onCreatePlotChange() {}

    function openConfirm(id) {
      qs(`#${id}`)?.classList.add("open");
    }

    function closePopupIfBg(e, id) {
      if (e.target.classList.contains("popup-overlay")) {
        qs(`#${id}`)?.classList.remove("open");
      }
    }

    function locateMe(btn) {
      if (!navigator.geolocation) {
        window.alert("เบราว์เซอร์ไม่รองรับการระบุตำแหน่ง");
        return;
      }
      btn.classList.add("locating");
      btn.textContent = "⏳ กำลังค้นหา...";
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(5);
          const lng = pos.coords.longitude.toFixed(5);
          btn.classList.remove("locating");
          btn.innerHTML = `✅ ${lat}, ${lng}`;
          window.setTimeout(() => {
            btn.innerHTML = "📍 ตำแหน่งฉัน";
          }, 4000);
        },
        (err) => {
          btn.classList.remove("locating");
          btn.innerHTML = "📍 ตำแหน่งฉัน";
          const m = { 1: "ถูกปฏิเสธการเข้าถึงตำแหน่ง", 2: "ไม่สามารถระบุตำแหน่งได้", 3: "หมดเวลา" };
          window.alert("ข้อผิดพลาด: " + (m[err.code] || err.message));
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
      );
    }

    Object.assign(window, {
      hmDateChange,
      selectHmSensor,
      selectHmPlot,
      selectHmPlotDd,
      hmTrackClick,
      toggleHmPlay,
      toggleSensorDd,
      closeSensorDd,
      toggleSensorItem,
      clearAllSensors,
      toggleSensorCb,
      selectQuick,
      toggleCb,
      toggleNodeAccordion,
      toggleNode,
      switchNodeView,
      onUidInput,
      onCreatePlotChange,
      openConfirm,
      closePopupIfBg,
      locateMe,
    });

    const handleDocClick = (e) => {
      const wrap = qs(".sensor-dd-wrap");
      const menu = qs("#sensorDdMenu");
      const arrow = qs("#sensorDdArrow");
      const trigger = qs("#sensorDdTrigger");
      if (!wrap || !menu) return;
      if (!wrap.contains(e.target)) {
        menu.classList.remove("open");
        if (arrow) {
          arrow.classList.remove("open");
          arrow.textContent = "▲";
        }
        trigger?.classList.remove("open");
      }
    };

    const handleMouseDown = (e) => {
      if (e.target?.id === "hmThumb") dragging = true;
    };

    const handleMouseUp = () => {
      dragging = false;
    };

    const handleMouseMove = (e) => {
      if (!dragging) return;
      const thumb = qs("#hmThumb");
      const track = thumb?.parentElement;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      hmPos = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      syncThumb();
    };

    document.addEventListener("click", handleDocClick);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      if (hmInterval) window.clearInterval(hmInterval);
      document.removeEventListener("click", handleDocClick);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [htmlContent, children]);

  return (
    <>
      <style jsx global>{duwimsStyles}</style>
      <TopBar current={current} />
      <main className={noPadding ? "duwims-main no-padding" : "duwims-main"}>
        {children ? (
          <div className="duwims-react-page">{children}</div>
        ) : (
          <div ref={rootRef} dangerouslySetInnerHTML={{ __html: htmlContent }} />
        )}
      </main>

      <style jsx>{`
        .duwims-main {
          min-height: calc(100vh - 72px);
          background: #f5f7fb;
        }

        .duwims-main.no-padding {
          padding: 0;
        }

        .duwims-react-page {
          width: 100%;
        }
      `}</style>
    </>
  );
}