"use client";

import DuwimsStaticPage from "./components/DuwimsStaticPage";

const htmlContent = `<div id="p1" class="page active">

  <!-- TOP GRID: Weather + Metrics -->
  <div class="grid-top">

    <!-- Weather 7 Days -->
    <div class="card">
      <div class="card-title">🌤 พยากรณ์อากาศ 7 วันข้างหน้า</div>
      <div style="font-size:11px;color:var(--muted);margin-bottom:4px">อิงจากพื้นที่แปลงปลูก · Open-Meteo API</div>
      <div class="weather-strip">
        <div class="weather-day"><div class="wd-name">วันนี้</div><div class="wd-icon">🌧️</div><div class="wd-temp">29°</div><div class="wd-rain">ฝน 83%</div></div>
        <div class="weather-day"><div class="wd-name">จ.</div><div class="wd-icon">🌦️</div><div class="wd-temp">28°</div><div class="wd-rain">ฝน 65%</div></div>
        <div class="weather-day"><div class="wd-name">อ.</div><div class="wd-icon">🌧️</div><div class="wd-temp">27°</div><div class="wd-rain">ฝน 72%</div></div>
        <div class="weather-day"><div class="wd-name">พ.</div><div class="wd-icon">🌤️</div><div class="wd-temp">30°</div><div class="wd-rain">ฝน 30%</div></div>
        <div class="weather-day"><div class="wd-name">พฤ.</div><div class="wd-icon">🌤️</div><div class="wd-temp">31°</div><div class="wd-rain">ฝน 20%</div></div>
        <div class="weather-day"><div class="wd-name">ศ.</div><div class="wd-icon">🌦️</div><div class="wd-temp">29°</div><div class="wd-rain">ฝน 45%</div></div>
        <div class="weather-day"><div class="wd-name">ส.</div><div class="wd-icon">🌤️</div><div class="wd-temp">30°</div><div class="wd-rain">ฝน 25%</div></div>
      </div>
    </div>

    <!-- Mid: Temp + Rain -->
    <div class="col-stack">
      <div class="metric-card mc-blue">
        <div class="metric-card-label">🌡 อุณหภูมิปัจจุบัน (วันนี้)</div>
        <div class="metric-card-value">22–29°C</div>
        <div class="metric-card-sub">อิงจากพยากรณ์รายวันของพื้นที่แปลง</div>
      </div>
      <div class="metric-card mc-yellow">
        <div class="metric-card-label">🌧 โอกาสฝนตก (วันนี้)</div>
        <div class="metric-card-value">83%</div>
        <div class="metric-card-sub">อิงจาก precipitation probability (รายวัน)</div>
      </div>
    </div>

    <!-- Right: Advice + Rain sum -->
    <div class="col-stack">
      <div class="metric-card mc-red">
        <div class="metric-card-label">💡 คำแนะนำ</div>
        <div class="metric-card-value" style="font-size:15px;line-height:1.5;font-family:'Sarabun',sans-serif;font-weight:600">มีโอกาสฝนสูงใน 2–3 วันข้างหน้า ควรเตรียมระบบระบายน้ำ/ตรวจร่องน้ำในแปลง</div>
      </div>
      <div class="metric-card mc-green">
        <div class="metric-card-label">🌧 ปริมาณน้ำฝน (7 วัน)</div>
        <div class="metric-card-value">15 mm</div>
        <div class="metric-card-sub">รวมจาก precipitation_sum รายวัน</div>
      </div>
    </div>
  </div>

  <!-- MAP -->
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div class="card-title">🗺 แผนที่และทรัพยากร (ทุกแปลง)</div>
      <div style="font-size:11px;color:var(--muted)">แสดง polygon แปลง + หมุด Node ทั้งหมด</div>
    </div>
    <div class="map-placeholder" style="height:280px">
      <div class="fp fp1"></div>
      <div class="fp fp2"></div>
      <div class="fp fp3"></div>
      <div class="mpin" style="top:62px;left:102px" data-n="1"></div>
      <div class="mpin" style="top:118px;left:290px" data-n="2"></div>
      <div class="mpin" style="bottom:60px;left:175px" data-n="3"></div>
      <div class="mpin" style="top:50px;right:100px" data-n="4"></div>
      <div class="mpin" style="bottom:45px;right:140px" data-n="5"></div>
      <div class="map-label" style="position:relative;z-index:1">🗺 Leaflet / OpenStreetMap<br><span style="font-size:9px;opacity:0.6">ระบบแผนที่ Interactive</span></div>
    </div>
  </div>

  <!-- STATUS + ISSUES -->
  <div class="grid-2" style="margin-bottom:16px">
    <div class="status-on">
      <div class="on-label">📡 สถานะการทำงาน</div>
      <div style="font-size:11px;opacity:0.80;margin-bottom:10px">อัปเดตจากระบบ • อัปเดต: 22/03/2569 00:30</div>
      <div class="on-value">ON <span style="font-size:20px">5</span> เครื่อง</div>
      <div class="on-sub">OFF 0 เครื่อง</div>
    </div>
    <div class="status-alert">
      <div style="font-size:14px;font-weight:700;color:#7c2d12;margin-bottom:8px">⚠️ ปัญหาที่พบ</div>
      <div style="font-size:13px;font-weight:700;color:#7c2d12;margin-bottom:8px">ตรวจพบความผิดปกติ 4 กลุ่ม</div>
      <div class="alert-pill">🌬️ วัดความเร็วลม ต่ำเกิน (&lt; 0.56 m/s)</div>
      <div class="alert-pill">☀️ ความเข้มแสง ต่ำเกิน (&lt; 40000 lux)</div>
      <div class="alert-pill">🌧 ปริมาณน้ำฝน ต่ำเกิน (&lt; 4 mm)</div>
      <div class="alert-pill">💧 ความชื้นในดิน ต่ำเกิน (&lt; 65 %)</div>
    </div>
  </div>

  <!-- PIN CARDS -->
  <div class="section-title">ข้อมูลเซนเซอร์รายแปลง</div>
  <div class="grid-2">

    <!-- PIN 1: แปลงองุ่น 1 -->
    <div class="pin-card alert-card">
      <div class="pin-header">
        <div>
          <div class="pin-name">ข้อมูล : แปลงองุ่น 1 • Pin 1</div>
          <div class="pin-sub">รายละเอียดของอุปกรณ์และเซนเซอร์</div>
        </div>
        <div class="status-badge">ON</div>
      </div>
      <div class="pin-pills">
        <div class="pin-pill"><div class="pp-label">ประเภทพืช</div><div class="pp-val">องุ่น</div></div>
        <div class="pin-pill"><div class="pp-label">วันที่เริ่มปลูก</div><div class="pp-val">12/09/2568</div></div>
        <div class="pin-pill"><div class="pp-label">จำนวนเซนเซอร์</div><div class="pp-val">7 กลุ่ม</div></div>
        <div class="pin-pill"><div class="pp-label">ผู้ดูแล</div><div class="pp-val">สมชาย ใจดี</div></div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌡 อุณหภูมิ</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">อุณหภูมิ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">20 °C</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">35 °C</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">อุณหภูมิ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">20 °C</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">35 °C</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">💧 ความชื้น</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">ความชื้น</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">75 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">85 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">ความชื้น</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">75 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">85 %</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌬 วัดความเร็วลม</div>
        <div class="sg-grid">
          <div class="sg-item alert-item"><div class="sgi-name alert">วัดความเร็วลม</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 0.56 m/s</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">0.56 - 1.39 m/s</span></div></div></div>
          <div class="sg-item alert-item"><div class="sgi-name alert">วัดความเร็วลม</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 0.56 m/s</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">0.56 - 1.39 m/s</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">☀️ ความเข้มแสง</div>
        <div class="sg-grid">
          <div class="sg-item alert-item"><div class="sgi-name alert">ความเข้มแสง</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 40000 lux</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">40000 - 60000 lux</span></div></div></div>
          <div class="sg-item alert-item"><div class="sgi-name alert">ความเข้มแสง</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 40000 lux</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">40000 - 60000 lux</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌧 ปริมาณน้ำฝน</div>
        <div class="sg-grid">
          <div class="sg-item alert-item"><div class="sgi-name alert">ปริมาณน้ำฝน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 4 mm</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">4 - 8 mm</span></div></div></div>
          <div class="sg-item alert-item"><div class="sgi-name alert">ปริมาณน้ำฝน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 4 mm</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">4 - 8 mm</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌱 ความชื้นในดิน</div>
        <div class="sg-grid">
          <div class="sg-item alert-item"><div class="sgi-name alert">ความชื้นในดิน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 65 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">65 - 80 %</span></div></div></div>
          <div class="sg-item alert-item"><div class="sgi-name alert">ความชื้นในดิน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val av">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">&lt; 65 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">65 - 80 %</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🧪 ความเข้มข้นธาตุอาหาร (N,P,K)</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">N</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.1 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.0 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">P</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">25 ppm</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">45 ppm</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">K</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.8 cmol/kg</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.4 cmol/kg</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🚿 การให้น้ำ / ความพร้อมใช้น้ำ</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">การให้น้ำ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">50 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">90 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">การให้น้ำ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">50 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">90 %</span></div></div></div>
        </div>
      </div>
    </div>

    <!-- PIN 2: แปลงทุเรียน -->
    <div class="pin-card">
      <div class="pin-header">
        <div>
          <div class="pin-name">ข้อมูล : แปลงทุเรียน 1 • Pin 2</div>
          <div class="pin-sub">รายละเอียดของอุปกรณ์และเซนเซอร์</div>
        </div>
        <div class="status-badge">ON</div>
      </div>
      <div class="pin-pills">
        <div class="pin-pill"><div class="pp-label">ประเภทพืช</div><div class="pp-val">ทุเรียน</div></div>
        <div class="pin-pill"><div class="pp-label">วันที่เริ่มปลูก</div><div class="pp-val">11/12/2566</div></div>
        <div class="pin-pill"><div class="pp-label">จำนวนเซนเซอร์</div><div class="pp-val">7 กลุ่ม</div></div>
        <div class="pin-pill"><div class="pp-label">ผู้ดูแล</div><div class="pp-val">สมชาย ใจดี</div></div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌡 อุณหภูมิ</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">อุณหภูมิ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">26.5 °C</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">20 °C</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">35 °C</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">อุณหภูมิ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">26.5 °C</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">20 °C</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">35 °C</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">💧 ความชื้น</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">ความชื้น</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">78 %</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">75 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">85 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">ความชื้น</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">78 %</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">75 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">85 %</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌬 วัดความเร็วลม</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">วัดความเร็วลม</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">1.2 m/s</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.56 m/s</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.39 m/s</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">วัดความเร็วลม</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">1.2 m/s</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.56 m/s</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.39 m/s</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">☀️ ความเข้มแสง</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">ความเข้มแสง</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">48500 lux</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">40000 lux</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">60000 lux</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">ความเข้มแสง</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">48500 lux</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">40000 lux</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">60000 lux</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌧 ปริมาณน้ำฝน</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">ปริมาณน้ำฝน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">5.2 mm</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">4 mm</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">8 mm</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">ปริมาณน้ำฝน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">5.2 mm</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">4 mm</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">8 mm</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🌱 ความชื้นในดิน</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">ความชื้นในดิน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">70 %</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">65 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">80 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">ความชื้นในดิน</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val">70 %</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">65 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">80 %</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🧪 ความเข้มข้นธาตุอาหาร (N,P,K)</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">N</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.1 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.0 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">P</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">25 ppm</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">45 ppm</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">K</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">0.8 cmol/kg</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">1.4 cmol/kg</span></div></div></div>
        </div>
      </div>
      <div class="sensor-group">
        <div class="sg-title">🚿 การให้น้ำ / ความพร้อมใช้น้ำ</div>
        <div class="sg-grid">
          <div class="sg-item"><div class="sgi-name">การให้น้ำ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">50 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">90 %</span></div></div></div>
          <div class="sg-item"><div class="sgi-name">การให้น้ำ</div><div class="sgi-vmm"><div class="sgi-row"><span class="sgi-row-label">Value</span><span class="sgi-row-val dash">-</span></div><div class="sgi-row"><span class="sgi-row-label">MIN</span><span class="sgi-row-sub">50 %</span></div><div class="sgi-row"><span class="sgi-row-label">MAX</span><span class="sgi-row-sub">90 %</span></div></div></div>
        </div>
      </div>
    </div>

  </div>
</div>`;

export default function Page() {
  return <DuwimsStaticPage current="dashboard" htmlContent={htmlContent} />;
}
