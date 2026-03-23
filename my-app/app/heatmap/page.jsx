"use client";

import DuwimsStaticPage from "../components/DuwimsStaticPage";

const htmlContent = `<div id="p4" class="page">
  <div class="hm-wrap">

    <!-- ════ LEFT: MAP ════ -->
    <div class="hm-left">

      <!-- Map area -->
      <div class="hm-map-area" id="hmMapOuter">
        <div class="hm-map-bg"></div>
        <svg class="hm-wind-svg" viewBox="0 0 900 520" preserveAspectRatio="xMidYMid slice">
          <defs><filter id="glow"><feGaussianBlur stdDeviation="1.5" result="blur"/><feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
          <g stroke="rgba(255,255,255,0.22)" stroke-width="1.1" fill="none" filter="url(#glow)">
            <path d="M0,80 C60,60 120,100 180,80 S300,60 360,80 S480,100 540,75 S660,50 720,70 S840,90 900,70"/>
            <path d="M0,130 C50,110 110,150 170,130 S290,110 350,135 S470,155 530,130 S650,105 710,125 S830,145 900,120"/>
            <path d="M0,190 C70,170 140,210 200,185 S320,160 380,190 S500,215 560,188 S680,162 740,185 S860,210 900,185"/>
            <path d="M0,250 C55,230 115,265 175,248 S295,228 355,255 S475,278 535,250 S655,222 715,248 S835,272 900,248"/>
            <path d="M0,315 C65,295 125,330 185,310 S305,285 365,315 S485,340 545,310 S665,280 725,308 S845,335 900,312"/>
            <path d="M0,375 C70,355 130,390 190,372 S310,350 370,378 S490,402 550,375 S670,348 730,372 S850,398 900,374"/>
            <path d="M0,435 C60,415 120,448 180,432 S300,412 360,438 S480,460 540,435 S660,408 720,433 S840,458 900,434"/>
            <path d="M150,0 C130,60 170,120 145,180 S115,240 150,300 S180,360 148,420 S120,480 150,520"/>
            <path d="M320,0 C300,55 340,115 315,175 S285,235 320,295 S350,355 318,415 S290,475 320,520"/>
            <path d="M490,0 C470,58 510,118 485,178 S455,238 490,298 S520,358 488,418 S460,478 490,520"/>
            <path d="M660,0 C640,62 680,122 655,182 S625,242 660,302 S690,362 658,422 S630,482 660,520"/>
            <path d="M830,0 C810,60 850,120 825,180 S795,240 830,300 S860,360 828,420 S800,480 830,520"/>
            <ellipse cx="420" cy="260" rx="80" ry="55" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
            <ellipse cx="420" cy="260" rx="50" ry="34" stroke="rgba(255,255,255,0.09)" stroke-width="1"/>
            <ellipse cx="750" cy="400" rx="70" ry="48" stroke="rgba(255,255,255,0.12)" stroke-width="1.5"/>
            <ellipse cx="120" cy="350" rx="60" ry="42" stroke="rgba(255,255,255,0.10)" stroke-width="1.2"/>
          </g>
          <g fill="rgba(255,255,255,0.28)" stroke="none">
            <polygon points="180,78 172,82 172,74"/><polygon points="360,78 352,82 352,74"/>
            <polygon points="540,73 532,77 532,69"/><polygon points="720,68 712,72 712,64"/>
            <polygon points="355,133 347,137 347,129"/><polygon points="535,128 527,132 527,124"/>
            <polygon points="380,188 372,192 372,184"/><polygon points="560,186 552,190 552,182"/>
            <polygon points="370,253 362,257 362,249"/><polygon points="550,248 542,252 542,244"/>
          </g>
          <g stroke="rgba(255,255,255,0.28)" stroke-width="1.2" fill="none">
            <path d="M200,20 Q260,30 310,55 Q350,75 370,90 Q400,100 430,85 Q470,68 520,72 Q570,78 610,60 Q650,42 690,38 Q740,32 800,20"/>
            <path d="M370,95 Q380,120 375,150 Q368,175 380,195 Q395,215 405,240 Q415,265 410,285 Q400,305 410,325"/>
            <path d="M520,280 Q560,268 610,275 Q660,282 700,310 Q735,338 745,375 Q752,408 738,440 Q720,468 690,480 Q655,490 618,485 Q580,478 548,460 Q515,440 498,410 Q482,378 488,345 Q495,312 520,280"/>
            <path d="M270,105 Q280,130 275,160 Q265,190 270,215 Q280,240 295,250"/>
            <path d="M155,140 Q148,175 152,210 Q158,245 165,278 Q170,310 165,345 Q158,375 152,400"/>
          </g>
          <g fill="rgba(255,255,255,0.55)" stroke="none">
            <circle cx="300" cy="100" r="2.5"/><circle cx="235" cy="140" r="2"/>
            <circle cx="175" cy="115" r="2"/><circle cx="380" cy="200" r="2"/>
            <circle cx="395" cy="225" r="2"/><circle cx="150" cy="310" r="2"/>
            <circle cx="665" cy="430" r="2.5"/><circle cx="50" cy="95" r="2"/>
          </g>
        </svg>
        <div class="hm-temp-overlay" id="hmTempOverlay"></div>

        <!-- sensor badge top-left -->
        <div class="hm-sensor-badge" id="hmSensorBadge">
          <span style="font-size:16px" id="hmSensorEmoji">🌡</span>
          <div>
            <div id="hmSensorLabel" style="font-size:12px;font-weight:700">Temperature</div>
            <div style="font-size:10px;opacity:.75">°F · ICON</div>
          </div>
        </div>

        <!-- top-left city -->
        <div style="position:absolute;top:60px;left:14px;z-index:6;font-size:10px;color:rgba(255,255,255,.58)">Istanbul</div>

        <!-- ventusky logo -->
        <div style="position:absolute;top:12px;right:14px;z-index:6;display:flex;align-items:center;gap:5px">
          <span style="font-size:13px;color:#fff;opacity:.80">▼</span>
          <span style="font-size:14px;font-weight:700;color:#fff;letter-spacing:.5px;font-family:'Space Mono',monospace">ventusky</span>
        </div>

        <!-- zoom -->
        <div style="position:absolute;top:55px;right:14px;z-index:6;display:flex;flex-direction:column;gap:3px">
          <button class="hm-zoom-btn">+</button>
          <button class="hm-zoom-btn">−</button>
        </div>

        <!-- city labels -->
        <div class="hm-city" style="top:82px;left:158px">成都市<br><span style="font-size:8px;opacity:.65">(Chengdu)</span></div>
        <div class="hm-city" style="top:50px;left:262px">上海市<br><span style="font-size:8px;opacity:.65">(Shanghai)</span></div>
        <div class="hm-city" style="top:82px;left:218px">广州市<br><span style="font-size:8px;opacity:.65">(Guangzhou)</span></div>
        <div class="hm-city" style="top:88px;left:90px">Delhi</div>
        <div class="hm-city" style="top:98px;left:138px">Dhaka<br><span style="font-size:8px;opacity:.65">(ঢাকা)</span></div>
        <div class="hm-city" style="top:168px;left:210px">Thành phố<br>Hồ Chí Minh</div>
        <div class="hm-city" style="top:225px;left:230px">Jakarta</div>
        <div class="hm-city" style="top:205px;left:132px">Bengaluru</div>
        <div class="hm-city" style="bottom:100px;right:120px">Melbourne</div>
        <div style="position:absolute;top:52px;left:12px;z-index:5;font-size:9px;color:rgba(255,255,255,.55)">(東京都)<br>Tokyo</div>

        <!-- scale bar -->
        <div class="hm-scale-wrap">
          <div class="hm-scale-unit">°F</div>
          <div class="hm-scale-bar-wrap">
            <div class="hm-scale-bar"></div>
            <div class="hm-scale-ticks">
              <span>120</span><span>100</span><span>90</span>
              <span class="hm-tick-red">80</span>
              <span>70</span><span>60</span><span>50</span>
              <span class="hm-tick-green">40</span>
              <span>30</span><span>20</span><span>10</span>
              <span class="hm-tick-blue">0</span>
              <span>−10</span><span>−20</span><span>−40</span>
            </div>
          </div>
        </div>

        <!-- 12 AM label -->
        <div style="position:absolute;bottom:58px;left:50%;transform:translateX(-50%);z-index:6;font-size:9px;color:rgba(255,255,255,.60);font-family:'Space Mono',monospace;background:rgba(0,0,0,.30);padding:1px 6px;border-radius:4px">12 AM</div>

      </div><!-- /hm-map-area -->

      <!-- Date strip -->
      <div class="hm-date-strip">
        <div>
          <div class="hm-date-lbl">วันที่เริ่มต้น</div>
          <label class="hm-date-pill" onclick="this.querySelector('input').showPicker?.()">
            <span id="hmStartDateDisplay">20/11/2565</span>
            <span>📅</span>
            <input type="date" id="hmStartDateInput" value="2022-11-20" style="position:absolute;opacity:0;width:0;height:0;pointer-events:none" onchange="hmDateChange('start',this)">
          </label>
        </div>
        <div>
          <div class="hm-date-lbl">วันที่สิ้นสุด</div>
          <label class="hm-date-pill" onclick="this.querySelector('input').showPicker?.()">
            <span id="hmEndDateDisplay">20/11/2565</span>
            <span>📅</span>
            <input type="date" id="hmEndDateInput" value="2022-11-20" style="position:absolute;opacity:0;width:0;height:0;pointer-events:none" onchange="hmDateChange('end',this)">
          </label>
        </div>
      </div>

      <!-- Controls bar -->
      <div class="hm-controls-bar">
        <div class="hm-timeline-row">
          <button class="hm-play-btn" id="hmPlayBtn" onclick="toggleHmPlay(this)">▶</button>
          <div class="hm-tl-wrap">
            <div class="hm-timeline-track" id="hmTrack" onclick="hmTrackClick(event)">
              <div class="hm-timeline-thumb" id="hmThumb" style="left:20%"></div>
            </div>
            <div class="hm-timeline-labels">
              <span>1:00<br><span style="opacity:.5">AM</span></span>
              <span>7:00<br><span style="opacity:.5">AM</span></span>
              <span>1:00<br><span style="opacity:.5">PM</span></span>
              <span>7:00<br><span style="opacity:.5">PM</span></span>
            </div>
          </div>
        </div>
        <div class="hm-date-row">
          <span style="font-size:11px;color:rgba(165,214,167,.72);font-weight:600;font-family:'Space Mono',monospace">Sunday, 2026/03/22</span>
          <button class="hm-change-date-btn">Change date</button>
          <span style="font-size:10px;color:rgba(165,214,167,.45);margin-left:4px">▾</span>
        </div>
      </div>

    </div><!-- /hm-left -->

    <!-- ════ RIGHT: LEGEND PANEL ════ -->
    <div class="hm-right">
      <div class="hm-right-inner">

        <!-- Plot dropdown -->
        <div style="margin-bottom:14px">
          <div style="font-size:10px;font-weight:700;color:#5a6b4a;text-transform:uppercase;letter-spacing:.6px;margin-bottom:6px">🌿 เลือกแปลง</div>
          <select class="hm-plot-dd" onchange="selectHmPlotDd(this)">
            <option value="all">ทุกแปลง</option>
            <option value="1">แปลง 1</option>
            <option value="2">แปลง 2</option>
            <option value="3">แปลง 3</option>
            <option value="4">แปลง 4</option>
          </select>
        </div>

        <!-- Legend title -->
        <div class="hm-legend-title">Legend (Rain Intensity)</div>

        <!-- Gradient bar -->
        <div class="hm-legend-grad"></div>
        <div class="hm-legend-grad-labels"><span>น้อย</span><span>มาก</span></div>

        <!-- Sensor list -->
        <div class="hm-legend-section-title">จุดข้อมูลตัวอย่าง</div>
        <div class="hm-sensor-list">

          <div class="hm-sensor-item active" onclick="selectHmSensor(this,'temp','🌡','Temperature','#ff7043')">
            <div class="hm-si-dot" style="background:#ff7043"></div>
            <div class="hm-si-info"><div class="hm-si-name">อุณหภูมิ</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check">✓</div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'humidity','💧','ความชื้นสัมพัทธ์','#42a5f5')">
            <div class="hm-si-dot" style="background:#42a5f5"></div>
            <div class="hm-si-info"><div class="hm-si-name">ความชื้นสัมพัทธ์</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'wind','🌬','ความเร็วลม','#81d4fa')">
            <div class="hm-si-dot" style="background:#81d4fa"></div>
            <div class="hm-si-info"><div class="hm-si-name">วัดความเร็วลม</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'light','☀️','ความเข้มแสง','#ffd54f')">
            <div class="hm-si-dot" style="background:#ffd54f"></div>
            <div class="hm-si-info"><div class="hm-si-name">ความเข้มแสง</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'rain','🌧','ปริมาณน้ำฝน','#26c6da')">
            <div class="hm-si-dot" style="background:#26c6da"></div>
            <div class="hm-si-info"><div class="hm-si-name">ปริมาณน้ำฝน</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'soil','🌱','ความชื้นในดิน','#66bb6a')">
            <div class="hm-si-dot" style="background:#66bb6a"></div>
            <div class="hm-si-info"><div class="hm-si-name">ความชื้นในดิน</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'n','🧪','N (ไนโตรเจน)','#8d6e63')">
            <div class="hm-si-dot" style="background:#8d6e63"></div>
            <div class="hm-si-info"><div class="hm-si-name">N</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'p','🧪','P (ฟอสฟอรัส)','#ef5350')">
            <div class="hm-si-dot" style="background:#ef5350"></div>
            <div class="hm-si-info"><div class="hm-si-name">P</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'k','🧪','K (โพแทสเซียม)','#ffee58')">
            <div class="hm-si-dot" style="background:#ffee58"></div>
            <div class="hm-si-info"><div class="hm-si-name">K</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

          <div class="hm-sensor-item" onclick="selectHmSensor(this,'water','🚿','ความพร้อมใช้น้ำ','#26a69a')">
            <div class="hm-si-dot" style="background:#26a69a"></div>
            <div class="hm-si-info"><div class="hm-si-name">การให้น้ำ / ความพร้อมใช้น้ำ</div><div class="hm-si-range">ช่วงเฉลี่ย 58/100</div></div>
            <div class="hm-si-check"></div>
          </div>

        </div><!-- /hm-sensor-list -->
      </div>
    </div><!-- /hm-right -->

  </div><!-- /hm-wrap -->
</div>`;

export default function Page() {
  return <DuwimsStaticPage current="heatmap" htmlContent={htmlContent} />;
}
