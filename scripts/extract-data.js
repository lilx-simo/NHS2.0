#!/usr/bin/env node
/**
 * NHS Capacity Planner - Data Extraction Pipeline (Node.js version)
 *
 * Reads the NHS Excel workbook and extracts structured data into JSON fixture files
 * for use by the Next.js application.
 *
 * Usage:
 *   npm install xlsx --save-dev   (one time)
 *   node scripts/extract-data.js
 */

const fs = require("fs");
const path = require("path");

let XLSX;
try {
  XLSX = require("xlsx");
} catch {
  console.error(
    "ERROR: xlsx package not installed. Run: npm install xlsx --save-dev"
  );
  process.exit(1);
}

// Paths
const PROJECT_DIR = path.resolve(__dirname, "..");
const EXCEL_PATH = path.resolve(
  PROJECT_DIR,
  "..",
  "NHS Capacity and demand planner_data - confidential.xls"
);
const OUTPUT_DIR = path.join(PROJECT_DIR, "src", "data");

// Constants
const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];
const PERIODS = ["AM", "PM"];
const APPOINTMENT_TYPE_NAMES = [
  "NewSRH",
  "Review",
  "NCP",
  "NMWM",
  "Nwash",
  "Nurse led",
];

const KNOWN_SESSION_TYPES = new Set([
  "CP",
  "SRH",
  "MWM",
  "Wash",
  "Theatre",
  "MnNew",
  "MnRev",
  "MwWed",
  "MwFri",
  "MwMon",
  "add",
  "Nurse",
  "NCP",
]);

/**
 * Parse sheet name in DD.MM.YY format to ISO date string.
 */
function parseSheetDate(sheetName) {
  const trimmed = sheetName.trim();
  const match = trimmed.match(/^(\d{2})\.(\d{2})\.(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const year = parseInt(yy, 10) + 2000;
  const month = parseInt(mm, 10);
  const day = parseInt(dd, 10);
  // Validate
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Get cell value as a clean string.
 */
function safeStr(val) {
  if (val === undefined || val === null) return "";
  if (typeof val === "number") {
    if (Number.isInteger(val)) return String(val);
    // Check if it's very close to an integer
    if (Math.abs(val - Math.round(val)) < 0.001) return String(Math.round(val));
    return String(val);
  }
  return String(val).trim();
}

/**
 * Get cell value as an integer.
 */
function safeInt(val, defaultVal = 0) {
  if (val === undefined || val === null || val === "") return defaultVal;
  const n = Number(val);
  if (isNaN(n)) return defaultVal;
  return Math.round(n);
}

/**
 * Get a cell value from a sheet by row and column.
 * xlsx uses a different coordinate system (A1 notation), so we convert.
 */
function getCellValue(sheet, row, col) {
  const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
  const cell = sheet[cellRef];
  if (!cell) return "";
  return cell.v !== undefined ? cell.v : "";
}

/**
 * Get the dimensions of a sheet (number of rows and columns).
 */
function getSheetDimensions(sheet) {
  const range = sheet["!ref"];
  if (!range) return { nrows: 0, ncols: 0 };
  const decoded = XLSX.utils.decode_range(range);
  return {
    nrows: decoded.e.r + 1,
    ncols: decoded.e.c + 1,
  };
}

/**
 * Check if a cell value represents unavailability.
 */
function isUnavailability(val) {
  const s = safeStr(val).toLowerCase().trim();
  if (!s) return null;
  const map = {
    "annual leave": "Annual Leave",
    "a/l": "Annual Leave",
    al: "Annual Leave",
    "study leave": "Study Leave",
    "s/l": "Study Leave",
    sl: "Study Leave",
    sick: "SICK",
    audit: "AUDIT",
    theatre: "Theatre",
  };
  return map[s] || null;
}

/**
 * Check if a cell value is a session type code.
 */
function isSessionType(val) {
  const s = safeStr(val);
  if (!s) return null;

  // Direct match
  if (KNOWN_SESSION_TYPES.has(s)) return s;

  // Case-insensitive match
  for (const known of KNOWN_SESSION_TYPES) {
    if (s.toUpperCase() === known.toUpperCase()) return known;
  }

  // If it looks like a session code (short alphanumeric, not a day/header)
  const skipWords = new Set([
    "AM",
    "PM",
    "Mon",
    "Tue",
    "Wed",
    "Thu",
    "Fri",
    "Sat",
    "Sun",
    "KEY",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
    "Appt Type",
    "Total",
    "Clinician",
    "name",
    "Name",
    "Clinician name",
  ]);

  if (/^[A-Za-z][A-Za-z0-9/]{0,8}$/.test(s) && !skipWords.has(s)) {
    return s;
  }

  return null;
}

/**
 * Extract data from a single weekly sheet.
 */
function extractSheetData(sheet, sheetName) {
  const weekStart = parseSheetDate(sheetName);
  if (!weekStart) return null;

  const { nrows, ncols } = getSheetDimensions(sheet);

  // =========================================================================
  // STEP 1: Find key structural rows
  // =========================================================================
  let timetableHeaderRow = null;
  let dayHeaderRow = null;
  let columnHeaderRow = null;
  let totalClinicSlotsRow = null;
  let totalAdditionalRow = null;
  let keyRow = null;

  for (let r = 0; r < nrows; r++) {
    const rowVals = [];
    for (let c = 0; c < Math.min(ncols, 5); c++) {
      rowVals.push(safeStr(getCellValue(sheet, r, c)));
    }
    const joined = rowVals.join(" ").trim();

    if (
      joined.toUpperCase().includes("TIMETABLE FOR CLINICIAN") ||
      (joined.toUpperCase().includes("TIMETABLE") && !joined.toUpperCase().includes("THEATRE"))
    ) {
      timetableHeaderRow = r;
    }

    if (rowVals.some((v) => v.includes("Monday") || v.includes("MONDAY"))) {
      if (dayHeaderRow === null) dayHeaderRow = r;
    }

    // Look for column header row with AM/PM — must contain AM/PM markers
    // and be near the timetable header, not a random empty row further down
    if (columnHeaderRow === null) {
      const firstCell = safeStr(getCellValue(sheet, r, 0)).toLowerCase();
      const isLabelledHeader =
        firstCell === "clinician name" ||
        firstCell === "clinician" ||
        firstCell === "name";
      // Only consider empty first-cell rows if they're within 5 rows of timetableHeaderRow
      const isNearHeader =
        firstCell === "" &&
        timetableHeaderRow !== null &&
        r > timetableHeaderRow &&
        r <= timetableHeaderRow + 5;
      if (isLabelledHeader || isNearHeader) {
        const rowAll = [];
        for (let c = 0; c < Math.min(ncols, 32); c++) {
          rowAll.push(safeStr(getCellValue(sheet, r, c)));
        }
        if (
          rowAll.some((v) => v === "AM" || v === "PM") ||
          rowAll.some((v) => APPOINTMENT_TYPE_NAMES.includes(v))
        ) {
          columnHeaderRow = r;
        }
      }
    }

    if (
      joined.toLowerCase().includes("total clinic slots") ||
      joined.toLowerCase().includes("total slots")
    ) {
      totalClinicSlotsRow = r;
    }
    if (
      joined.toLowerCase().includes("total additional") ||
      joined.toLowerCase().includes("additional session")
    ) {
      totalAdditionalRow = r;
    }
    if (rowVals[0] && rowVals[0].toUpperCase() === "KEY") {
      keyRow = r;
    }
  }

  // =========================================================================
  // STEP 2: Find column mapping for day/period pairs
  // =========================================================================
  const dayPeriodCols = []; // Array of { col, day, period }
  const apptTypeCols = []; // Array of { col, name }

  const headerRowToScan = columnHeaderRow !== null ? columnHeaderRow : dayHeaderRow;

  if (headerRowToScan !== null) {
    const rowVals = [];
    for (let c = 0; c < Math.min(ncols, 32); c++) {
      rowVals.push(safeStr(getCellValue(sheet, headerRowToScan, c)));
    }

    for (let c = 0; c < rowVals.length; c++) {
      if (rowVals[c] === "AM" || rowVals[c] === "PM") {
        let dayName = null;

        if (dayHeaderRow !== null && dayHeaderRow < headerRowToScan) {
          // Check day header row for day name
          let dayVal = safeStr(getCellValue(sheet, dayHeaderRow, c));
          if (!dayVal) {
            // Merged cell - look left
            for (let cl = c - 1; cl >= 0; cl--) {
              dayVal = safeStr(getCellValue(sheet, dayHeaderRow, cl));
              if (dayVal) break;
            }
          }
          for (const d of DAYS) {
            if (dayVal.toLowerCase().includes(d.toLowerCase())) {
              dayName = d;
              break;
            }
          }
        }

        if (!dayName) {
          // Infer from column position
          const dayIdx = Math.floor((c - 1) / 2);
          if (dayIdx >= 0 && dayIdx < 7) {
            dayName = DAYS[dayIdx];
          }
        }

        if (dayName) {
          dayPeriodCols.push({ col: c, day: dayName, period: rowVals[c] });
        }
      }

      // Check for appointment type columns
      if (APPOINTMENT_TYPE_NAMES.includes(rowVals[c])) {
        apptTypeCols.push({ col: c, name: rowVals[c] });
      }
    }
  }

  // Fallback default layout
  if (dayPeriodCols.length === 0) {
    for (let dayIdx = 0; dayIdx < DAYS.length; dayIdx++) {
      for (let periodIdx = 0; periodIdx < PERIODS.length; periodIdx++) {
        const col = 1 + dayIdx * 2 + periodIdx;
        if (col < ncols) {
          dayPeriodCols.push({
            col,
            day: DAYS[dayIdx],
            period: PERIODS[periodIdx],
          });
        }
      }
    }
  }

  // =========================================================================
  // STEP 3: Find clinician rows
  // =========================================================================
  const clinicianRows = [];
  const startScan = (columnHeaderRow !== null ? columnHeaderRow : 13) + 1;
  const endScan = totalClinicSlotsRow || keyRow || Math.min(nrows, 35);

  for (let r = startScan; r < endScan; r++) {
    const rowVals = [];
    for (let c = 0; c < Math.min(ncols, 25); c++) {
      rowVals.push(safeStr(getCellValue(sheet, r, c)));
    }
    const joined = rowVals.join(" ").trim();

    if (!joined) continue;
    if (
      joined.toLowerCase().includes("total") &&
      (joined.toLowerCase().includes("clinic") ||
        joined.toLowerCase().includes("additional") ||
        joined.toLowerCase().includes("slot"))
    ) {
      continue;
    }
    if (joined.toUpperCase() === "KEY") continue;

    // Check if row has content in session columns
    let hasContent = false;
    for (const { col } of dayPeriodCols) {
      if (col < ncols) {
        const cellVal = safeStr(getCellValue(sheet, r, col));
        if (cellVal) {
          hasContent = true;
          break;
        }
      }
    }

    const firstVal = safeStr(getCellValue(sheet, r, 0));
    if (hasContent || firstVal) {
      clinicianRows.push(r);
    }
  }

  // =========================================================================
  // STEP 4: Extract sessions and unavailability
  // =========================================================================
  const sessions = [];
  const unavailability = [];
  const clinicianNames = {};
  const allSessionTypes = new Set();
  let clinicianIdCounter = 1;

  for (const rowIdx of clinicianRows) {
    const firstCell = safeStr(getCellValue(sheet, rowIdx, 0));

    let clinicianId;
    const clinicianLabel = firstCell;

    if (/^\d+$/.test(firstCell)) {
      clinicianId = parseInt(firstCell, 10);
    } else {
      clinicianId = clinicianIdCounter;
    }

    clinicianIdCounter = Math.max(clinicianIdCounter, clinicianId + 1);

    if (clinicianId && clinicianLabel) {
      clinicianNames[clinicianId] = clinicianLabel;
    }

    for (const { col, day, period } of dayPeriodCols) {
      if (col >= ncols) continue;
      const cellVal = safeStr(getCellValue(sheet, rowIdx, col));
      if (!cellVal) continue;

      // Check unavailability
      const unavail = isUnavailability(cellVal);
      if (unavail) {
        unavailability.push({
          clinicianId,
          day,
          period,
          reason: unavail,
        });
        continue;
      }

      // Check session type
      const sessionType = isSessionType(cellVal);
      if (sessionType) {
        allSessionTypes.add(sessionType);
        sessions.push({
          clinicianId,
          day,
          period,
          sessionType,
          location: "Main Site",
        });
      }
    }
  }

  // =========================================================================
  // STEP 5: Extract appointment type slot counts
  // =========================================================================
  const slotTotals = {};

  for (const { col, name } of apptTypeCols) {
    let total = 0;
    for (const rowIdx of clinicianRows) {
      if (col < ncols) {
        total += safeInt(getCellValue(sheet, rowIdx, col));
      }
    }
    slotTotals[name] = total;
  }

  // Try totals row
  if (totalClinicSlotsRow !== null) {
    for (const { col, name } of apptTypeCols) {
      if (col < ncols) {
        const v = safeInt(getCellValue(sheet, totalClinicSlotsRow, col));
        if (v > 0) slotTotals[name] = v;
      }
    }
  }

  // Ensure all types present
  for (const at of APPOINTMENT_TYPE_NAMES) {
    if (!(at in slotTotals)) slotTotals[at] = 0;
  }

  // =========================================================================
  // STEP 6: Extract totals
  // =========================================================================
  let totalClinicSlots = 0;
  let totalAdditionalSessions = 0;

  if (totalClinicSlotsRow !== null) {
    for (let c = 0; c < ncols; c++) {
      const val = safeStr(getCellValue(sheet, totalClinicSlotsRow, c));
      if (
        val.toLowerCase().includes("total clinic slots") ||
        val.toLowerCase().includes("total slots")
      ) {
        for (let c2 = c + 1; c2 < Math.min(ncols, c + 10); c2++) {
          const v = safeInt(getCellValue(sheet, totalClinicSlotsRow, c2));
          if (v > 0) {
            totalClinicSlots = v;
            break;
          }
        }
        break;
      }
    }
  }

  if (totalClinicSlots === 0) {
    totalClinicSlots = Object.values(slotTotals).reduce((a, b) => a + b, 0);
  }

  if (totalAdditionalRow !== null) {
    for (let c = 0; c < ncols; c++) {
      const val = safeStr(getCellValue(sheet, totalAdditionalRow, c));
      if (val.toLowerCase().includes("additional")) {
        for (let c2 = c + 1; c2 < Math.min(ncols, c + 10); c2++) {
          const v = safeInt(getCellValue(sheet, totalAdditionalRow, c2));
          if (v > 0) {
            totalAdditionalSessions = v;
            break;
          }
        }
        break;
      }
    }
  }

  return {
    weekStart,
    sessions,
    slotTotals,
    totalClinicSlots,
    totalAdditionalSessions,
    unavailability,
    clinicianNames,
    sessionTypes: [...allSessionTypes],
  };
}

// =============================================================================
// Main
// =============================================================================
function main() {
  console.log(`Opening workbook: ${EXCEL_PATH}`);
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`ERROR: Excel file not found at ${EXCEL_PATH}`);
    process.exit(1);
  }

  const wb = XLSX.readFile(EXCEL_PATH);
  const sheetNames = wb.SheetNames;
  console.log(`Found ${sheetNames.length} sheets: ${sheetNames.join(", ")}`);

  // Filter to weekly sheets
  const weeklySheetNames = sheetNames.filter(
    (s) => s !== "Sheet1" && s !== "Sheet3"
  );
  console.log(`Processing ${weeklySheetNames.length} weekly sheets...`);

  const allWeeks = [];
  const allClinicians = {};
  const allSessionTypes = new Set();
  const skipped = [];

  for (const sheetName of weeklySheetNames) {
    process.stdout.write(`  Processing sheet: ${sheetName}... `);
    const sheet = wb.Sheets[sheetName];
    const result = extractSheetData(sheet, sheetName);

    if (!result) {
      console.log("SKIPPED (could not parse date)");
      skipped.push(sheetName);
      continue;
    }

    // Merge clinicians
    for (const [cid, cname] of Object.entries(result.clinicianNames)) {
      if (!(cid in allClinicians)) {
        allClinicians[cid] = cname;
      }
    }

    // Merge session types
    for (const st of result.sessionTypes) {
      allSessionTypes.add(st);
    }

    allWeeks.push({
      weekStart: result.weekStart,
      sessions: result.sessions,
      slotTotals: result.slotTotals,
      totalClinicSlots: result.totalClinicSlots,
      totalAdditionalSessions: result.totalAdditionalSessions,
      unavailability: result.unavailability,
    });

    console.log(
      `OK (${result.sessions.length} sessions, ${result.unavailability.length} unavailable, slots=${result.totalClinicSlots})`
    );
  }

  // Sort by date
  allWeeks.sort((a, b) => a.weekStart.localeCompare(b.weekStart));

  if (skipped.length) {
    console.log(`\nSkipped sheets: ${skipped.join(", ")}`);
  }

  // Build output
  console.log(`\n=== Summary ===`);
  console.log(`  Weeks extracted: ${allWeeks.length}`);
  console.log(`  Clinicians found: ${Object.keys(allClinicians).length}`);
  console.log(`  Session types: ${[...allSessionTypes].sort().join(", ")}`);
  console.log(
    `  Date range: ${allWeeks[0]?.weekStart || "N/A"} to ${allWeeks[allWeeks.length - 1]?.weekStart || "N/A"}`
  );

  // Clinicians list
  const clinicians = Object.entries(allClinicians)
    .map(([id, label]) => ({ id: parseInt(id, 10), label }))
    .sort((a, b) => a.id - b.id);

  // Session types
  const sessionTypes = [...allSessionTypes].sort();

  // Appointment types
  const appointmentTypes = [
    {
      code: "NewSRH",
      name: "New SRH",
      description: "New Sexual & Reproductive Health appointment",
    },
    {
      code: "Review",
      name: "Review",
      description: "Follow-up review appointment",
    },
    {
      code: "NCP",
      name: "NCP",
      description: "New Contraceptive Pill appointment",
    },
    {
      code: "NMWM",
      name: "NMWM",
      description: "New Midweek Morning appointment",
    },
    {
      code: "Nwash",
      name: "Nwash",
      description: "New Walk-in/Wash appointment",
    },
    {
      code: "Nurse led",
      name: "Nurse Led",
      description: "Nurse-led appointment",
    },
  ];

  // Write output
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  function writeJson(filename, data) {
    const filepath = path.join(OUTPUT_DIR, filename);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, content, "utf-8");
    console.log(
      `  Written: ${filepath} (${Buffer.byteLength(content)} bytes)`
    );
  }

  console.log(`\nWriting output files to ${OUTPUT_DIR}...`);
  writeJson("clinicians.json", clinicians);
  writeJson("weeks.json", allWeeks);
  writeJson("sessionTypes.json", sessionTypes);
  writeJson("appointmentTypes.json", appointmentTypes);

  console.log("\nDone! Data extraction complete.");
}

main();
