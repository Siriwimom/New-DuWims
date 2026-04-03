"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

const LANG_KEY = "DUWIMS_LANG";

const TRANSLATIONS = {
  th: {
    dashboard: "แดชบอร์ด",
    history: "ประวัติ",
    heatmap: "🌡 Heat Map",
    plantingPlot: "แปลงปลูก",
    nodeSensor: "📡 Node Sensor",
    yield: "ผลผลิต",
    login: "เข้าสู่ระบบ",
    logout: "ออกจากระบบ",
    statusChecking: "สถานะ: กำลังตรวจสอบ...",
    statusLoggedIn: "สถานะ: เข้าสู่ระบบแล้ว",
    statusLoggedOut: "สถานะ: ยังไม่ได้เข้าสู่ระบบ",

    weather7Days: "🌤 พยากรณ์อากาศ 7 วันข้างหน้า",
    weatherHint: "อิงจากพื้นที่แปลงปลูก · Open-Meteo API",
    today: "วันนี้",
    mon: "จ.",
    tue: "อ.",
    wed: "พ.",
    thu: "พฤ.",
    fri: "ศ.",
    sat: "ส.",
    rain: "ฝน",

    currentTemperatureToday: "🌡 อุณหภูมิปัจจุบัน (วันนี้)",
    forecastDailyHint: "อิงจากพยากรณ์รายวันของพื้นที่แปลง",
    rainChanceToday: "🌧 โอกาสฝนตก (วันนี้)",
    precipitationHint: "อิงจาก precipitation probability (รายวัน)",

    recommendation: "💡 คำแนะนำ",
    recommendationText:
      "มีโอกาสฝนสูงใน 2–3 วันข้างหน้า ควรเตรียมระบบระบายน้ำ/ตรวจร่องน้ำในแปลง",

    rainAmount7Days: "🌧 ปริมาณน้ำฝน (7 วัน)",
    rainAmountHint: "รวมจาก precipitation_sum รายวัน",

    mapAndResources: "🗺 แผนที่และทรัพยากร (ทุกแปลง)",
    mapHint: "แสดง polygon แปลงทั้งหมด + หมุด Node ทั้งหมด",
    plotCount: "จำนวนแปลง",
    pinCount: "จำนวนหมุดทั้งหมด",
    nodeLegend: "สีน้ำเงิน = Air Node / สีเขียว = Soil Node",

    workingStatus: "📡 สถานะการทำงาน",
    updatedLatest: "อัปเดตจากระบบล่าสุด",
    on: "ON",
    off: "OFF",
    machineUnit: "เครื่อง",

    issuesFound: "⚠️ ปัญหาที่พบ",
    issuesCount: (n) => `ตรวจพบความผิดปกติ ${n} กลุ่ม`,
    noIssues: "ไม่พบความผิดปกติ",

    plotSensorData: "ข้อมูลเซนเซอร์รายแปลง",
    unknownPlotName: "ไม่ทราบชื่อแปลง",

    node: "Node",
    sensor: "Sensor",
    soilNode: "Soil Node",
    airNode: "Air Node",

    noCurrentData: "ไม่มีข้อมูลปัจจุบัน",
    noCurrentDataReason: "ไม่พบค่าปัจจุบันจาก latestValue / value / lastReading",
    tooLow: "ค่าต่ำเกินช่วงที่กำหนด",
    tooHigh: "ค่าสูงเกินช่วงที่กำหนด",
    normalValue: "ค่าปกติ",
    inRange: "ค่าอยู่ในช่วงที่กำหนด",

    currentValue: "ค่าปัจจุบัน",
    status: "สถานะ",
    reason: "เหตุผล",

    noSensor: "ไม่มีเซนเซอร์",
    noSensorLower: "ไม่มี sensor",
    noSensorDataYet: "ยังไม่มีข้อมูล sensor",

    dataLabel: "ข้อมูล",
    valueLabel: "ค่า",
    deviceAndSensorDetails: "รายละเอียดของอุปกรณ์และเซนเซอร์",
    abnormal: "ผิดปกติ",
    normal: "ปกติ",

    plot: "แปลง",
    type: "ประเภท",

    loadPlotFailed: "โหลดข้อมูลแปลงไม่สำเร็จ",
    loadDashboardFailed: "ไม่สามารถโหลดข้อมูล dashboard ได้",
    polygonPointCount: "จำนวนจุด polygon",
    currentSensors: "Sensors ปัจจุบัน",
    leafletLoadFailed: "โหลด Leaflet ไม่สำเร็จ",

    historyFilterTitle: "🔍 ฟิลเตอร์ข้อมูลย้อนหลัง",
    historyFilterSub: "เลือกช่วงวันที่ / เซนเซอร์ / แปลง เพื่อดูข้อมูลย้อนหลังและกราฟ",
    quickRange: "ช่วงเวลาเร็ว",
    todayShort: "วันนี้",
    last7Days: "7 วันล่าสุด",
    last30Days: "30 วันล่าสุด",
    startDate: "วันที่เริ่มต้น",
    endDate: "วันที่สิ้นสุด",
    plotSelect: "แปลง",
    allPlots: "ทุกแปลง",
    sensorType: "ประเภทเซนเซอร์",
    selectMultiple: "เลือกได้หลายตัว",
    clear: "ล้าง",
    done: "Done",
    selectedAlready: "เลือกแล้ว",
    selectSensorType: "เลือกประเภทเซนเซอร์",
    loadingData: "กำลังโหลดข้อมูล...",
    loadPlotsFailed: "ไม่สามารถโหลดข้อมูลแปลงได้",
    loadHistoryFailed: "ไม่สามารถโหลดข้อมูลย้อนหลังได้",
    nodesFoundText: (visible, allNodes, rows) =>
      `พบ ${visible} node ในหน้าที่เลือก • ทั้งหมดจาก backend ${allNodes} node • ข้อมูลย้อนหลัง ${rows} รายการ`,
    chartComparePlots: "📈 กราฟเปรียบเทียบแปลง",
    sensorWord: "sensor",
    noChartData: "ไม่มีข้อมูลสำหรับกราฟในช่วงที่เลือก",
    exportCsv: "⬇ EXPORT CSV",
    chartNote: "* กราฟนี้แยกตามหน่วย โดยแต่ละเส้น = sensor + plot",
    summaryTitle: "📋 สรุปการวัดข้อมูล (เฉลี่ยช่วงที่เลือก)",
    summarySub: "เฉลี่ยจากข้อมูลย้อนหลังในช่วงวันที่ที่เลือก",
    plotCol: "แปลง",
    nodeCol: "NODE",
    typeCol: "ประเภท",
    airNodeText: "Air Node",
    soilNodeText: "Soil Node",
    noSummaryData: "ไม่มีข้อมูลสรุปในช่วงที่เลือก",
    unknownPlot: "ไม่ทราบชื่อแปลง",
    temperature: "อุณหภูมิ",
    relativeHumidity: "ความชื้นสัมพัทธ์",
    windSpeed: "วัดความเร็วลม",
    lightIntensity: "ความเข้มแสง",
    rainfall: "ปริมาณน้ำฝน",
    soilMoisture: "ความชื้นในดิน",
    waterAvailability: "ความพร้อมใช้น้ำ",

    // planting plot page
    plantingPolygonTitle: "🗺 แปลงปลูก",
    addPlot: "+ เพิ่มแปลง",
    editDelete: "แก้ไข",
    deletePlot: "ลบ",
    plotLabel: "เลือกแปลง",
    creatingNewPlot: "กำลังเพิ่มแปลงใหม่",
    noPlots: "ยังไม่มีแปลง",
    plotWord: "แปลง",
    selectPlotFirst: "กรุณาเลือกแปลงก่อน",
    newCaretakerInfo: "ข้อมูลแปลงใหม่",
    editPlotAndPolygon: "แก้ไขข้อมูลแปลงและ polygon",
    plotInfo: "ข้อมูลแปลง",
    plotInfoLabel: "ชื่อแปลง",
    caretakerInfoLabel: "ผู้ดูแล",
    selectCaretaker: "เลือกผู้ดูแล",
    currentCaretaker: "ผู้ดูแลปัจจุบัน",
    plotNameRequired: "กรุณากรอกชื่อแปลง",
    caretakerRequired: "กรุณาเลือกผู้ดูแล",
    drawPolygonFirst: "กรุณาวาด polygon ก่อนบันทึก",
    polygonTooSmall: "polygon มีขนาดเล็กเกินไป",
    createPlotFailed: "สร้างแปลงไม่สำเร็จ",
    createPlotSuccess: "สร้างแปลงสำเร็จ",
    saveSuccess: "บันทึกข้อมูลสำเร็จ",
    saveFailed: "บันทึกข้อมูลไม่สำเร็จ",
    deleteSuccess: "ลบแปลงสำเร็จ",
    deleteFailed: "ลบแปลงไม่สำเร็จ",
    needPressAddOrEditFirst: "กรุณากดเพิ่มแปลงหรือแก้ไขก่อน",
    needEditBeforeDraw: "กรุณาเข้าสู่โหมดเพิ่มหรือแก้ไขก่อนวาด polygon",
    needEditBeforeEditPolygon: "กรุณาเข้าสู่โหมดแก้ไขก่อนปรับ polygon",
    needEditBeforeDeletePolygon: "กรุณาเข้าสู่โหมดแก้ไขก่อนลบ polygon",
    drawPolygonOnMap: "วาดขอบเขตแปลงบนแผนที่",
    editModeOn: "โหมดแก้ไขเปิดอยู่",
    pressEditOrAddFirst: "กด +เพิ่มแปลง หรือ ลบ/แก้ไข ก่อน",
    loadingMap: "กำลังโหลดแผนที่...",
    myLocation: "ตำแหน่งของฉัน",
    findingLocation: "กำลังค้นหาตำแหน่ง...",
    locationFound: "พบตำแหน่งแล้ว",
    locationFailed: "ค้นหาตำแหน่งไม่สำเร็จ",
    locationNotSupported: "อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง",
    noticeTitle: "แจ้งเตือน",
    successTitle: "สำเร็จ",
    cancel: "ยกเลิก",
    save: "บันทึก",
    confirm: "ยืนยัน",
    confirmDeleteTitle: "ยืนยันการลบข้อมูล",
    confirmDeleteSub1: "ต้องการลบแปลงนี้ออกจากระบบ?",
    confirmDeleteSub2: "การดำเนินการนี้ไม่สามารถกู้คืนได้",
    confirmSaveTitle: "ยืนยันการบันทึกข้อมูล",
    confirmSaveSub1: "ต้องการบันทึกข้อมูลแปลงนี้ใช่หรือไม่?",
    confirmSaveSub2: "โปรดตรวจสอบข้อมูลให้ถูกต้องก่อนยืนยัน",
    loadDataFailed: "โหลดข้อมูลไม่สำเร็จ",
  },

  en: {
    dashboard: "Dashboard",
    history: "History",
    heatmap: "🌡 Heat Map",
    plantingPlot: "Planting Plot",
    nodeSensor: "📡 Node Sensor",
    yield: "Yield",
    login: "Login",
    logout: "Logout",
    statusChecking: "Status: Checking...",
    statusLoggedIn: "Status: Logged in",
    statusLoggedOut: "Status: Not logged in",

    weather7Days: "🌤 7-Day Weather Forecast",
    weatherHint: "Based on planting plot area · Open-Meteo API",
    today: "Today",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    rain: "Rain",

    currentTemperatureToday: "🌡 Current Temperature (Today)",
    forecastDailyHint: "Based on the area's daily forecast",
    rainChanceToday: "🌧 Rain Chance (Today)",
    precipitationHint: "Based on daily precipitation probability",

    recommendation: "💡 Recommendation",
    recommendationText:
      "There is a high chance of rain in the next 2–3 days. Prepare drainage and check water channels in the plot.",

    rainAmount7Days: "🌧 Rainfall (7 Days)",
    rainAmountHint: "Summed from daily precipitation_sum",

    mapAndResources: "🗺 Map and Resources (All Plots)",
    mapHint: "Show all plot polygons + all node markers",
    plotCount: "Plots",
    pinCount: "Total markers",
    nodeLegend: "Blue = Air Node / Green = Soil Node",

    workingStatus: "📡 Working Status",
    updatedLatest: "Updated from latest system data",
    on: "ON",
    off: "OFF",
    machineUnit: "devices",

    issuesFound: "⚠️ Issues Found",
    issuesCount: (n) => `Found ${n} abnormal group(s)`,
    noIssues: "No issues found",

    plotSensorData: "Sensor Data by Plot",
    unknownPlotName: "Unknown plot",

    node: "Node",
    sensor: "Sensor",
    soilNode: "Soil Node",
    airNode: "Air Node",

    noCurrentData: "No current data",
    noCurrentDataReason: "No current value found from latestValue / value / lastReading",
    tooLow: "Value is below the allowed range",
    tooHigh: "Value is above the allowed range",
    normalValue: "Normal value",
    inRange: "Value is within the allowed range",

    currentValue: "Current value",
    status: "Status",
    reason: "Reason",

    noSensor: "No sensors",
    noSensorLower: "No sensor",
    noSensorDataYet: "No sensor data yet",

    dataLabel: "Data",
    valueLabel: "Value",
    deviceAndSensorDetails: "Device and sensor details",
    abnormal: "Abnormal",
    normal: "Normal",

    plot: "Plot",
    type: "Type",

    loadPlotFailed: "Failed to load plot data",
    loadDashboardFailed: "Unable to load dashboard data",
    polygonPointCount: "Polygon points",
    currentSensors: "Current Sensors",
    leafletLoadFailed: "Failed to load Leaflet",

    historyFilterTitle: "🔍 Historical Data Filter",
    historyFilterSub: "Choose date range / sensor / plot to view historical data and charts",
    quickRange: "Quick range",
    todayShort: "Today",
    last7Days: "Last 7 Days",
    last30Days: "Last 30 Days",
    startDate: "Start Date",
    endDate: "End Date",
    plotSelect: "Plot",
    allPlots: "All Plots",
    sensorType: "Sensor Type",
    selectMultiple: "Multiple selection",
    clear: "Clear",
    done: "Done",
    selectedAlready: "Selected",
    selectSensorType: "Select sensor type",
    loadingData: "Loading data...",
    loadPlotsFailed: "Unable to load plot data",
    loadHistoryFailed: "Unable to load historical data",
    nodesFoundText: (visible, allNodes, rows) =>
      `Found ${visible} nodes in this view • ${allNodes} total from backend • ${rows} historical rows`,
    chartComparePlots: "📈 Plot Comparison Chart",
    sensorWord: "sensor",
    noChartData: "No chart data for the selected range",
    exportCsv: "⬇ EXPORT CSV",
    chartNote: "* This chart is split by unit, and each line = sensor + plot",
    summaryTitle: "📋 Measurement Summary (Average for selected range)",
    summarySub: "Average from historical data within the selected dates",
    plotCol: "Plot",
    nodeCol: "NODE",
    typeCol: "Type",
    airNodeText: "Air Node",
    soilNodeText: "Soil Node",
    noSummaryData: "No summary data for the selected range",
    unknownPlot: "Unknown plot",
    temperature: "Temperature",
    relativeHumidity: "Relative Humidity",
    windSpeed: "Wind Speed",
    lightIntensity: "Light Intensity",
    rainfall: "Rainfall",
    soilMoisture: "Soil Moisture",
    waterAvailability: "Water Availability",

    // planting plot page
    plantingPolygonTitle: "🗺 Planting Plot",
    addPlot: "+ Add Plot",
    editDelete: "Edit",
    deletePlot: "Delete",
    plotLabel: "Select Plot",
    creatingNewPlot: "Creating new plot",
    noPlots: "No plots yet",
    plotWord: "Plot",
    selectPlotFirst: "Please select a plot first",
    newCaretakerInfo: "New plot information",
    editPlotAndPolygon: "Edit plot information and polygon",
    plotInfo: "Plot information",
    plotInfoLabel: "Plot name",
    caretakerInfoLabel: "Caretaker",
    selectCaretaker: "Select caretaker",
    currentCaretaker: "Current caretaker",
    plotNameRequired: "Please enter a plot name",
    caretakerRequired: "Please select a caretaker",
    drawPolygonFirst: "Please draw a polygon before saving",
    polygonTooSmall: "The polygon is too small",
    createPlotFailed: "Failed to create plot",
    createPlotSuccess: "Plot created successfully",
    saveSuccess: "Saved successfully",
    saveFailed: "Failed to save",
    deleteSuccess: "Plot deleted successfully",
    deleteFailed: "Failed to delete plot",
    needPressAddOrEditFirst: "Please press Add Plot or Edit first",
    needEditBeforeDraw: "Please enter add or edit mode before drawing a polygon",
    needEditBeforeEditPolygon: "Please enter edit mode before editing the polygon",
    needEditBeforeDeletePolygon: "Please enter edit mode before deleting the polygon",
    drawPolygonOnMap: "Draw plot boundary on the map",
    editModeOn: "Edit mode is on",
    pressEditOrAddFirst: "Press + Add Plot or Edit/Delete first",
    loadingMap: "Loading map...",
    myLocation: "My Location",
    findingLocation: "Finding location...",
    locationFound: "Location found",
    locationFailed: "Failed to find location",
    locationNotSupported: "Geolocation is not supported on this device",
    noticeTitle: "Notice",
    successTitle: "Success",
    cancel: "Cancel",
    save: "Save",
    confirm: "Confirm",
    confirmDeleteTitle: "Confirm deletion",
    confirmDeleteSub1: "Do you want to delete this plot?",
    confirmDeleteSub2: "This action cannot be undone.",
    confirmSaveTitle: "Confirm save",
    confirmSaveSub1: "Do you want to save this plot?",
    confirmSaveSub2: "Please check the information before confirming.",
    loadDataFailed: "Failed to load data",
  },
};

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState("th");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "th" || saved === "en") {
        setLang(saved);
      }
    } catch {}
    setReady(true);
  }, []);

  const changeLanguage = (nextLang) => {
    const safeLang = nextLang === "en" ? "en" : "th";
    setLang(safeLang);
    try {
      window.localStorage.setItem(LANG_KEY, safeLang);
    } catch {}
  };

  const t = useMemo(() => {
    return TRANSLATIONS[lang] || TRANSLATIONS.th;
  }, [lang]);

  const value = useMemo(
    () => ({
      lang,
      setLang: changeLanguage,
      t,
      ready,
      translations: TRANSLATIONS,
    }),
    [lang, t, ready]
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useDuwimsT() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useDuwimsT must be used inside LanguageProvider");
  }
  return context;
}