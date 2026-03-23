export const duwimsStyles = `:root {
  --soil: #1e3a0f;
  --leaf: #2d6a1a;
  --mint: #4caf50;
  --sage: #a5d6a7;
  --sky: #1976d2;
  --rain: #0288d1;
  --sun: #f9a825;
  --amber: #e65100;
  --alert: #c62828;
  --brown: #6d4c41;
  --text: #1b2e12;
  --muted: #5a6b4a;
  --border: rgba(45,106,26,0.16);
  --card: rgba(255,255,255,0.80);
  --bg: #eaf3e0;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Sarabun',sans-serif;background:var(--bg);color:var(--text);min-height:100vh;overflow-x:hidden}
body::before{content:'';position:fixed;inset:0;background:radial-gradient(ellipse 80% 55% at 15% 8%,rgba(76,175,80,.10) 0%,transparent 60%),radial-gradient(ellipse 55% 70% at 85% 92%,rgba(25,118,210,.08) 0%,transparent 55%),linear-gradient(160deg,#dff0d8 0%,#eaf3e0 45%,#d6ead9 100%);pointer-events:none;z-index:0}

/* ── HEADER ── */
header{position:sticky;top:0;z-index:200;background:rgba(15,40,8,.97);backdrop-filter:blur(14px);height:56px;display:flex;align-items:center;justify-content:space-between;padding:0 22px;border-bottom:2px solid rgba(76,175,80,.30);box-shadow:0 3px 18px rgba(0,0,0,.30)}
.logo{font-family:'Space Mono',monospace;font-size:16px;color:#a5d6a7;letter-spacing:2.5px;display:flex;align-items:center;gap:9px}
.logo-dot{width:8px;height:8px;background:#4caf50;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.55;transform:scale(1.4)}}
.nav-tabs{display:flex;gap:4px;background:rgba(255,255,255,.07);padding:5px;border-radius:11px}
.nav-tab{padding:6px 17px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;color:rgba(165,214,167,.70);transition:all .22s;font-family:'Sarabun',sans-serif}
.nav-tab:hover{color:#a5d6a7;background:rgba(255,255,255,.10)}
.nav-tab.active{background:#4caf50;color:#fff;box-shadow:0 3px 10px rgba(76,175,80,.45)}
.nav-select{padding:6px 13px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;border:none;background:transparent;color:rgba(165,214,167,.78);font-family:'Sarabun',sans-serif;appearance:none;outline:none;transition:all .22s}
.nav-select:hover{color:#a5d6a7;background:rgba(255,255,255,.10)}
.nav-select.active{background:#4caf50;color:#fff;box-shadow:0 3px 10px rgba(76,175,80,.45)}
.nav-select option{background:#1b3d10;color:#e0f4da;font-size:13px}
.hdr-right{font-size:11px;color:rgba(165,214,167,.60);font-family:'Space Mono',monospace;text-align:right}

/* ── LAYOUT ── */
main{position:relative;z-index:1;max-width:1440px;margin:0 auto;padding:18px 18px 40px}
#p4.page.active{padding:0!important;max-width:none;margin:0}
/* override outer main for p4 */
body:has(#p4.page.active) main{padding:0!important;max-width:none}


/* ── CARD ── */
.card{background:var(--card);backdrop-filter:blur(10px);border-radius:16px;padding:16px 18px;border:1px solid var(--border);box-shadow:0 3px 16px rgba(15,40,8,.09),0 1px 3px rgba(0,0,0,.05);position:relative;overflow:hidden}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,var(--mint),transparent);border-radius:16px 16px 0 0}
.card-title{font-size:13px;font-weight:700;color:var(--soil);margin-bottom:3px}

/* ── GRIDS ── */
.grid-top{display:grid;grid-template-columns:2.1fr 1fr 1fr;gap:14px;margin-bottom:14px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:14px}
.grid-2-1{display:grid;grid-template-columns:2fr 1fr;gap:14px}
.col-stack{display:flex;flex-direction:column;gap:14px}

/* ── WEATHER ── */
.weather-strip{display:grid;grid-template-columns:repeat(7,1fr);gap:7px;margin-top:10px}
.wd{background:linear-gradient(160deg,#f1f8e9,#e8f5e9);border-radius:12px;padding:9px 5px;text-align:center;border:1px solid rgba(76,175,80,.22);transition:transform .18s,box-shadow .18s;cursor:default}
.wd:hover{transform:translateY(-3px);box-shadow:0 6px 16px rgba(76,175,80,.18)}
.wd:first-child{background:linear-gradient(160deg,#c8e6c9,#a5d6a7);border-color:#4caf50}
.wd-name{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.wd-icon{font-size:22px;margin:5px 0 3px}
.wd-temp{font-size:15px;font-weight:700;color:var(--soil);line-height:1.1}
.wd-rain{font-size:10px;color:var(--sky);margin-top:3px;font-weight:600}

/* ── METRIC CARDS ── */
.mc{border-radius:16px;padding:16px 18px;color:#fff;position:relative;overflow:hidden;box-shadow:0 6px 20px rgba(0,0,0,.14)}
.mc::after{content:'';position:absolute;width:110px;height:110px;border-radius:50%;background:rgba(255,255,255,.09);bottom:-28px;right:-18px}
.mc-label{font-size:11px;opacity:.85;font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px}
.mc-value{font-size:26px;font-weight:700;line-height:1.05;margin-bottom:3px;font-family:'Space Mono',monospace}
.mc-sub{font-size:11px;opacity:.78;line-height:1.5}
.mc-blue{background:linear-gradient(135deg,#1565c0,#1e88e5)}
.mc-yellow{background:linear-gradient(135deg,#e65100,#fb8c00)}
.mc-red{background:linear-gradient(135deg,#b71c1c,#e53935)}
.mc-green{background:linear-gradient(135deg,#1b5e20,#2e7d32)}

/* ── MAP ── */
.map-wrapper{position:relative}
.map-ph{background:linear-gradient(160deg,#c5ddb5,#a8cc98);border-radius:14px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;border:2px solid rgba(76,175,80,.30)}
.map-lbl{font-family:'Space Mono',monospace;font-size:10px;color:rgba(15,40,8,.38);text-align:center;position:relative;z-index:0}
.fp{position:absolute;border:2px solid rgba(15,40,8,.38);background:rgba(76,175,80,.14);border-radius:4px}
.fp1{width:135px;height:95px;top:38px;left:55px;transform:rotate(-7deg)}
.fp2{width:100px;height:75px;top:95px;left:248px;transform:rotate(5deg)}
.fp3{width:85px;height:65px;bottom:38px;left:138px;transform:rotate(-3deg)}
.mpin{position:absolute;width:16px;height:16px;background:#c62828;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.28)}

.locate-btn{position:absolute;bottom:10px;left:10px;z-index:10;display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:20px;background:rgba(255,255,255,.92);border:1.5px solid rgba(76,175,80,.45);color:var(--soil);font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;box-shadow:0 2px 10px rgba(0,0,0,.16);backdrop-filter:blur(6px);transition:all .2s}
.locate-btn:hover{background:var(--mint);color:#fff;border-color:var(--mint)}
.locate-btn.locating{background:#dbeafe;border-color:#1976d2;color:#1565c0;animation:lp 1s infinite}
@keyframes lp{0%,100%{opacity:1}50%{opacity:.55}}

/* ── STATUS ── */
.status-on{background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;border-radius:16px;padding:16px 18px;box-shadow:0 6px 20px rgba(27,94,32,.22)}
.status-alert{border-radius:16px;padding:16px 18px;background:linear-gradient(135deg,rgba(255,248,225,.98),rgba(255,243,180,.85));border:1.5px solid rgba(230,81,0,.30)}
.alert-pill{background:rgba(255,255,255,.60);border:1px solid rgba(230,81,0,.35);border-radius:9px;padding:6px 10px;font-size:11px;color:#7c2d12;font-weight:600;margin-top:5px;display:flex;align-items:center;gap:5px}

/* ── PIN CARDS (Dashboard) ── */
.pin-card{background:#dcfce7;border-radius:18px;padding:13px;border:1.5px solid #4caf50;box-shadow:0 6px 20px rgba(76,175,80,.09)}
.pin-card.alert-card{background:#fef2f2;border-color:#ef4444;box-shadow:0 6px 20px rgba(239,68,68,.10)}
.pin-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:9px}
.pin-name{font-size:14px;font-weight:700;color:var(--soil)}
.pin-sub{font-size:10px;color:var(--muted);margin-top:2px}
.status-badge{padding:3px 11px;border-radius:20px;font-size:11px;font-weight:700;background:#2e7d32;color:#fff;font-family:'Space Mono',monospace}
.status-badge.off{background:#616161}
.pin-meta{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:11px}
.pm-item{background:rgba(255,255,255,.75);border:1px solid #e5e7eb;border-radius:9px;padding:6px 8px;font-size:11px}
.pm-lbl{color:#6b7280;margin-bottom:2px;font-size:10px}
.pm-val{font-weight:600;color:var(--soil);font-size:11px}
.sg{background:rgba(255,255,255,.72);border:1px solid #e5e7eb;border-radius:11px;padding:9px 10px;margin-bottom:7px}
.sg-title{font-size:11px;font-weight:700;color:var(--soil);margin-bottom:7px}
.sg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:7px}
.sg-item{background:#dcfce7;border:1px solid #4caf50;border-radius:9px;padding:7px 8px;font-size:11px}
.sg-item.ai{background:#fef2f2;border-color:#ef4444}
.sgi-name{font-weight:700;color:#166534;margin-bottom:2px;font-size:11px}
.sgi-name.ai{color:#991b1b}
.sgi-val{color:#15803d;font-weight:700;font-size:11px}
.sgi-val.ai{color:#dc2626}
.sgi-reason{font-size:10px;color:#dc2626;font-weight:700;margin-top:2px;line-height:1.3}
.sgi-range{font-size:9px;color:#7f1d1d;margin-top:1px;line-height:1.3}

/* ── HISTORY PAGE ── */
.filter-bar{background:var(--card);backdrop-filter:blur(10px);border-radius:16px;padding:16px 18px;border:1px solid var(--border);margin-bottom:14px;box-shadow:0 3px 16px rgba(15,40,8,.07)}
.filter-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.filter-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:11px;margin-bottom:11px}
.filter-quick{display:flex;gap:6px}
.quick-btn{padding:5px 13px;border-radius:20px;border:1.5px solid var(--border);background:rgba(255,255,255,.55);font-size:11px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .18s;font-family:'Sarabun',sans-serif}
.quick-btn.active,.quick-btn:hover{background:var(--mint);color:#fff;border-color:var(--mint);box-shadow:0 2px 8px rgba(76,175,80,.30)}
.form-select,.form-input{width:100%;padding:8px 11px;border-radius:11px;border:1.5px solid rgba(76,175,80,.28);background:rgba(255,255,255,.72);font-size:12px;color:var(--text);font-family:'Sarabun',sans-serif;outline:none;transition:border-color .18s}
.form-select:focus,.form-input:focus{border-color:var(--mint);box-shadow:0 0 0 3px rgba(76,175,80,.12)}

/* ── CHECKBOX GROUP ── */
.cb-group{display:flex;flex-wrap:wrap;gap:7px}
.cb-item{display:flex;align-items:center;gap:5px;padding:5px 11px;border-radius:20px;border:1.5px solid rgba(76,175,80,.28);background:rgba(255,255,255,.65);cursor:pointer;transition:all .18s;font-size:12px;font-weight:600;color:var(--muted);user-select:none}
.cb-item:hover{border-color:var(--mint);color:var(--leaf)}
.cb-item.checked{background:var(--mint);color:#fff;border-color:var(--mint);box-shadow:0 2px 7px rgba(76,175,80,.28)}
.cb-item input{display:none}

/* ── CHART ── */
.chart-card{margin-bottom:14px}
.chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}
.chart-meta{font-size:11px;color:var(--muted);line-height:1.5}
.export-btn{padding:6px 14px;border-radius:9px;background:var(--soil);color:#fff;border:none;font-size:11px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;transition:all .18s}
.export-btn:hover{background:var(--leaf)}
.chart-legend{display:flex;flex-wrap:wrap;gap:11px;margin-bottom:10px}
.legend-item{display:flex;align-items:center;gap:5px;font-size:10px;font-weight:600;color:var(--muted)}
.legend-dot{width:9px;height:9px;border-radius:50%}
.chart-area{position:relative;height:200px;background:linear-gradient(180deg,rgba(76,175,80,.05),rgba(76,175,80,.01));border-radius:11px;overflow:hidden;border:1px solid rgba(76,175,80,.10)}
.chart-grid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:8px 0}
.chart-grid-line{height:1px;background:rgba(76,175,80,.10);display:flex;align-items:center}
.chart-grid-label{font-size:8px;color:var(--muted);padding-left:5px;font-family:'Space Mono',monospace}
.chart-svg{position:absolute;inset:0}
.chart-x-labels{display:flex;justify-content:space-between;padding:0 3px;margin-top:5px}
.chart-x-label{font-size:9px;color:var(--muted);font-weight:600}
.chart-note{font-size:9px;color:var(--muted);margin-top:6px;text-align:center}

/* ── SUMMARY TABLE ── */
.summary-table{width:100%;border-collapse:collapse;font-size:11px}
.summary-table th{background:var(--soil);color:#a5d6a7;padding:9px 10px;text-align:left;font-weight:700;font-size:10px;text-transform:uppercase;letter-spacing:.5px}
.summary-table th:first-child{border-radius:11px 0 0 0}
.summary-table th:last-child{border-radius:0 11px 0 0}
.summary-table td{padding:8px 10px;border-bottom:1px solid rgba(76,175,80,.10);font-weight:500}
.summary-table tr:hover td{background:rgba(76,175,80,.05)}
.summary-table tr:last-child td{border-bottom:none}
.summary-table tr:last-child td:first-child{border-radius:0 0 0 11px}
.summary-table tr:last-child td:last-child{border-radius:0 0 11px 0}
.node-type-pill{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700}
.ntp-air{background:rgba(25,118,210,.12);color:#1565c0}
.ntp-soil{background:rgba(109,76,65,.12);color:#4e342e}

/* ── MANAGEMENT PAGE ── */
.mgmt-section{display:none}.mgmt-section.active{display:block}
.plot-list{margin-bottom:14px}
.plot-item{display:flex;align-items:center;gap:9px;padding:10px 13px;border-radius:11px;background:rgba(255,255,255,.62);border:1px solid rgba(76,175,80,.16);margin-bottom:7px;transition:all .18s;cursor:pointer}
.plot-item:hover{background:rgba(76,175,80,.09);border-color:var(--mint)}
.plot-dot{width:11px;height:11px;border-radius:3px;background:var(--mint);flex-shrink:0}
.plot-name{flex:1;font-size:12px;font-weight:600;color:var(--soil)}
.plot-badge{font-size:9px;color:var(--muted);background:rgba(76,175,80,.11);padding:2px 7px;border-radius:20px}
.edit-mode-bar{display:flex;align-items:center;gap:9px;padding:9px 13px;border-radius:11px;background:rgba(255,243,180,.88);border:1.5px solid rgba(230,81,0,.35);margin-bottom:12px;font-size:12px;font-weight:600;color:#7c2d12}
.edit-btn{padding:6px 14px;border-radius:9px;border:1.5px solid var(--amber);background:rgba(255,255,255,.68);font-size:11px;font-weight:700;color:#7c2d12;cursor:pointer;font-family:'Sarabun',sans-serif;transition:all .18s}
.edit-btn:hover{background:var(--amber);color:#fff}

/* ── NODE CARDS ── */
.node-card{background:var(--card);backdrop-filter:blur(10px);border-radius:16px;border:1px solid rgba(76,175,80,.22);overflow:hidden;margin-bottom:10px;box-shadow:0 3px 14px rgba(15,40,8,.07)}
.node-header{padding:11px 15px;background:linear-gradient(135deg,var(--soil),#2d5a1a);display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none}
.node-header-left{display:flex;align-items:center;gap:9px;flex-wrap:wrap}
.node-uid{font-family:'Space Mono',monospace;font-size:11px;color:#a5d6a7;font-weight:700}
.node-name{font-size:12px;color:#c8e6c9;font-weight:600}
.node-type-badge{padding:3px 9px;border-radius:20px;font-size:9px;font-weight:700;background:rgba(76,175,80,.22);color:#a5d6a7;letter-spacing:.5px}
.node-status-on{padding:3px 11px;border-radius:20px;font-size:10px;font-weight:700;background:#43a047;color:#fff;font-family:'Space Mono',monospace}
.node-chevron{color:#a5d6a7;font-size:13px;transition:transform .22s}
.node-card.open .node-chevron{transform:rotate(180deg)}
.node-body{display:none;padding:13px 15px}
.node-card.open .node-body{display:block}
.node-sensor-table{width:100%;border-collapse:collapse;font-size:11px}
.node-sensor-table th{background:rgba(76,175,80,.09);padding:6px 9px;text-align:left;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--muted);border-bottom:1.5px solid rgba(76,175,80,.15)}
.node-sensor-table td{padding:7px 9px;border-bottom:1px solid rgba(76,175,80,.08);font-weight:500}
.node-sensor-table tr:last-child td{border-bottom:none}
.val-green{color:#2e7d32;font-weight:700;font-family:'Space Mono',monospace}
.val-red{color:#c62828;font-weight:700;font-family:'Space Mono',monospace}
.node-actions{display:flex;gap:7px;margin-top:10px}

/* ── BUTTONS ── */
.btn-sm{padding:6px 13px;border-radius:9px;font-size:11px;font-weight:700;cursor:pointer;border:none;font-family:'Sarabun',sans-serif;transition:all .18s}
.btn-edit{background:rgba(76,175,80,.13);color:var(--leaf);border:1.5px solid rgba(76,175,80,.35)}
.btn-edit:hover{background:var(--mint);color:#fff}
.btn-del{background:rgba(198,40,40,.09);color:#c62828;border:1.5px solid rgba(198,40,40,.30)}
.btn-del:hover{background:#c62828;color:#fff}
.create-btn{padding:8px 18px;border-radius:11px;background:var(--soil);color:#a5d6a7;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;display:flex;align-items:center;gap:5px;box-shadow:0 3px 12px rgba(15,40,8,.22);transition:all .18s;margin-bottom:14px}
.create-btn:hover{background:var(--leaf);transform:translateY(-1px)}

/* ── FORM ── */
.filter-field{margin-bottom:13px}
.filter-field-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}

/* ── YIELD TABLE ── */
.yield-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;align-items:flex-end}
.yield-filter-col{display:flex;flex-direction:column;gap:3px}
.yield-table{width:100%;border-collapse:collapse;font-size:12px}
.yield-table th{background:var(--soil);color:#a5d6a7;padding:9px 13px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.yield-table th:first-child{border-radius:11px 0 0 0}
.yield-table th:last-child{border-radius:0 11px 0 0}
.yield-table td{padding:9px 13px;border-bottom:1px solid rgba(76,175,80,.10);font-weight:500}
.yield-table tr:hover td{background:rgba(76,175,80,.04)}
.yield-table tr:last-child td{border-bottom:none}
.yield-table tr:last-child td:first-child{border-radius:0 0 0 11px}
.yield-table tr:last-child td:last-child{border-radius:0 0 11px 0}
.edit-row-btn{padding:4px 10px;border-radius:7px;border:1.5px solid rgba(76,175,80,.30);background:rgba(76,175,80,.09);font-size:10px;font-weight:700;color:var(--leaf);cursor:pointer;font-family:'Sarabun',sans-serif;transition:all .18s}
.edit-row-btn:hover{background:var(--mint);color:#fff;border-color:var(--mint)}
.del-row-btn{padding:4px 10px;border-radius:7px;border:1.5px solid rgba(198,40,40,.25);background:rgba(198,40,40,.07);font-size:10px;font-weight:700;color:#c62828;cursor:pointer;font-family:'Sarabun',sans-serif;transition:all .18s}
.del-row-btn:hover{background:#c62828;color:#fff;border-color:#c62828}

/* ── POPUP ── */
.popup-overlay{position:fixed;inset:0;background:rgba(0,0,0,.48);z-index:999;display:none;align-items:center;justify-content:center;backdrop-filter:blur(5px)}
.popup-overlay.open{display:flex}
.popup-box{background:#fff;border-radius:18px;padding:22px 26px;width:460px;max-width:94vw;box-shadow:0 22px 55px rgba(0,0,0,.28);position:relative;max-height:90vh;overflow-y:auto}
.popup-title{font-size:16px;font-weight:700;color:var(--soil);margin-bottom:18px;display:flex;align-items:center;gap:7px}
.popup-close{position:absolute;top:14px;right:16px;background:none;border:none;font-size:18px;cursor:pointer;color:var(--muted);transition:color .18s}
.popup-close:hover{color:var(--alert)}
.form-field{margin-bottom:13px}
.form-field-label{font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.popup-actions{display:flex;gap:8px;justify-content:flex-end;margin-top:18px;padding-top:14px;border-top:1px solid #e5e7eb}
.btn-cancel{padding:8px 18px;border-radius:10px;border:1.5px solid #e5e7eb;background:#f9fafb;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;color:var(--muted)}
.btn-cancel:hover{border-color:#d1d5db;background:#f3f4f6}
.btn-save{padding:8px 20px;border-radius:10px;background:var(--soil);color:#a5d6a7;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;box-shadow:0 3px 12px rgba(15,40,8,.22);transition:all .18s}
.btn-save:hover{background:var(--leaf)}
.btn-confirm{padding:8px 20px;border-radius:10px;background:#c62828;color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;box-shadow:0 3px 12px rgba(198,40,40,.25);transition:all .18s}
.btn-confirm:hover{background:#b71c1c}

/* ── CONFIRM POPUP ── */
.confirm-box{background:#fff;border-radius:16px;padding:26px 28px;width:360px;max-width:94vw;box-shadow:0 20px 50px rgba(0,0,0,.26);text-align:center}
.confirm-icon{font-size:36px;margin-bottom:10px}
.confirm-title{font-size:15px;font-weight:700;color:var(--soil);margin-bottom:6px}
.confirm-sub{font-size:12px;color:var(--muted);margin-bottom:20px;line-height:1.6}
.confirm-actions{display:flex;gap:8px;justify-content:center}

/* ── MAP FILTER ROW ── */
.map-filter-row{display:flex;gap:10px;align-items:center;margin-bottom:11px;flex-wrap:wrap}

/* ── SECTION TITLE ── */
.section-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:11px;display:flex;align-items:center;gap:7px}
.section-title::after{content:'';flex:1;height:1px;background:var(--border)}

/* ── SCROLL ── */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:rgba(76,175,80,.30);border-radius:99px}

/* ── ORIGINAL DASHBOARD CSS ── */
.weather-strip{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:12px}
.weather-day{background:linear-gradient(160deg,#f0f7ea,#e4f0da);border-radius:14px;padding:10px 6px;text-align:center;border:1px solid rgba(93,184,102,.25);transition:transform .2s,box-shadow .2s;cursor:default}
.weather-day:hover{transform:translateY(-3px);box-shadow:0 8px 20px rgba(93,184,102,.20)}
.weather-day:first-child{background:linear-gradient(160deg,#d4f0d0,#b8e8b0);border-color:#2d6a1a}
.wd-name{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px}
.wd-icon{font-size:24px;margin:6px 0 4px;line-height:1}
.wd-temp{font-size:16px;font-weight:700;color:var(--soil);line-height:1}
.wd-rain{font-size:10px;color:#1976d2;margin-top:4px;font-weight:600}
.metric-card{border-radius:18px;padding:18px 20px;color:#fff;position:relative;overflow:hidden;border:none;box-shadow:0 8px 24px rgba(0,0,0,.15)}
.metric-card::after{content:'';position:absolute;width:120px;height:120px;border-radius:50%;background:rgba(255,255,255,.10);bottom:-30px;right:-20px}
.metric-card-label{font-size:12px;opacity:.85;font-weight:600;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}
.metric-card-value{font-size:28px;font-weight:700;line-height:1;margin-bottom:4px;font-family:'Space Mono',monospace}
.metric-card-sub{font-size:11px;opacity:.80;line-height:1.5}
.mc-blue{background:linear-gradient(135deg,#1565c0,#1e88e5)}
.mc-yellow{background:linear-gradient(135deg,#e65100,#fb8c00)}
.mc-red{background:linear-gradient(135deg,#b71c1c,#e53935)}
.mc-green{background:linear-gradient(135deg,#1b5e20,#2e7d32)}
.map-placeholder{background:linear-gradient(160deg,#c8ddb8,#a8c898);border-radius:16px;overflow:hidden;position:relative;display:flex;align-items:center;justify-content:center;border:2px solid rgba(76,175,80,.35)}
.map-label{font-family:'Space Mono',monospace;font-size:11px;color:rgba(15,40,8,.40);text-align:center}
.status-on{background:linear-gradient(135deg,#1b5e20,#2e7d32);color:#fff;border-radius:18px;padding:18px 20px;box-shadow:0 8px 24px rgba(27,94,32,.25)}
.status-alert{border-radius:18px;padding:18px 20px;border:1.5px solid rgba(230,81,0,.35);background:linear-gradient(135deg,rgba(255,248,225,.97),rgba(253,230,138,.82))}
.on-label{font-size:11px;opacity:.85;font-weight:600;letter-spacing:1px;text-transform:uppercase;margin-bottom:6px}
.on-value{font-size:32px;font-weight:700;font-family:'Space Mono',monospace;line-height:1}
.on-sub{font-size:18px;font-weight:600;margin-top:6px}
.alert-pill{background:rgba(255,255,255,.65);border:1px solid rgba(212,132,10,.40);border-radius:10px;padding:7px 11px;font-size:12px;color:#7c2d12;font-weight:600;margin-top:6px;display:flex;align-items:center;gap:6px}
.pin-card{background:#dcfce7;border-radius:20px;padding:14px;border:1.5px solid #22c55e;box-shadow:0 8px 24px rgba(22,163,74,.10)}
.pin-card.alert-card{background:#fee2e2;border-color:#ef4444;box-shadow:0 8px 24px rgba(239,68,68,.12)}
.pin-header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px}
.pin-name{font-size:15px;font-weight:700;color:var(--soil)}
.pin-sub{font-size:11px;color:var(--muted);margin-top:2px}
.status-badge{padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;background:#16a34a;color:#fff;font-family:'Space Mono',monospace}
.status-badge.off{background:#6b7280}
.pin-pills{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:12px}
.pin-pill{background:rgba(255,255,255,.80);border:1px solid #e5e7eb;border-radius:10px;padding:7px 8px;font-size:11px}
.pp-label{color:#6b7280;margin-bottom:2px;line-height:1.2}
.pp-val{font-weight:600;color:var(--soil);line-height:1.35}
.sensor-group{background:rgba(255,255,255,.75);border:1px solid #e5e7eb;border-radius:12px;padding:10px 11px;margin-bottom:8px}
.sg-title{font-size:12px;font-weight:700;color:var(--soil);margin-bottom:8px}
.sg-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.sg-item{background:#dcfce7;border:1px solid #22c55e;border-radius:10px;padding:8px 9px;font-size:11px}
.sg-item.alert-item{background:#fee2e2;border-color:#ef4444}
.sgi-name{font-weight:700;color:#166534;margin-bottom:2px}
.sgi-name.alert{color:#991b1b}
.sgi-val{color:#15803d;font-weight:700}
.sgi-val.alert{color:#dc2626}
.sgi-reason{font-size:10px;color:#dc2626;font-weight:700;margin-top:3px}
.sgi-range{font-size:10px;color:#7f1d1d;margin-top:2px}
.sgi-ts{font-size:10px;color:#9ca3af;margin-top:3px}
/* ── VALUE / MIN / MAX FORMAT ── */
.sgi-vmm{display:flex;flex-direction:column;gap:3px;margin-top:4px}
.sgi-row{display:flex;align-items:baseline;gap:5px;line-height:1.25}
.sgi-row-label{font-size:9px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;min-width:36px;flex-shrink:0}
.sgi-row-val{font-size:11px;font-weight:700;font-family:'Space Mono',monospace;color:#15803d}
.sgi-row-val.av{color:#dc2626}
.sgi-row-val.dash{color:#9ca3af}
.sgi-row-sub{font-size:9px;color:#6b7280;font-family:'Space Mono',monospace}
.section-title{font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:var(--muted);margin-bottom:12px;display:flex;align-items:center;gap:8px}
.section-title::after{content:'';flex:1;height:1px;background:var(--border)}

/* ── ORIGINAL HISTORY CSS ── */
.filter-bar{background:var(--card);backdrop-filter:blur(10px);border-radius:18px;padding:18px 20px;border:1px solid var(--border);margin-bottom:16px;box-shadow:0 4px 20px rgba(15,40,8,.08)}
.filter-title{font-size:14px;font-weight:700;color:var(--soil);margin-bottom:14px;display:flex;align-items:center;gap:8px}
.filter-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
.filter-label{font-size:11px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px}
.filter-quick{display:flex;gap:6px}
.quick-btn{padding:6px 14px;border-radius:20px;border:1.5px solid var(--border);background:rgba(255,255,255,.6);font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .2s;font-family:'Sarabun',sans-serif}
.quick-btn.active,.quick-btn:hover{background:#4caf50;color:#fff;border-color:#4caf50;box-shadow:0 3px 10px rgba(76,175,80,.35)}
.form-select,.form-input{width:100%;padding:9px 12px;border-radius:12px;border:1.5px solid rgba(76,175,80,.28);background:rgba(255,255,255,.75);font-size:13px;color:var(--text);font-family:'Sarabun',sans-serif;outline:none;transition:border-color .2s}
.form-select:focus,.form-input:focus{border-color:#4caf50;box-shadow:0 0 0 3px rgba(76,175,80,.14)}
.tag-row{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.tag{padding:4px 10px;border-radius:20px;font-size:11px;font-weight:600;background:rgba(76,175,80,.14);color:#2d6a1a;border:1px solid rgba(76,175,80,.30)}

/* ── SENSOR CHECKBOX ── */
.sensor-cb{display:inline-flex;align-items:center;gap:6px;padding:6px 12px;border-radius:20px;border:1.5px solid rgba(76,175,80,.28);background:rgba(255,255,255,.60);font-size:12px;font-weight:600;color:var(--muted);cursor:pointer;transition:all .18s;user-select:none}
.sensor-cb input{display:none}
.sensor-cb:hover{border-color:var(--mint);color:var(--leaf)}
.sensor-cb.checked{background:var(--mint);color:#fff;border-color:var(--mint);box-shadow:0 2px 8px rgba(76,175,80,.28)}
.sensor-cb span{pointer-events:none}

/* ── SENSOR DROPDOWN MULTI-SELECT ── */
.sensor-dd-wrap{position:relative}
.sensor-dd-trigger{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;border-radius:12px;border:1.5px solid rgba(76,175,80,.30);background:rgba(255,255,255,.80);font-size:13px;font-weight:500;color:var(--text);cursor:pointer;transition:all .18s;user-select:none;min-height:42px}
.sensor-dd-trigger:hover,.sensor-dd-trigger.open{border-color:var(--mint);box-shadow:0 0 0 3px rgba(76,175,80,.12)}
.sensor-dd-arrow{font-size:13px;color:var(--muted);transition:transform .22s;flex-shrink:0;margin-left:8px;font-style:normal}
.sensor-dd-arrow.open{transform:rotate(180deg)}

.sensor-dd-menu{position:absolute;top:calc(100% + 5px);left:0;z-index:600;background:#fff;border-radius:18px;box-shadow:0 14px 40px rgba(15,40,8,.18),0 2px 8px rgba(0,0,0,.08);overflow:hidden;display:none;width:520px;max-width:96vw}
.sensor-dd-menu.open{display:block}

/* gradient header like screenshot */
.sensor-dd-header{display:flex;align-items:center;justify-content:space-between;padding:13px 18px 12px;background:linear-gradient(135deg,#3d6b8e 0%,#5b8fa8 40%,#7aab8f 100%)}
.sensor-dd-header-title{font-size:13px;font-weight:700;color:#fff}
.sensor-dd-clear{background:none;border:none;font-size:12px;font-weight:700;color:#ff8a80;cursor:pointer;font-family:'Sarabun',sans-serif;padding:3px 8px;border-radius:6px;transition:all .15s}
.sensor-dd-clear:hover{background:rgba(255,255,255,.18);color:#fff}

/* 2-column grid */
.sensor-dd-grid{display:grid;grid-template-columns:1fr 1fr;padding:10px 8px;gap:2px;background:#fff}

.sensor-dd-item{display:flex;align-items:center;gap:10px;padding:11px 12px;font-size:13px;font-weight:500;color:#1a1a2e;cursor:pointer;transition:background .12s;border-radius:10px;user-select:none}
.sensor-dd-item:hover{background:#f5f9f5}
.sensor-dd-item.checked{background:#eef6ee}

.sensor-dd-box{width:19px;height:19px;border-radius:5px;border:2px solid #bdbdbd;background:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:900;flex-shrink:0;transition:all .15s;color:transparent}
.sensor-dd-item.checked .sensor-dd-box{background:#1565c0;border-color:#1565c0;color:#fff}

.sensor-dd-name{flex:1;font-size:13px;font-weight:500;color:#1a1a2e;line-height:1.2}
.sensor-dd-unit{font-size:11px;color:#9e9e9e;font-weight:500;min-width:26px;text-align:right;flex-shrink:0;font-family:'Space Mono',monospace}

.sensor-dd-footer{padding:10px 16px 14px;background:#fff;border-top:1px solid #f0f4ec;display:flex;justify-content:flex-end}
.sensor-dd-done{padding:10px 32px;border-radius:24px;background:#1a2e1a;color:#fff;border:none;font-size:13px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;transition:background .18s;box-shadow:0 3px 12px rgba(15,40,8,.25)}
.sensor-dd-done:hover{background:#2e5c1a}
.chart-card{margin-bottom:16px}
.chart-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.chart-meta{font-size:12px;color:var(--muted);line-height:1.5}
.export-btn{padding:7px 16px;border-radius:10px;background:var(--soil);color:#fff;border:none;font-size:12px;font-weight:700;cursor:pointer;font-family:'Sarabun',sans-serif;letter-spacing:.5px;transition:all .2s}
.export-btn:hover{background:#2d6a1a}
.chart-legend{display:flex;flex-wrap:wrap;gap:12px;margin-bottom:12px}
.legend-item{display:flex;align-items:center;gap:5px;font-size:11px;font-weight:600;color:var(--muted)}
.legend-dot{width:10px;height:10px;border-radius:50%}
.chart-area{position:relative;height:220px;background:linear-gradient(180deg,rgba(76,175,80,.05),rgba(76,175,80,.01));border-radius:12px;overflow:hidden;border:1px solid rgba(76,175,80,.12)}
.chart-grid{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:space-between;padding:10px 0}
.chart-grid-line{height:1px;background:rgba(76,175,80,.12);display:flex;align-items:center}
.chart-grid-label{font-size:9px;color:var(--muted);padding-left:6px;font-family:'Space Mono',monospace}
.chart-svg{position:absolute;inset:0}
.chart-x-labels{display:flex;justify-content:space-between;padding:0 4px;margin-top:6px}
.chart-x-label{font-size:10px;color:var(--muted);font-weight:600}
.chart-note{font-size:10px;color:var(--muted);margin-top:8px;text-align:center}
.summary-table{width:100%;border-collapse:collapse;font-size:12px}
.summary-table th{background:var(--soil);color:#b8e0b0;padding:10px 12px;text-align:left;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px}
.summary-table th:first-child{border-radius:12px 0 0 0}
.summary-table th:last-child{border-radius:0 12px 0 0}
.summary-table td{padding:9px 12px;border-bottom:1px solid rgba(76,175,80,.12);font-weight:500;color:var(--text)}
.summary-table tr:hover td{background:rgba(76,175,80,.06)}
.summary-table tr:last-child td{border-bottom:none}
.summary-table tr:last-child td:first-child{border-radius:0 0 0 12px}
.summary-table tr:last-child td:last-child{border-radius:0 0 12px 0}

/* ── RESPONSIVE ── */
@media(max-width:900px){
  .grid-top{grid-template-columns:1fr}
  .weather-strip{grid-template-columns:repeat(4,1fr)}
  .filter-grid{grid-template-columns:1fr 1fr}
  .sg-grid{grid-template-columns:1fr 1fr}
  .grid-2,.grid-2-1,.grid-3{grid-template-columns:1fr}
  .pin-meta{grid-template-columns:repeat(2,1fr)}
}
@media(max-width:600px){
  header{padding:0 13px}
  main{padding:12px 12px 28px}
  .weather-strip{grid-template-columns:repeat(3,1fr)}
  .filter-grid{grid-template-columns:1fr}
}

/* ── HEAT MAP PAGE ── */
#p4.page.active{padding:0!important}
.hm-wrap{display:flex;height:calc(100vh - 56px);min-height:500px;background:#0d1f35;overflow:hidden}

/* LEFT: Map area */
.hm-left{position:relative;flex:1;min-width:0;display:flex;flex-direction:column;overflow:hidden}
.hm-map-area{position:relative;flex:1;overflow:hidden}
.hm-map-bg{position:absolute;inset:0;background:
  radial-gradient(ellipse 90% 60% at 25% 35%,rgba(200,80,20,.65) 0%,rgba(230,130,50,.45) 18%,rgba(180,80,20,.30) 35%,transparent 55%),
  radial-gradient(ellipse 55% 50% at 75% 25%,rgba(140,200,80,.35) 0%,rgba(90,170,60,.25) 30%,transparent 55%),
  radial-gradient(ellipse 60% 45% at 55% 65%,rgba(40,130,210,.45) 0%,rgba(30,100,190,.35) 30%,transparent 55%),
  radial-gradient(ellipse 40% 35% at 85% 75%,rgba(50,160,200,.40) 0%,rgba(30,130,180,.28) 30%,transparent 50%),
  radial-gradient(ellipse 35% 40% at 10% 70%,rgba(120,60,160,.35) 0%,rgba(90,40,140,.25) 30%,transparent 55%),
  linear-gradient(160deg,#1a0d2e 0%,#0d1f35 30%,#0d2e1f 60%,#1a1a0d 100%)}
.hm-temp-overlay{position:absolute;inset:0;pointer-events:none;transition:background .6s ease}
.hm-wind-svg{position:absolute;inset:0;width:100%;height:100%}
.hm-city{position:absolute;z-index:5;font-size:9.5px;color:rgba(255,255,255,.65);font-family:'Sarabun',sans-serif;line-height:1.25;text-shadow:0 1px 3px rgba(0,0,0,.7)}

/* sensor badge top-left */
.hm-sensor-badge{position:absolute;top:12px;left:12px;z-index:10;display:flex;align-items:center;gap:8px;background:rgba(255,140,0,.90);backdrop-filter:blur(8px);border-radius:22px;padding:6px 13px;cursor:pointer;box-shadow:0 2px 12px rgba(0,0,0,.35);transition:background .2s}
.hm-sensor-badge:hover{background:rgba(255,140,0,1)}

/* zoom buttons */
.hm-zoom-btn{width:32px;height:32px;background:rgba(255,255,255,.13);border:1px solid rgba(255,255,255,.28);border-radius:8px;color:#fff;font-size:18px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;line-height:1;font-family:monospace}
.hm-zoom-btn:hover{background:rgba(255,255,255,.25)}

/* scale bar on map */
.hm-scale-wrap{position:absolute;right:12px;top:55px;bottom:10px;z-index:6;display:flex;flex-direction:column;align-items:flex-end;gap:2px}
.hm-scale-unit{font-size:10px;color:rgba(255,255,255,.80);font-weight:700;font-family:'Space Mono',monospace;background:rgba(0,0,0,.55);padding:2px 6px;border-radius:4px;margin-bottom:3px}
.hm-scale-bar-wrap{display:flex;flex-direction:row;gap:3px;flex:1;min-height:0}
.hm-scale-bar{width:14px;border-radius:4px;background:linear-gradient(180deg,#fff 0%,#e3f2fd 4%,#ffccbc 12%,#ff7043 20%,#ffb300 30%,#c6ff00 40%,#00e5ff 52%,#2979ff 63%,#651fff 75%,#e91e63 88%,#880e4f 100%)}
.hm-scale-ticks{display:flex;flex-direction:column;justify-content:space-between;padding:1px 0}
.hm-scale-ticks span{font-size:9px;color:rgba(255,255,255,.62);font-family:'Space Mono',monospace;line-height:1}
.hm-tick-red{color:#ff7043!important;font-weight:700!important}
.hm-tick-green{color:#69f0ae!important;font-weight:700!important}
.hm-tick-blue{color:#40c4ff!important;font-weight:700!important}

/* ── Date + controls strip INSIDE map (bottom) ── */
.hm-date-strip{background:rgba(8,18,35,.55);backdrop-filter:blur(6px);padding:8px 12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;border-top:1px solid rgba(255,255,255,.06)}
.hm-date-lbl{font-size:9px;color:rgba(165,214,167,.55);font-weight:700;text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
.hm-date-pill{display:flex;align-items:center;gap:7px;background:rgba(255,255,255,.10);border:1px solid rgba(165,214,167,.22);border-radius:20px;padding:5px 12px;color:rgba(165,214,167,.88);font-size:11px;font-weight:600;font-family:'Space Mono',monospace;cursor:pointer;transition:background .15s;position:relative}
.hm-date-pill:hover{background:rgba(255,255,255,.22)}

/* ── Controls bar bottom ── */
.hm-controls-bar{background:rgba(5,12,28,.97);border-top:1px solid rgba(165,214,167,.10);padding:6px 14px 4px;flex-shrink:0}
.hm-timeline-row{display:flex;align-items:center;gap:10px;margin-bottom:2px}
.hm-play-btn{width:32px;height:32px;background:#4caf50;border:none;border-radius:50%;color:#fff;font-size:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:background .15s;box-shadow:0 2px 8px rgba(76,175,80,.45)}
.hm-play-btn:hover{background:#2d6a1a}
.hm-play-btn.playing{background:#c62828}
.hm-tl-wrap{flex:1;position:relative;padding-bottom:16px}
.hm-timeline-track{height:4px;background:rgba(255,255,255,.14);border-radius:3px;position:relative;cursor:pointer}
.hm-timeline-thumb{position:absolute;top:50%;transform:translate(-50%,-50%);width:14px;height:14px;background:#4caf50;border:2.5px solid #fff;border-radius:50%;box-shadow:0 2px 8px rgba(0,0,0,.50);cursor:grab}
.hm-timeline-labels{position:absolute;bottom:-15px;left:0;right:0;display:flex;justify-content:space-between;font-size:9px;color:rgba(165,214,167,.48);font-family:'Space Mono',monospace;line-height:1.3}
.hm-date-row{display:flex;align-items:center;gap:9px;padding-left:42px}
.hm-change-date-btn{padding:3px 10px;border-radius:6px;background:rgba(255,255,255,.08);border:1px solid rgba(165,214,167,.20);color:rgba(165,214,167,.72);font-size:10px;font-weight:600;cursor:pointer;font-family:'Sarabun',sans-serif;transition:background .15s}
.hm-change-date-btn:hover{background:rgba(255,255,255,.16)}

/* RIGHT: Legend panel */
.hm-right{width:300px;flex-shrink:0;background:rgba(240,252,244,0.97);border-left:1px solid #c8e6c9;display:flex;flex-direction:column;overflow:hidden}
.hm-right-inner{padding:16px 16px 12px;overflow-y:auto;flex:1}
.hm-legend-title{font-size:15px;font-weight:700;color:#1b2e12;margin-bottom:14px}
.hm-legend-grad{height:9px;border-radius:5px;background:linear-gradient(90deg,#ff7043,#ffd54f,#66bb6a,#26c6da,#42a5f5,#81d4fa,#8d6e63,#ef5350,#ffee58,#26a69a);margin-bottom:5px}
.hm-legend-grad-labels{display:flex;justify-content:space-between;font-size:10px;color:#5a6b4a;font-weight:600;margin-bottom:16px}

.hm-legend-section-title{font-size:10px;font-weight:700;color:#5a6b4a;text-transform:uppercase;letter-spacing:.6px;margin-bottom:8px}
.hm-sensor-list{display:flex;flex-direction:column;gap:2px}
.hm-sensor-item{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:all .15s;border:1.5px solid transparent}
.hm-sensor-item:hover{background:rgba(76,175,80,.09);border-color:rgba(76,175,80,.20)}
.hm-sensor-item.active{background:rgba(76,175,80,.14);border-color:rgba(76,175,80,.40)}
.hm-si-dot{width:11px;height:11px;border-radius:50%;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.20)}
.hm-si-info{flex:1;min-width:0}
.hm-si-name{font-size:12px;font-weight:600;color:#1b2e12;line-height:1.2}
.hm-si-range{font-size:10px;color:#5a6b4a;margin-top:1px}
.hm-si-check{font-size:12px;color:#2e7d32;font-weight:700;width:16px;text-align:center;flex-shrink:0}

/* plot dropdown inside right panel */
.hm-plot-dd{width:100%;padding:8px 10px;border-radius:10px;border:1.5px solid #c8e6c9;background:#fff;font-size:12px;color:#1b2e12;font-family:'Sarabun',sans-serif;outline:none;cursor:pointer;margin-bottom:14px}
.hm-plot-dd:focus{
  border-color:#4caf50;
  box-shadow:0 0 0 3px rgba(76,175,80,.12)
}

/* topbar auth */
.topbar-shell{
  position:sticky;
  top:0;
  z-index:30;
}
.topbar-right-tools{
  display:flex;
  align-items:center;
  gap:10px;
}
.topbar-auth{
  display:flex;
  align-items:center;
  gap:8px;
  flex-wrap:wrap;
}
.auth-btn{
  appearance:none;
  border:none;
  text-decoration:none;
  display:inline-flex;
  align-items:center;
  justify-content:center;
  min-height:38px;
  padding:0 14px;
  border-radius:12px;
  font-size:13px;
  font-weight:700;
  cursor:pointer;
  transition:.2s ease;
}
.auth-btn:hover{ transform:translateY(-1px); }
.auth-btn-ghost{
  background:#fff;
  color:#1f2937;
  border:1px solid rgba(255,255,255,.55);
  box-shadow:0 8px 18px rgba(17,24,39,.08);
}
.auth-btn-primary{
  background:linear-gradient(135deg,#ef4444,#dc2626);
  color:#fff;
  box-shadow:0 10px 20px rgba(220,38,38,.25);
}
@media (max-width: 1180px){
  .topbar-shell{ flex-wrap:wrap; gap:12px; }
  .topbar-right-tools{ width:100%; justify-content:space-between; }
}
@media (max-width: 760px){
  .topbar-right-tools, .topbar-auth{ width:100%; }
  .topbar-auth .auth-btn{ flex:1; }
}
`;