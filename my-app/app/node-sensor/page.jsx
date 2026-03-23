"use client";

import { useEffect, useRef } from "react";
import DuwimsStaticPage from "../components/DuwimsStaticPage";
import "leaflet/dist/leaflet.css";

const htmlContent = `
<div class="page-content">

  <div id="nodeViewSection">
    <div class="card" style="margin-bottom:13px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:9px;flex-wrap:wrap;gap:7px">
        <div class="card-title">🗺 Current Map</div>
        <button class="create-btn" style="margin-bottom:0" onclick="switchNodeView('create','')">＋ Create Node</button>
      </div>

      <div style="display:flex;gap:9px;flex-wrap:wrap;margin-bottom:11px">
        <div>
          <div class="filter-label" style="margin-bottom:3px">Current Map แปลง</div>
          <select class="form-select" style="width:185px">
            <option>ทุกแปลง</option>
            <option>แปลงองุ่น 1</option>
            <option>แปลงทุเรียน 1</option>
            <option>แปลงมังคุด 1</option>
            <option>แปลงทุเรียน 2</option>
          </select>
        </div>

        <div>
          <div class="filter-label" style="margin-bottom:3px">เลือก Node</div>
          <select class="form-select" style="width:155px">
            <option>ทุก Node</option>
            <option>Air Node</option>
            <option>Soil Node</option>
          </select>
        </div>
      </div>

      <div class="map-wrapper">
        <div id="currentMapHost">
          <div id="currentMap" class="leaflet-box"></div>
        </div>
        <button class="locate-btn" onclick="locateLeafletMap('current')">📍 ตำแหน่งฉัน</button>
      </div>
    </div>

    <div style="display:flex;align-items:center;gap:9px;margin-bottom:9px;flex-wrap:wrap">
      <div class="filter-label" style="margin-bottom:0">แปลง</div>
      <select class="form-select" style="width:170px">
        <option>1</option>
        <option>2</option>
        <option>3</option>
      </select>

      <div class="filter-label" style="margin-bottom:0;margin-left:7px">ชนิด Node</div>
      <select class="form-select" style="width:145px">
        <option>ทุก Node</option>
        <option>Air Node</option>
        <option>Soil Node</option>
      </select>
    </div>

    <div class="node-card open" id="nc1">
      <div class="node-header" onclick="toggleNodeAccordion('nc1')">
        <div class="node-header-left">
          <div>
            <div class="node-uid">Air - 0000001</div>
            <div class="node-name">Node : กลางไร่</div>
          </div>
          <span class="node-type-badge" style="background:rgba(25,118,210,.28)">Air Node</span>
          <span style="font-size:10px;color:#a5d6a7;background:rgba(76,175,80,.18);padding:2px 9px;border-radius:20px;font-weight:600">Status : ON</span>
        </div>
        <div style="display:flex;align-items:center;gap:9px">
          <span class="node-status-on">ON</span>
          <span class="node-chevron">▾</span>
        </div>
      </div>

      <div class="node-body">
        <table class="node-sensor-table">
          <thead>
            <tr>
              <th>sensor</th>
              <th>ข้อมูล</th>
              <th>Max</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🌡 อุณหภูมิ</td><td class="val-green">25 °C</td><td>35 °C</td><td>20 °C</td></tr>
            <tr><td>💧 ความชื้นสัมพัทธ์</td><td class="val-green">76 %</td><td>85 %</td><td>75 %</td></tr>
            <tr><td>🌬 วัดความเร็วลม</td><td class="val-red">3 km/hr</td><td>6 km/hr</td><td>1 km/hr</td></tr>
            <tr><td>☀️ ความเข้มแสง</td><td class="val-green">50000 lux</td><td>70000 lux</td><td>15000 lux</td></tr>
            <tr><td>🌧 ปริมาณน้ำฝน</td><td class="val-red">5 mm</td><td>10 mm</td><td>3 mm</td></tr>
          </tbody>
        </table>

        <div class="node-actions">
          <button class="btn-sm btn-edit" onclick="switchNodeView('edit','air')">✏️ แก้ไข</button>
          <button class="btn-sm btn-del" onclick="openConfirm('confirmDeleteNode')">🗑 ลบ</button>
        </div>
      </div>
    </div>

    <div class="node-card" id="nc2">
      <div class="node-header" onclick="toggleNodeAccordion('nc2')">
        <div class="node-header-left">
          <div>
            <div class="node-uid">Soil - 0000002</div>
            <div class="node-name">Node : ขอบแปลง</div>
          </div>
          <span class="node-type-badge" style="background:rgba(109,76,65,.30)">Soil Node</span>
          <span style="font-size:10px;color:#a5d6a7;background:rgba(76,175,80,.18);padding:2px 9px;border-radius:20px;font-weight:600">Status : ON</span>
        </div>
        <div style="display:flex;align-items:center;gap:9px">
          <span class="node-status-on">ON</span>
          <span class="node-chevron">▾</span>
        </div>
      </div>

      <div class="node-body">
        <table class="node-sensor-table">
          <thead>
            <tr>
              <th>sensor</th>
              <th>ข้อมูล</th>
              <th>Max</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🌱 ความชื้นในดิน</td><td class="val-green">70 %</td><td>80 %</td><td>65 %</td></tr>
            <tr><td>🧪 N</td><td class="val-green">0.5 %</td><td>1.0 %</td><td>0.1 %</td></tr>
            <tr><td>🧪 P</td><td class="val-green">35 ppm</td><td>45 ppm</td><td>25 ppm</td></tr>
            <tr><td>🧪 K</td><td class="val-green">1.1 cmol/kg</td><td>1.4 cmol/kg</td><td>0.8 cmol/kg</td></tr>
            <tr><td>🚿 ความพร้อมใช้น้ำ</td><td class="val-green">72 %</td><td>90 %</td><td>50 %</td></tr>
          </tbody>
        </table>

        <div class="node-actions">
          <button class="btn-sm btn-edit" onclick="switchNodeView('edit','soil')">✏️ แก้ไข</button>
          <button class="btn-sm btn-del" onclick="openConfirm('confirmDeleteNode')">🗑 ลบ</button>
        </div>
      </div>
    </div>

    <div class="node-card" id="nc3">
      <div class="node-header" onclick="toggleNodeAccordion('nc3')">
        <div class="node-header-left">
          <div>
            <div class="node-uid">Air - 0000003</div>
            <div class="node-name">Node : ปลายแปลง</div>
          </div>
          <span class="node-type-badge" style="background:rgba(25,118,210,.28)">Air Node</span>
          <span style="font-size:10px;color:#a5d6a7;background:rgba(76,175,80,.18);padding:2px 9px;border-radius:20px;font-weight:600">Status : ON</span>
        </div>
        <div style="display:flex;align-items:center;gap:9px">
          <span class="node-status-on">ON</span>
          <span class="node-chevron">▾</span>
        </div>
      </div>

      <div class="node-body">
        <table class="node-sensor-table">
          <thead>
            <tr>
              <th>sensor</th>
              <th>ข้อมูล</th>
              <th>Max</th>
              <th>Min</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>🌡 อุณหภูมิ</td><td class="val-green">28 °C</td><td>35 °C</td><td>20 °C</td></tr>
            <tr><td>💧 ความชื้นสัมพัทธ์</td><td class="val-green">80 %</td><td>85 %</td><td>75 %</td></tr>
            <tr><td>🌬 วัดความเร็วลม</td><td class="val-green">4 km/hr</td><td>6 km/hr</td><td>1 km/hr</td></tr>
            <tr><td>☀️ ความเข้มแสง</td><td class="val-green">55000 lux</td><td>70000 lux</td><td>15000 lux</td></tr>
            <tr><td>🌧 ปริมาณน้ำฝน</td><td class="val-green">6 mm</td><td>10 mm</td><td>3 mm</td></tr>
          </tbody>
        </table>

        <div class="node-actions">
          <button class="btn-sm btn-edit" onclick="switchNodeView('edit','air')">✏️ แก้ไข</button>
          <button class="btn-sm btn-del" onclick="openConfirm('confirmDeleteNode')">🗑 ลบ</button>
        </div>
      </div>
    </div>
  </div>

  <div id="nodeCreateSection" style="display:none">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px">
      <button class="btn-sm btn-edit" style="padding:7px 13px" onclick="switchNodeView('view','')">← กลับ</button>
      <div style="font-size:15px;font-weight:700;color:var(--soil)">＋ เพิ่ม NODE</div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <div class="card-title">🗺 Current Map <span style="font-size:11px;color:var(--muted)"> (คลิกแผนที่เพื่อปักหมุด)</span></div>
        <div id="createMapMsg" class="map-msg">ยังไม่ได้ปักหมุด</div>
      </div>

      <div id="createMapHost">
        <div id="createMap" class="leaflet-box"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="locate-btn-inline" onclick="locateLeafletMap('create')">📍 ตำแหน่งฉัน</button>
        <div class="coord-read">
          lat: <span id="createLatText">-</span> · lng: <span id="createLngText">-</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📡 Create Node</div>

      <div class="filter-field">
        <div class="filter-field-label">แปลง</div>
        <select class="form-select" onchange="onCreatePlotChange(this)">
          <option value="">-- เลือกแปลง --</option>
          <option>แปลง 1</option>
          <option>แปลง 2</option>
          <option>แปลง 3</option>
        </select>
      </div>

      <div class="form-grid-2">
        <div class="filter-field" style="margin-bottom:0">
          <div class="filter-field-label">UID</div>
          <input id="createUidInput" class="form-input" placeholder="เช่น Air-0000001 หรือ Soil-0000002" oninput="onUidInput(this)" />
        </div>

        <div class="filter-field" style="margin-bottom:0">
          <div class="filter-field-label">ชื่อ Node</div>
          <input class="form-input" placeholder="เช่น กลางไร่" />
        </div>
      </div>

      <div id="createNodeTypeHint" style="display:none;margin:13px 0;padding:10px 12px;border-radius:11px;background:rgba(76,175,80,.08);border:1px solid rgba(76,175,80,.24);font-size:12px;color:var(--soil);font-weight:600">
        ตรวจพบชนิด Node : <span id="detectedNodeType">Air Node</span>
      </div>

      <input type="hidden" id="createLatInput" />
      <input type="hidden" id="createLngInput" />

      <div class="filter-field">
        <div class="filter-field-label">Status</div>
        <div style="display:flex;gap:14px;align-items:center;font-size:12px;color:var(--text);font-weight:600">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="createNodeStatus" checked />
            ON
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="createNodeStatus" />
            OFF
          </label>
        </div>
      </div>

      <div id="createAirSensors">
        <div class="card-title" style="margin:14px 0 8px">Air Sensors</div>
        <table class="node-sensor-table">
          <thead><tr><th>sensor</th><th>ข้อมูล</th><th>Max</th><th>Min</th></tr></thead>
          <tbody>
            <tr><td>🌡 อุณหภูมิ</td><td><input class="form-input" value="25" /></td><td><input class="form-input" value="35" /></td><td><input class="form-input" value="20" /></td></tr>
            <tr><td>💧 ความชื้นสัมพัทธ์</td><td><input class="form-input" value="76" /></td><td><input class="form-input" value="85" /></td><td><input class="form-input" value="75" /></td></tr>
            <tr><td>🌬 วัดความเร็วลม</td><td><input class="form-input" value="3" /></td><td><input class="form-input" value="6" /></td><td><input class="form-input" value="1" /></td></tr>
            <tr><td>☀️ ความเข้มแสง</td><td><input class="form-input" value="50000" /></td><td><input class="form-input" value="70000" /></td><td><input class="form-input" value="15000" /></td></tr>
            <tr><td>🌧 ปริมาณน้ำฝน</td><td><input class="form-input" value="5" /></td><td><input class="form-input" value="10" /></td><td><input class="form-input" value="3" /></td></tr>
          </tbody>
        </table>
      </div>

      <div id="createSoilSensors" style="display:none">
        <div class="card-title" style="margin:14px 0 8px">Soil Sensors</div>
        <table class="node-sensor-table">
          <thead><tr><th>sensor</th><th>ข้อมูล</th><th>Max</th><th>Min</th></tr></thead>
          <tbody>
            <tr><td>🌱 ความชื้นในดิน</td><td><input class="form-input" value="70" /></td><td><input class="form-input" value="80" /></td><td><input class="form-input" value="65" /></td></tr>
            <tr><td>🧪 N</td><td><input class="form-input" value="0.5" /></td><td><input class="form-input" value="1.0" /></td><td><input class="form-input" value="0.1" /></td></tr>
            <tr><td>🧪 P</td><td><input class="form-input" value="35" /></td><td><input class="form-input" value="45" /></td><td><input class="form-input" value="25" /></td></tr>
            <tr><td>🧪 K</td><td><input class="form-input" value="1.1" /></td><td><input class="form-input" value="1.4" /></td><td><input class="form-input" value="0.8" /></td></tr>
            <tr><td>🚿 ความพร้อมใช้น้ำ</td><td><input class="form-input" value="72" /></td><td><input class="form-input" value="90" /></td><td><input class="form-input" value="50" /></td></tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button class="btn-cancel" onclick="switchNodeView('view','')">ยกเลิก</button>
        <button class="btn-save" onclick="openConfirm('confirmSaveNode')">บันทึก</button>
      </div>
    </div>
  </div>

  <div id="nodeEditSection" style="display:none">
    <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px">
      <button class="btn-sm btn-edit" style="padding:7px 13px" onclick="switchNodeView('view','')">← กลับ</button>
      <div style="font-size:15px;font-weight:700;color:var(--soil)">✏️ แก้ไข NODE</div>
    </div>

    <div class="card" style="margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;gap:8px;flex-wrap:wrap">
        <div class="card-title">🗺 Current Map <span style="font-size:11px;color:var(--muted)">(คลิกแผนที่เพื่อย้ายหมุด)</span></div>
        <div id="editMapMsg" class="map-msg">ยังไม่ได้เลือกตำแหน่ง</div>
      </div>

      <div id="editMapHost">
        <div id="editMap" class="leaflet-box"></div>
      </div>

      <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;margin-top:10px">
        <button class="locate-btn-inline" onclick="locateLeafletMap('edit')">📍 ตำแหน่งฉัน</button>
        <div class="coord-read">
          lat: <span id="editLatText">-</span> · lng: <span id="editLngText">-</span>
        </div>
      </div>
    </div>

    <div class="card">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap">
        <div class="card-title" style="margin-bottom:0">📡 Edit Node</div>
        <span id="editNodeTypeBadge" class="node-type-badge" style="background:#1565c0;color:#fff">Air Node</span>
      </div>

      <div class="form-grid-2">
        <div class="filter-field" style="margin-bottom:0">
          <div class="filter-field-label">UID</div>
          <input id="editUidDisplay" class="form-input" readonly />
        </div>

        <div class="filter-field" style="margin-bottom:0">
          <div class="filter-field-label">ชื่อ Node</div>
          <input id="editNodeName" class="form-input" />
        </div>
      </div>

      <input type="hidden" id="editLatInput" />
      <input type="hidden" id="editLngInput" />

      <div class="filter-field" style="margin-top:13px">
        <div class="filter-field-label">Status</div>
        <div style="display:flex;gap:14px;align-items:center;font-size:12px;color:var(--text);font-weight:600">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="editNodeStatus" checked />
            ON
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer">
            <input type="radio" name="editNodeStatus" />
            OFF
          </label>
        </div>
      </div>

      <div id="editAirSensors">
        <div class="card-title" style="margin:14px 0 8px">Air Sensors</div>
        <table class="node-sensor-table">
          <thead><tr><th>sensor</th><th>ข้อมูล</th><th>Max</th><th>Min</th></tr></thead>
          <tbody>
            <tr><td>🌡 อุณหภูมิ</td><td><input class="form-input" value="25" /></td><td><input class="form-input" value="35" /></td><td><input class="form-input" value="20" /></td></tr>
            <tr><td>💧 ความชื้นสัมพัทธ์</td><td><input class="form-input" value="76" /></td><td><input class="form-input" value="85" /></td><td><input class="form-input" value="75" /></td></tr>
            <tr><td>🌬 วัดความเร็วลม</td><td><input class="form-input" value="3" /></td><td><input class="form-input" value="6" /></td><td><input class="form-input" value="1" /></td></tr>
            <tr><td>☀️ ความเข้มแสง</td><td><input class="form-input" value="50000" /></td><td><input class="form-input" value="70000" /></td><td><input class="form-input" value="15000" /></td></tr>
            <tr><td>🌧 ปริมาณน้ำฝน</td><td><input class="form-input" value="5" /></td><td><input class="form-input" value="10" /></td><td><input class="form-input" value="3" /></td></tr>
          </tbody>
        </table>
      </div>

      <div id="editSoilSensors" style="display:none">
        <div class="card-title" style="margin:14px 0 8px">Soil Sensors</div>
        <table class="node-sensor-table">
          <thead><tr><th>sensor</th><th>ข้อมูล</th><th>Max</th><th>Min</th></tr></thead>
          <tbody>
            <tr><td>🌱 ความชื้นในดิน</td><td><input class="form-input" value="70" /></td><td><input class="form-input" value="80" /></td><td><input class="form-input" value="65" /></td></tr>
            <tr><td>🧪 N</td><td><input class="form-input" value="0.5" /></td><td><input class="form-input" value="1.0" /></td><td><input class="form-input" value="0.1" /></td></tr>
            <tr><td>🧪 P</td><td><input class="form-input" value="35" /></td><td><input class="form-input" value="45" /></td><td><input class="form-input" value="25" /></td></tr>
            <tr><td>🧪 K</td><td><input class="form-input" value="1.1" /></td><td><input class="form-input" value="1.4" /></td><td><input class="form-input" value="0.8" /></td></tr>
            <tr><td>🚿 ความพร้อมใช้น้ำ</td><td><input class="form-input" value="72" /></td><td><input class="form-input" value="90" /></td><td><input class="form-input" value="50" /></td></tr>
          </tbody>
        </table>
      </div>

      <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:14px">
        <button class="btn-cancel" onclick="switchNodeView('view','')">ยกเลิก</button>
        <button class="btn-save" onclick="openConfirm('confirmSaveNode')">บันทึก</button>
      </div>
    </div>
  </div>

  <div id="confirmSaveNode" class="popup-overlay" onclick="closePopupIfBg(event,'confirmSaveNode')">
    <div class="confirm-box">
      <div class="confirm-icon">💾</div>
      <div class="confirm-title">ยืนยันการบันทึกข้อมูล</div>
      <div class="confirm-sub">ต้องการบันทึกข้อมูล Node นี้ใช่หรือไม่?</div>
      <div class="confirm-actions">
        <button class="btn-cancel" onclick="document.getElementById('confirmSaveNode').classList.remove('open')">ยกเลิก</button>
        <button class="btn-save" onclick="document.getElementById('confirmSaveNode').classList.remove('open');switchNodeView('view','')">ยืนยัน</button>
      </div>
    </div>
  </div>

  <div id="confirmDeleteNode" class="popup-overlay" onclick="closePopupIfBg(event,'confirmDeleteNode')">
    <div class="confirm-box">
      <div class="confirm-icon">🗑</div>
      <div class="confirm-title">ยืนยันการลบข้อมูล</div>
      <div class="confirm-sub">
        ต้องการลบ Node นี้ออกจากระบบ?<br>
        การดำเนินการนี้ไม่สามารถกู้คืนได้
      </div>
      <div class="confirm-actions">
        <button class="btn-cancel" onclick="document.getElementById('confirmDeleteNode').classList.remove('open')">ยกเลิก</button>
        <button class="btn-confirm" onclick="document.getElementById('confirmDeleteNode').classList.remove('open')">ยืนยัน</button>
      </div>
    </div>
  </div>

</div>
`;

export default function NodeSensorPage() {
  const currentMapRef = useRef(null);
  const createMapRef = useRef(null);
  const editMapRef = useRef(null);

  const currentMarkerRef = useRef(null);
  const createMarkerRef = useRef(null);
  const editMarkerRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    let L = null;
    let styleEl = null;

    async function init() {
      try {
        const leafletModule = await import("leaflet");
        L = leafletModule.default;
      } catch (err) {
        console.error("Leaflet load error:", err);
        return;
      }

      if (!mounted || !L) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      styleEl = document.createElement("style");
      styleEl.innerHTML = `
        :root{
          --soil:#254f17;
          --card:#ffffff;
          --muted:#7a8d73;
          --text:#20311c;
          --good:#2e7d32;
          --bad:#d84343;
        }

        *{ box-sizing:border-box; }

        .page-content{
          padding:16px;
          background:linear-gradient(180deg,#edf6e7 0%, #f8fbf6 100%);
          min-height:calc(100vh - 76px);
          color:var(--text);
          font-family:Arial, Helvetica, sans-serif;
        }

        .card{
          background:var(--card);
          border:1px solid #dce9d7;
          border-radius:16px;
          padding:14px;
          box-shadow:0 5px 16px rgba(51,87,37,.08);
        }

        .card-title{
          font-size:14px;
          font-weight:800;
          color:var(--soil);
        }

        .filter-label,
        .filter-field-label{
          font-size:11px;
          font-weight:800;
          color:#5a6d54;
          margin-bottom:6px;
        }

        .filter-field{
          margin-bottom:12px;
        }

        .form-select,
        .form-input{
          width:100%;
          height:40px;
          border-radius:12px;
          border:1px solid #cfe0c8;
          background:#fbfef9;
          color:#33422d;
          padding:0 12px;
          outline:none;
          font-size:12px;
        }

        .form-grid-2{
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:12px;
        }

        .create-btn,
        .btn-save,
        .btn-confirm,
        .locate-btn,
        .locate-btn-inline{
          border:none;
          cursor:pointer;
          border-radius:12px;
          font-weight:800;
          font-size:12px;
        }

        .create-btn{
          background:#1f4d0f;
          color:#fff;
          padding:10px 14px;
          box-shadow:0 4px 12px rgba(31,77,15,.24);
        }

        .locate-btn{
          position:absolute;
          left:12px;
          bottom:12px;
          background:#fff;
          color:#26491c;
          padding:8px 12px;
          box-shadow:0 4px 12px rgba(44,78,31,.18);
          z-index:1000;
        }

        .locate-btn-inline{
          background:#fff;
          color:#26491c;
          padding:8px 12px;
          box-shadow:0 4px 12px rgba(44,78,31,.08);
          border:1px solid #d7e4d0;
        }

        .btn-save{
          background:#1f4d0f;
          color:#fff;
          padding:10px 18px;
        }

        .btn-confirm{
          background:#c62828;
          color:#fff;
          padding:10px 18px;
        }

        .btn-cancel,
        .btn-sm{
          border:1px solid #d7e4d0;
          background:#fff;
          color:#4a5f43;
          cursor:pointer;
          border-radius:12px;
          font-size:12px;
          font-weight:700;
          padding:10px 16px;
        }

        .btn-sm.btn-edit{
          color:#2e7d32;
          border-color:#b8d7b2;
          background:#f8fff7;
        }

        .btn-sm.btn-del{
          color:#c62828;
          border-color:#efc8c8;
          background:#fff8f8;
        }

        .map-wrapper{
          position:relative;
          width:100%;
          min-height:320px;
        }

        #currentMapHost,
        #createMapHost,
        #editMapHost{
          width:100%;
          min-height:320px;
          border-radius:18px;
          overflow:hidden;
          position:relative;
          background:#dfeecf;
          border:1px solid rgba(0,0,0,.08);
        }

        .leaflet-box{
          width:100%;
          height:320px !important;
          min-height:320px !important;
          display:block !important;
          border-radius:18px;
          overflow:hidden;
          background:#dfeecf;
        }

        .leaflet-container{
          width:100% !important;
          height:100% !important;
          min-height:320px !important;
          z-index:1;
        }

        .node-card{
          margin-bottom:12px;
          background:#fff;
          border:1px solid #dce9d7;
          border-radius:16px;
          overflow:hidden;
          box-shadow:0 5px 16px rgba(51,87,37,.06);
        }

        .node-header{
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap:10px;
          padding:12px 14px;
          background:linear-gradient(90deg,#1a430d,#2c6617);
          color:#fff;
          cursor:pointer;
        }

        .node-header-left{
          display:flex;
          align-items:center;
          gap:10px;
          flex-wrap:wrap;
        }

        .node-uid{
          font-size:12px;
          font-weight:800;
          color:#fff;
        }

        .node-name{
          font-size:12px;
          font-weight:700;
          color:#f0f6ec;
        }

        .node-type-badge{
          display:inline-flex;
          align-items:center;
          border-radius:999px;
          padding:3px 10px;
          font-size:10px;
          font-weight:800;
          color:#fff;
        }

        .node-status-on{
          background:#4caf50;
          color:#fff;
          padding:3px 10px;
          border-radius:999px;
          font-size:10px;
          font-weight:800;
        }

        .node-chevron{
          font-size:13px;
          font-weight:900;
          color:#fff;
          transition:transform .2s ease;
        }

        .node-body{
          display:none;
          padding:12px 14px;
          background:#fff;
        }

        .node-card.open .node-body{
          display:block;
        }

        .node-actions{
          display:flex;
          gap:8px;
          margin-top:12px;
        }

        .node-sensor-table{
          width:100%;
          border-collapse:collapse;
          font-size:12px;
        }

        .node-sensor-table th{
          text-align:left;
          background:#eef5ea;
          color:#667a60;
          font-size:10px;
          font-weight:800;
          padding:10px 10px;
        }

        .node-sensor-table td{
          border-top:1px solid #edf3ea;
          padding:10px 10px;
          vertical-align:middle;
        }

        .node-sensor-table input.form-input{
          height:30px;
          border-radius:999px;
          background:#fbfef9;
          font-size:11px;
          padding:0 10px;
        }

        .val-green{ color:var(--good); font-weight:800; }
        .val-red{ color:var(--bad); font-weight:800; }

        .map-msg{
          display:inline-flex;
          align-items:center;
          gap:6px;
          padding:6px 10px;
          border-radius:999px;
          background:rgba(21,101,192,.08);
          color:#1565c0;
          border:1px solid rgba(21,101,192,.20);
          font-size:11px;
          font-weight:700;
        }

        .coord-read{
          font-size:12px;
          color:#546e7a;
          font-weight:600;
        }

        .popup-overlay{
          position:fixed;
          inset:0;
          background:rgba(0,0,0,.35);
          display:none;
          align-items:center;
          justify-content:center;
          padding:16px;
          z-index:9999;
        }

        .popup-overlay.open{
          display:flex;
        }

        .confirm-box{
          width:100%;
          max-width:420px;
          background:#fff;
          border-radius:18px;
          padding:20px;
          box-shadow:0 12px 36px rgba(0,0,0,.18);
          text-align:center;
        }

        .confirm-icon{
          font-size:30px;
          margin-bottom:10px;
        }

        .confirm-title{
          font-size:18px;
          font-weight:800;
          color:#243a1d;
          margin-bottom:8px;
        }

        .confirm-sub{
          font-size:13px;
          color:#5f7058;
          line-height:1.55;
        }

        .confirm-actions{
          display:flex;
          justify-content:center;
          gap:10px;
          margin-top:18px;
        }

        @media (max-width:768px){
          #currentMapHost,
          #createMapHost,
          #editMapHost,
          .leaflet-box,
          .leaflet-container{
            min-height:260px !important;
            height:260px !important;
          }

          .form-grid-2{
            grid-template-columns:1fr;
          }

          .node-header{
            align-items:flex-start;
          }

          .confirm-actions{
            flex-direction:column;
          }
        }
      `;
      document.head.appendChild(styleEl);

      const polygons = [
        {
          color: "#6c8f5d",
          coords: [
            [13.1128, 100.9252],
            [13.1133, 100.9260],
            [13.1127, 100.9268],
            [13.1121, 100.9262],
          ],
        },
        {
          color: "#6c8f5d",
          coords: [
            [13.1112, 100.9258],
            [13.1118, 100.9266],
            [13.1111, 100.9272],
            [13.1105, 100.9264],
          ],
        },
        {
          color: "#6c8f5d",
          coords: [
            [13.1138, 100.9269],
            [13.1142, 100.9277],
            [13.1135, 100.9282],
            [13.1130, 100.9274],
          ],
        },
      ];

      const pins = [
        [13.11255, 100.92605],
        [13.11125, 100.92655],
        [13.11355, 100.92765],
        [13.1122, 100.92555],
        [13.1118, 100.9273],
      ];

      const DEFAULT_CENTER = [13.112, 100.926];

      function setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
      }

      function setValue(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value;
      }

      function setMapMsg(mode, text, ok = false) {
        const id = mode + "MapMsg";
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text;
        el.style.background = ok ? "rgba(76,175,80,.10)" : "rgba(21,101,192,.08)";
        el.style.color = ok ? "#2e7d32" : "#1565c0";
        el.style.border = ok
          ? "1px solid rgba(76,175,80,.24)"
          : "1px solid rgba(21,101,192,.20)";
      }

      function updateCoords(mode, lat, lng) {
        if (mode === "create") {
          setText("createLatText", Number(lat).toFixed(6));
          setText("createLngText", Number(lng).toFixed(6));
          setValue("createLatInput", Number(lat).toFixed(6));
          setValue("createLngInput", Number(lng).toFixed(6));
        } else if (mode === "edit") {
          setText("editLatText", Number(lat).toFixed(6));
          setText("editLngText", Number(lng).toFixed(6));
          setValue("editLatInput", Number(lat).toFixed(6));
          setValue("editLngInput", Number(lng).toFixed(6));
        }
        setMapMsg(mode, "เลือกตำแหน่งแล้ว", true);
      }

      function drawBaseLayers(map) {
        const bounds = [];
        polygons.forEach((poly) => {
          L.polygon(poly.coords, {
            color: poly.color,
            weight: 2,
            fillColor: poly.color,
            fillOpacity: 0.12,
          }).addTo(map);
          poly.coords.forEach((pt) => bounds.push(pt));
        });

        pins.forEach((pt) => {
          L.marker(pt).addTo(map);
          bounds.push(pt);
        });

        if (bounds.length) {
          map.fitBounds(bounds, { padding: [20, 20] });
        } else {
          map.setView(DEFAULT_CENTER, 17);
        }
      }

      function buildMap(mapElId, refStore, mode, markerRef) {
        const el = document.getElementById(mapElId);
        if (!el) return null;
        if (refStore.current) return refStore.current;

        const map = L.map(el, {
          center: DEFAULT_CENTER,
          zoom: 17,
          zoomControl: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 20,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        drawBaseLayers(map);

        map.on("click", (e) => {
          const lat = e.latlng.lat;
          const lng = e.latlng.lng;

          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], {
              draggable: true,
            }).addTo(map);

            markerRef.current.on("dragend", () => {
              const pos = markerRef.current.getLatLng();
              if (mode === "create" || mode === "edit") {
                updateCoords(mode, pos.lat, pos.lng);
              }
            });
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }

          if (mode === "create" || mode === "edit") {
            updateCoords(mode, lat, lng);
          }
        });

        setTimeout(() => {
          map.invalidateSize(true);
        }, 300);

        refStore.current = map;
        return map;
      }

      function createCurrentMap() {
        return buildMap("currentMap", currentMapRef, "current", currentMarkerRef);
      }

      function createCreateMap() {
        return buildMap("createMap", createMapRef, "create", createMarkerRef);
      }

      function createEditMap() {
        return buildMap("editMap", editMapRef, "edit", editMarkerRef);
      }

      window.locateLeafletMap = function (mode) {
        let map = null;
        let markerRef = null;

        if (mode === "current") {
          map = createCurrentMap();
          markerRef = currentMarkerRef;
        } else if (mode === "create") {
          map = createCreateMap();
          markerRef = createMarkerRef;
        } else if (mode === "edit") {
          map = createEditMap();
          markerRef = editMarkerRef;
        }

        if (!map || !navigator.geolocation) return;

        navigator.geolocation.getCurrentPosition((pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          if (!markerRef.current) {
            markerRef.current = L.marker([lat, lng], {
              draggable: true,
            }).addTo(map);

            if (mode === "create" || mode === "edit") {
              markerRef.current.on("dragend", () => {
                const p = markerRef.current.getLatLng();
                updateCoords(mode, p.lat, p.lng);
              });
            }
          } else {
            markerRef.current.setLatLng([lat, lng]);
          }

          map.setView([lat, lng], 18);

          if (mode === "create" || mode === "edit") {
            updateCoords(mode, lat, lng);
          }
        });
      };

      window.toggleNodeAccordion = function (id) {
        const card = document.getElementById(id);
        if (!card) return;
        card.classList.toggle("open");
      };

      window.openConfirm = function (id) {
        const el = document.getElementById(id);
        if (el) el.classList.add("open");
      };

      window.closePopupIfBg = function (event, id) {
        if (event.target && event.target.id === id) {
          const el = document.getElementById(id);
          if (el) el.classList.remove("open");
        }
      };

      window.onUidInput = function (input) {
        const hint = document.getElementById("createNodeTypeHint");
        const detected = document.getElementById("detectedNodeType");
        const air = document.getElementById("createAirSensors");
        const soil = document.getElementById("createSoilSensors");
        if (!input || !hint || !detected || !air || !soil) return;

        const value = String(input.value || "").trim().toLowerCase();

        if (!value) {
          hint.style.display = "none";
          air.style.display = "block";
          soil.style.display = "none";
          return;
        }

        hint.style.display = "block";

        if (value.includes("soil")) {
          detected.textContent = "Soil Node";
          air.style.display = "none";
          soil.style.display = "block";
        } else {
          detected.textContent = "Air Node";
          air.style.display = "block";
          soil.style.display = "none";
        }
      };

      window.onCreatePlotChange = function () {};

      window.switchNodeView = function (view, type = "") {
        const viewSection = document.getElementById("nodeViewSection");
        const createSection = document.getElementById("nodeCreateSection");
        const editSection = document.getElementById("nodeEditSection");

        if (viewSection) viewSection.style.display = view === "view" ? "block" : "none";
        if (createSection) createSection.style.display = view === "create" ? "block" : "none";
        if (editSection) editSection.style.display = view === "edit" ? "block" : "none";

        if (view === "create") {
          setTimeout(() => {
            const map = createCreateMap();
            if (map) map.invalidateSize(true);
          }, 120);
        }

        if (view === "edit") {
          const badge = document.getElementById("editNodeTypeBadge");
          const air = document.getElementById("editAirSensors");
          const soil = document.getElementById("editSoilSensors");
          const uid = document.getElementById("editUidDisplay");
          const name = document.getElementById("editNodeName");

          if (type === "soil") {
            if (badge) {
              badge.textContent = "Soil Node";
              badge.style.background = "#6d4c41";
            }
            if (air) air.style.display = "none";
            if (soil) soil.style.display = "block";
            if (uid) uid.value = "Soil - 0000002";
            if (name) name.value = "ขอบแปลง";
          } else {
            if (badge) {
              badge.textContent = "Air Node";
              badge.style.background = "#1565c0";
            }
            if (air) air.style.display = "block";
            if (soil) soil.style.display = "none";
            if (uid) uid.value = "Air - 0000001";
            if (name) name.value = "กลางไร่";
          }

          setTimeout(() => {
            const map = createEditMap();
            if (map) map.invalidateSize(true);
          }, 120);
        }

        window.scrollTo({ top: 0, behavior: "smooth" });
      };

      const boot = () => {
        const currentMapEl = document.getElementById("currentMap");
        if (currentMapEl) createCurrentMap();
      };

      setTimeout(boot, 250);
    }

    const timer = setTimeout(init, 250);

    return () => {
      mounted = false;
      clearTimeout(timer);

      if (styleEl && document.head.contains(styleEl)) {
        document.head.removeChild(styleEl);
      }

      if (currentMapRef.current) {
        currentMapRef.current.remove();
        currentMapRef.current = null;
      }
      if (createMapRef.current) {
        createMapRef.current.remove();
        createMapRef.current = null;
      }
      if (editMapRef.current) {
        editMapRef.current.remove();
        editMapRef.current = null;
      }

      currentMarkerRef.current = null;
      createMarkerRef.current = null;
      editMarkerRef.current = null;

      delete window.locateLeafletMap;
      delete window.toggleNodeAccordion;
      delete window.openConfirm;
      delete window.closePopupIfBg;
      delete window.onUidInput;
      delete window.onCreatePlotChange;
      delete window.switchNodeView;
    };
  }, []);

  return <DuwimsStaticPage current="node-sensor" htmlContent={htmlContent} />;
}