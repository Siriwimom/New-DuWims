"use client";

import DuwimsStaticPage from "../components/DuwimsStaticPage";

const htmlContent = `<div id="p2" class="page">

  <style>
    #p2,
    .page,
    .filter-bar,
    .card,
    .chart-card{
      overflow: visible !important;
    }

    .filter-bar{
      position: relative;
      z-index: 200;
    }

    .chart-card{
      position: relative;
      z-index: 1;
    }

    .sensor-dd-wrap{
      position: relative;
      overflow: visible;
      z-index: 500;
    }

    .sensor-dd-trigger{
      min-height: 48px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border: 1px solid #dfe7dc;
      border-radius: 14px;
      background: #ffffff;
      cursor: pointer;
      user-select: none;
      transition: border-color .18s ease, box-shadow .18s ease, transform .12s ease;
      position: relative;
      z-index: 501;
    }

    .sensor-dd-trigger:hover{
      border-color: #8ccf95;
    }

    .sensor-dd-trigger.open{
      border-color: #5db866;
      box-shadow: 0 0 0 4px rgba(93,184,102,.14);
    }

    .sensor-dd-arrow{
      flex: 0 0 auto;
      font-size: 14px;
      color: #5f6f64;
      transition: transform .18s ease;
    }

    .sensor-dd-trigger.open .sensor-dd-arrow{
      transform: rotate(180deg);
    }

    .sensor-dd-menu{
      position: absolute;
      top: calc(100% + 8px);
      left: 0;
      right: 0;
      z-index: 9999;
      background: #ffffff;
      border: 1px solid #dfe7dc;
      border-radius: 18px;
      box-shadow: 0 18px 40px rgba(0,0,0,.14);
      overflow: hidden;

      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transform: translateY(-4px);
      transition: opacity .18s ease, transform .18s ease, visibility .18s ease;
    }

    .sensor-dd-menu.open{
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
      transform: translateY(0);
    }

    .sensor-dd-header{
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 12px 14px;
      border-bottom: 1px solid #edf2ea;
      background: #f9fcf8;
    }

    .sensor-dd-header-title{
      font-size: 13px;
      font-weight: 700;
      color: #36523b;
    }

    .sensor-dd-clear{
      border: none;
      background: transparent;
      color: #3f8f4a;
      font-weight: 700;
      cursor: pointer;
    }

    .sensor-dd-grid{
      max-height: 280px;
      overflow-y: auto;
      padding: 10px;
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .sensor-dd-item{
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: 48px;
      padding: 10px 12px;
      border: 1px solid #e4ece1;
      border-radius: 14px;
      background: #fff;
      cursor: pointer;
      transition: background .16s ease, border-color .16s ease, transform .12s ease;
    }

    .sensor-dd-item:hover{
      background: #f6fbf5;
      border-color: #b9dfbe;
    }

    .sensor-dd-item.checked{
      background: #eef9ef;
      border-color: #78c483;
    }

    .sensor-dd-box{
      width: 22px;
      height: 22px;
      border-radius: 7px;
      border: 1.5px solid #c9d8c8;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-weight: 800;
      color: transparent;
      background: #fff;
      flex: 0 0 22px;
    }

    .sensor-dd-item.checked .sensor-dd-box{
      background: #5db866;
      border-color: #5db866;
      color: #fff;
    }

    .sensor-dd-name{
      flex: 1;
      font-size: 14px;
      font-weight: 600;
      color: #22352a;
    }

    .sensor-dd-unit{
      font-size: 12px;
      color: #6f8174;
      font-weight: 700;
    }

    .sensor-dd-footer{
      padding: 12px 14px;
      border-top: 1px solid #edf2ea;
      background: #f9fcf8;
      display: flex;
      justify-content: flex-end;
    }

    .sensor-dd-done{
      height: 40px;
      padding: 0 16px;
      border: none;
      border-radius: 12px;
      background: #5db866;
      color: #fff;
      font-weight: 800;
      cursor: pointer;
    }

    @media (max-width: 768px){
      .sensor-dd-grid{
        grid-template-columns: 1fr;
      }
    }
  </style>

  <div class="filter-bar">
    <div class="filter-title">🔍 ฟิลเตอร์ข้อมูลย้อนหลัง</div>
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ</div>

    <div style="margin-bottom:12px">
      <div class="filter-label">ช่วงเวลาเร็ว</div>
      <div class="filter-quick">
        <button class="quick-btn active">วันนี้</button>
        <button class="quick-btn" onclick="selectQuick(this)">7 วันล่าสุด</button>
        <button class="quick-btn" onclick="selectQuick(this)">30 วันล่าสุด</button>
      </div>
    </div>

    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:14px">
      <div>
        <div class="filter-label">วันที่เริ่มต้น</div>
        <input type="date" class="form-input" value="2026-03-15">
      </div>
      <div>
        <div class="filter-label">วันที่สิ้นสุด</div>
        <input type="date" class="form-input" value="2026-03-22">
      </div>
      <div>
        <div class="filter-label">แปลง</div>
        <select class="form-select">
          <option>ทุกแปลง</option>
          <option>แปลงองุ่น 1</option>
          <option>แปลงทุเรียน 1</option>
          <option>แปลงทุเรียน 2</option>
          <option>แปลงมังคุด 1</option>
          <option>แปลงใหม่ 2026-03-20</option>
        </select>
      </div>
    </div>

    <div class="sensor-dd-wrap">
      <div class="filter-label" style="margin-bottom:6px">ประเภทเซนเซอร์</div>
      <div class="sensor-dd-trigger" id="sensorDdTrigger" onclick="toggleSensorDd()">
        <span id="sensorDdLabel">ความชื้นในดิน</span>
        <span class="sensor-dd-arrow" id="sensorDdArrow">▼</span>
      </div>

      <div class="sensor-dd-menu" id="sensorDdMenu">
        <div class="sensor-dd-header">
          <span class="sensor-dd-header-title">เลือกได้หลายตัว</span>
          <button class="sensor-dd-clear" onclick="clearAllSensors(event)">ล้าง</button>
        </div>

        <div class="sensor-dd-grid">
          <label class="sensor-dd-item checked" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box">✓</span>
            <span class="sensor-dd-name">ความชื้นในดิน</span>
            <span class="sensor-dd-unit">%</span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">อุณหภูมิ</span>
            <span class="sensor-dd-unit">°C</span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">ความชื้นสัมพัทธ์</span>
            <span class="sensor-dd-unit">%</span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">NPK</span>
            <span class="sensor-dd-unit"></span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">ความเข้มแสง</span>
            <span class="sensor-dd-unit">lux</span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">ปริมาณน้ำฝน</span>
            <span class="sensor-dd-unit">mm</span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">ความเร็วลม</span>
            <span class="sensor-dd-unit">m/s</span>
          </label>

          <label class="sensor-dd-item" onclick="toggleSensorItem(this)">
            <span class="sensor-dd-box"></span>
            <span class="sensor-dd-name">การให้น้ำ</span>
            <span class="sensor-dd-unit">L</span>
          </label>
        </div>

        <div class="sensor-dd-footer">
          <button class="sensor-dd-done" onclick="closeSensorDd()">Done</button>
        </div>
      </div>
    </div>
  </div>

  <div class="card chart-card">
    <div class="chart-header">
      <div>
        <div class="card-title">📈 กราฟเปรียบเทียบแปลง</div>
        <div class="chart-meta">sensor: ความชื้นในดิน • แปลง: แปลงองุ่น 1, แปลงทุเรียน 1, แปลงมังคุด 1, แปลงทุเรียน 2</div>
      </div>
      <button class="export-btn">⬇ EXPORT CSV</button>
    </div>

    <div class="chart-legend">
      <div class="legend-item"><div class="legend-dot" style="background:#3b82f6"></div>แปลงองุ่น 1</div>
      <div class="legend-item"><div class="legend-dot" style="background:#22c55e"></div>แปลงทุเรียน 1</div>
      <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div>แปลงมังคุด 1</div>
      <div class="legend-item"><div class="legend-dot" style="background:#ef4444"></div>แปลงทุเรียน 2</div>
      <div class="legend-item"><div class="legend-dot" style="background:#8b5cf6"></div>แปลงใหม่ 2026-03-20</div>
    </div>

    <div class="chart-area">
      <div class="chart-grid">
        <div class="chart-grid-line"><span class="chart-grid-label">0</span></div>
        <div class="chart-grid-line"><span class="chart-grid-label">-0.2</span></div>
        <div class="chart-grid-line"><span class="chart-grid-label">-0.5</span></div>
        <div class="chart-grid-line"><span class="chart-grid-label">-0.7</span></div>
        <div class="chart-grid-line"><span class="chart-grid-label">-1.0</span></div>
      </div>
      <svg class="chart-svg" viewBox="0 0 900 220" preserveAspectRatio="none">
        <line x1="0" y1="44" x2="900" y2="44" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>
        <line x1="0" y1="88" x2="900" y2="88" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>
        <line x1="0" y1="132" x2="900" y2="132" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>
        <line x1="0" y1="176" x2="900" y2="176" stroke="rgba(93,184,102,0.12)" stroke-width="1"/>
        <polyline fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round" points="30,60 160,45 290,80 420,55 550,70 680,50 810,65"/>
        <polyline fill="none" stroke="#22c55e" stroke-width="2.5" stroke-linejoin="round" points="30,90 160,100 290,75 420,110 550,85 680,95 810,80"/>
        <polyline fill="none" stroke="#f59e0b" stroke-width="2.5" stroke-linejoin="round" points="30,130 160,115 290,140 420,125 550,145 680,120 810,135"/>
        <polyline fill="none" stroke="#ef4444" stroke-width="2.5" stroke-linejoin="round" points="30,160 160,150 290,165 420,155 550,170 680,145 810,160"/>
        <polyline fill="none" stroke="#8b5cf6" stroke-width="2" stroke-dasharray="6,3" stroke-linejoin="round" points="30,40 160,35 290,50 420,42 550,55 680,40 810,48"/>
      </svg>
    </div>

    <div class="chart-x-labels">
      <span class="chart-x-label">15 มี.ค.</span>
      <span class="chart-x-label">16 มี.ค.</span>
      <span class="chart-x-label">17 มี.ค.</span>
      <span class="chart-x-label">18 มี.ค.</span>
      <span class="chart-x-label">19 มี.ค.</span>
      <span class="chart-x-label">20 มี.ค.</span>
      <span class="chart-x-label">21 มี.ค.</span>
      <span class="chart-x-label">22 มี.ค.</span>
    </div>

    <div class="chart-note">* กราฟนี้เทียบ "แปลง" ด้วย sensor ตัวแรกที่เลือก (เพื่ออ่านง่าย) • CSV จะ export ทุก sensor ที่เลือก</div>
  </div>

  <div class="card">
    <div class="card-title" style="margin-bottom:12px">📋 สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)</div>
    <div style="overflow-x:auto">
      <table class="summary-table">
        <thead>
          <tr>
            <th>แปลง</th><th>Node</th><th>ความชื้นในดิน (%)</th><th>อุณหภูมิ (°C)</th><th>ความชื้นสัมพัทธ์ (%)</th><th>N</th><th>P</th><th>K</th><th>ความเข้มแสง (lux)</th><th>ปริมาณน้ำฝน (mm)</th><th>ความเร็วลม (m/s)</th><th>การให้น้ำ (L)</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>แปลงองุ่น 1</td><td><span class="node-type-pill ntp-air">Air Node</span></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
          <tr><td>แปลงทุเรียน 1</td><td><span class="node-type-pill ntp-soil">Soil Node</span></td><td>68.5</td><td>26.5</td><td>78</td><td>—</td><td>—</td><td>—</td><td>48500</td><td>3.2</td><td>0.42</td><td>—</td></tr>
          <tr><td>แปลงมังคุด 1</td><td><span class="node-type-pill ntp-air">Air Node</span></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
          <tr><td>แปลงทุเรียน 2</td><td><span class="node-type-pill ntp-soil">Soil Node</span></td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td><td>—</td></tr>
        </tbody>
      </table>
    </div>
  </div>

  <script>
    function toggleSensorDd() {
      const trigger = document.getElementById("sensorDdTrigger");
      const menu = document.getElementById("sensorDdMenu");
      const arrow = document.getElementById("sensorDdArrow");

      const isOpen = menu.classList.contains("open");

      if (isOpen) {
        menu.classList.remove("open");
        trigger.classList.remove("open");
        arrow.textContent = "▼";
      } else {
        menu.classList.add("open");
        trigger.classList.add("open");
        arrow.textContent = "▲";
      }
    }

    function closeSensorDd() {
      const trigger = document.getElementById("sensorDdTrigger");
      const menu = document.getElementById("sensorDdMenu");
      const arrow = document.getElementById("sensorDdArrow");

      menu.classList.remove("open");
      trigger.classList.remove("open");
      arrow.textContent = "▼";
    }

    function toggleSensorItem(el) {
      el.classList.toggle("checked");
      const box = el.querySelector(".sensor-dd-box");
      if (box) box.textContent = el.classList.contains("checked") ? "✓" : "";

      const checkedNames = [...document.querySelectorAll(".sensor-dd-item.checked .sensor-dd-name")]
        .map(x => x.textContent.trim());

      document.getElementById("sensorDdLabel").textContent =
        checkedNames.length ? checkedNames.join(", ") : "เลือกประเภทเซนเซอร์";
    }

    function clearAllSensors(event) {
      event.stopPropagation();
      document.querySelectorAll(".sensor-dd-item.checked").forEach(el => {
        el.classList.remove("checked");
        const box = el.querySelector(".sensor-dd-box");
        if (box) box.textContent = "";
      });
      document.getElementById("sensorDdLabel").textContent = "เลือกประเภทเซนเซอร์";
    }

    document.addEventListener("click", function (e) {
      const wrap = document.querySelector(".sensor-dd-wrap");
      const menu = document.getElementById("sensorDdMenu");
      const trigger = document.getElementById("sensorDdTrigger");
      const arrow = document.getElementById("sensorDdArrow");

      if (!wrap || !menu || !trigger || !arrow) return;

      if (!wrap.contains(e.target)) {
        menu.classList.remove("open");
        trigger.classList.remove("open");
        arrow.textContent = "▼";
      }
    });
  </script>

</div>`;

export default function HistoryPage() {
  return <DuwimsStaticPage current="history" htmlContent={htmlContent} />;
}