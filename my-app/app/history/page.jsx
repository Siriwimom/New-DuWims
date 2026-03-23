"use client";

import DuwimsStaticPage from "../components/DuwimsStaticPage";

const htmlContent = `<div id="p2" class="page">

  <!-- Filter Bar -->
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
        <span class="sensor-dd-arrow" id="sensorDdArrow">▲</span>
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

</div>`;

export default function HistoryPage() {
  return <DuwimsStaticPage current="history" htmlContent={htmlContent} />;
}