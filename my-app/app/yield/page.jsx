"use client";

import DuwimsStaticPage from "../components/DuwimsStaticPage";

const htmlContent = `
<div class="page-content">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:13px;flex-wrap:wrap;gap:9px">
    <div class="card-title" style="font-size:15px">🌾 Management Planting</div>
    <button
      class="create-btn"
      style="margin-bottom:0"
      onclick="document.getElementById('createYieldPopup')?.classList.add('open')"
    >
      ＋ เพิ่มข้อมูลผลผลิต
    </button>
  </div>

  <div class="yield-filters">
    <div class="yield-filter-col">
      <div class="filter-label">แปลง</div>
      <select class="form-select" style="width:140px">
        <option>ทุกแปลง</option>
        <option>แปลง 1</option>
        <option>แปลง 2</option>
        <option>แปลง 3</option>
        <option>แปลง 4</option>
      </select>
    </div>

    <div class="yield-filter-col">
      <div class="filter-label">ชนิดพืช</div>
      <select class="form-select" style="width:130px">
        <option>ทุกชนิด</option>
        <option>ทุเรียน</option>
        <option>มังคุด</option>
        <option>ลำไย</option>
      </select>
    </div>

    <div class="yield-filter-col">
      <div class="filter-label">วันที่เริ่มต้น</div>
      <input type="date" class="form-input" style="width:148px" value="2023-12-11" />
    </div>

    <div class="yield-filter-col">
      <div class="filter-label">วันที่สิ้นสุด</div>
      <input type="date" class="form-input" style="width:148px" value="2024-12-20" />
    </div>
  </div>

  <div class="card">
    <div style="overflow-x:auto">
      <table class="yield-table">
        <thead>
          <tr>
            <th>แปลง</th>
            <th>ชนิดของพืช</th>
            <th>วันที่ปลูก</th>
            <th>วันที่เก็บเกี่ยว</th>
            <th>ปริมาณ (ตัน)</th>
            <th>จัดการ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>แปลง 1</strong></td>
            <td>🌵 ทุเรียน</td>
            <td>11/12/2566</td>
            <td>11/12/2567</td>
            <td><strong>1,000</strong></td>
            <td style="display:flex;gap:5px;flex-wrap:nowrap">
              <button
                class="edit-row-btn"
                onclick="document.getElementById('editYieldPopup')?.classList.add('open')"
              >
                ✏️ แก้ไข
              </button>
              <button class="del-row-btn" onclick="openConfirm('confirmDeleteYield')">
                🗑 ลบ
              </button>
            </td>
          </tr>

          <tr>
            <td><strong>แปลง 2</strong></td>
            <td>🟣 มังคุด</td>
            <td>10/11/2566</td>
            <td>18/12/2567</td>
            <td><strong>1,000</strong></td>
            <td style="display:flex;gap:5px;flex-wrap:nowrap">
              <button
                class="edit-row-btn"
                onclick="document.getElementById('editYieldPopup')?.classList.add('open')"
              >
                ✏️ แก้ไข
              </button>
              <button class="del-row-btn" onclick="openConfirm('confirmDeleteYield')">
                🗑 ลบ
              </button>
            </td>
          </tr>

          <tr>
            <td><strong>แปลง 3</strong></td>
            <td>🌿 ลำไย</td>
            <td>19/12/2566</td>
            <td>15/12/2567</td>
            <td><strong>1,000</strong></td>
            <td style="display:flex;gap:5px;flex-wrap:nowrap">
              <button
                class="edit-row-btn"
                onclick="document.getElementById('editYieldPopup')?.classList.add('open')"
              >
                ✏️ แก้ไข
              </button>
              <button class="del-row-btn" onclick="openConfirm('confirmDeleteYield')">
                🗑 ลบ
              </button>
            </td>
          </tr>

          <tr>
            <td><strong>แปลง 4</strong></td>
            <td>🌵 ทุเรียน</td>
            <td>20/12/2566</td>
            <td>14/12/2567</td>
            <td><strong>1,000</strong></td>
            <td style="display:flex;gap:5px;flex-wrap:nowrap">
              <button
                class="edit-row-btn"
                onclick="document.getElementById('editYieldPopup')?.classList.add('open')"
              >
                ✏️ แก้ไข
              </button>
              <button class="del-row-btn" onclick="openConfirm('confirmDeleteYield')">
                🗑 ลบ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Create Yield -->
  <div
    id="createYieldPopup"
    class="popup-overlay"
    onclick="closePopupIfBg(event,'createYieldPopup')"
  >
    <div class="popup-box">
      <div class="popup-title">🌾 เพิ่มข้อมูลผลผลิต</div>
      <button
        class="popup-close"
        onclick="document.getElementById('createYieldPopup').classList.remove('open')"
      >
        ✕
      </button>

      <div class="form-field">
        <div class="form-field-label">เลือกแปลง</div>
        <select class="form-select">
          <option>ทุกแปลง</option>
          <option>แปลง 1</option>
          <option>แปลง 2</option>
          <option>แปลง 3</option>
          <option>แปลง 4</option>
        </select>
      </div>

      <div class="form-field">
        <div class="form-field-label">ชนิดพืช</div>
        <input class="form-input" placeholder="เช่น ทุเรียน" />
      </div>

      <div class="form-field">
        <div class="form-field-label">วันที่เริ่มปลูก</div>
        <input class="form-input" type="date" />
      </div>

      <div class="form-field">
        <div class="form-field-label">วันที่เก็บเกี่ยว</div>
        <input class="form-input" type="date" />
      </div>

      <div class="form-field">
        <div class="form-field-label">ปริมาณผลผลิต (ตัน)</div>
        <input class="form-input" type="number" placeholder="1000" />
      </div>

      <div class="popup-actions">
        <button
          class="btn-cancel"
          onclick="document.getElementById('createYieldPopup').classList.remove('open')"
        >
          ยกเลิก
        </button>
        <button
          class="btn-save"
          onclick="document.getElementById('createYieldPopup').classList.remove('open');openConfirm('confirmSaveYield')"
        >
          บันทึก
        </button>
      </div>
    </div>
  </div>

  <!-- Edit Yield -->
  <div
    id="editYieldPopup"
    class="popup-overlay"
    onclick="closePopupIfBg(event,'editYieldPopup')"
  >
    <div class="popup-box">
      <div class="popup-title">✏️ แก้ไขข้อมูลผลผลิต</div>
      <button
        class="popup-close"
        onclick="document.getElementById('editYieldPopup').classList.remove('open')"
      >
        ✕
      </button>

      <div class="form-field">
        <div class="form-field-label">
          แปลง <span style="color:#c62828;font-size:9px">(ห้ามเปลี่ยน)</span>
        </div>
        <select class="form-select" disabled style="opacity:.55;cursor:not-allowed">
          <option>แปลง 1</option>
        </select>
        <div style="font-size:9px;color:#c62828;margin-top:3px">
          ⛔ ไม่สามารถเปลี่ยนแปลงแปลงปลูกได้
        </div>
      </div>

      <div class="form-field">
        <div class="form-field-label">ชนิดพืช</div>
        <input class="form-input" value="ทุเรียน" />
      </div>

      <div class="form-field">
        <div class="form-field-label">วันที่เริ่มปลูก</div>
        <input class="form-input" type="date" value="2023-12-11" />
      </div>

      <div class="form-field">
        <div class="form-field-label">วันที่เก็บเกี่ยว</div>
        <input class="form-input" type="date" value="2024-12-11" />
      </div>

      <div class="form-field">
        <div class="form-field-label">ปริมาณผลผลิต (ตัน)</div>
        <input class="form-input" type="number" value="1000" />
      </div>

      <div class="popup-actions">
        <button
          class="btn-cancel"
          onclick="document.getElementById('editYieldPopup').classList.remove('open')"
        >
          ยกเลิก
        </button>
        <button
          class="btn-save"
          onclick="document.getElementById('editYieldPopup').classList.remove('open');openConfirm('confirmSaveYield')"
        >
          บันทึก
        </button>
      </div>
    </div>
  </div>

  <!-- Confirm: Save Yield -->
  <div
    id="confirmSaveYield"
    class="popup-overlay"
    onclick="closePopupIfBg(event,'confirmSaveYield')"
  >
    <div class="confirm-box">
      <div class="confirm-icon">💾</div>
      <div class="confirm-title">ยืนยันการบันทึกข้อมูล</div>
      <div class="confirm-sub">ต้องการบันทึกข้อมูลผลผลิตนี้ใช่หรือไม่?</div>
      <div class="confirm-actions">
        <button
          class="btn-cancel"
          onclick="document.getElementById('confirmSaveYield').classList.remove('open')"
        >
          ยกเลิก
        </button>
        <button
          class="btn-save"
          onclick="document.getElementById('confirmSaveYield').classList.remove('open')"
        >
          ยืนยัน
        </button>
      </div>
    </div>
  </div>

  <!-- Confirm: Delete Yield -->
  <div
    id="confirmDeleteYield"
    class="popup-overlay"
    onclick="closePopupIfBg(event,'confirmDeleteYield')"
  >
    <div class="confirm-box">
      <div class="confirm-icon">🗑</div>
      <div class="confirm-title">ยืนยันการลบข้อมูล</div>
      <div class="confirm-sub">
        ต้องการลบข้อมูลผลผลิตนี้ออกจากระบบ?<br />
        การดำเนินการนี้ไม่สามารถกู้คืนได้
      </div>
      <div class="confirm-actions">
        <button
          class="btn-cancel"
          onclick="document.getElementById('confirmDeleteYield').classList.remove('open')"
        >
          ยกเลิก
        </button>
        <button
          class="btn-confirm"
          onclick="document.getElementById('confirmDeleteYield').classList.remove('open')"
        >
          ยืนยัน
        </button>
      </div>
    </div>
  </div>
</div>
`;

export default function YieldPage() {
  return <DuwimsStaticPage current="yield" htmlContent={htmlContent} />;
}