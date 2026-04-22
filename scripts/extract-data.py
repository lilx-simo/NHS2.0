#!/usr/bin/env python
"""
NHS Capacity Planner - Data Extraction Pipeline

Reads the NHS Excel workbook and extracts structured data into JSON fixture files
for use by the Next.js application.

Usage:
    python scripts/extract-data.py

Requires: xlrd (pip install xlrd)
"""
import sys
import os
import json
import re
from datetime import datetime, timedelta

try:
    import xlrd
except ImportError:
    print("ERROR: xlrd is not installed. Run: python -m pip install xlrd", file=sys.stderr)
    sys.exit(1)

# Paths
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
EXCEL_PATH = os.path.join(os.path.dirname(PROJECT_DIR), "NHS Capacity and demand planner_data - confidential.xls")
OUTPUT_DIR = os.path.join(PROJECT_DIR, "src", "data")

# Days of the week
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
PERIODS = ["AM", "PM"]

# Known session type codes
KNOWN_SESSION_TYPES = {
    "CP", "SRH", "MWM", "Wash", "Theatre", "MnNew", "MnRev",
    "MwWed", "MwFri", "MwMon", "add", "Nurse", "NCP",
}

# Known unavailability reasons
UNAVAILABILITY_REASONS = {
    "Annual Leave", "Study Leave", "SICK", "AUDIT", "Theatre",
    "A/L", "S/L", "AL", "SL", "Sick", "sick",
    "annual leave", "study leave",
}

# Appointment type column headers
APPOINTMENT_TYPE_NAMES = ["NewSRH", "Review", "NCP", "NMWM", "Nwash", "Nurse led"]


def parse_sheet_date(sheet_name):
    """Parse sheet name in DD.MM.YY format to ISO date string."""
    try:
        dt = datetime.strptime(sheet_name.strip(), "%d.%m.%y")
        return dt.strftime("%Y-%m-%d")
    except ValueError:
        return None


def safe_str(val):
    """Convert cell value to a clean string."""
    if val is None:
        return ""
    if isinstance(val, float):
        if val == int(val):
            return str(int(val))
        return str(val)
    return str(val).strip()


def safe_int(val, default=0):
    """Convert cell value to int safely."""
    if val is None or val == "":
        return default
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return default


def is_unavailability(val):
    """Check if a cell value represents an unavailability type."""
    s = safe_str(val)
    if not s:
        return None
    # Check exact matches and common abbreviations
    s_lower = s.lower().strip()
    unavail_map = {
        "annual leave": "Annual Leave",
        "a/l": "Annual Leave",
        "al": "Annual Leave",
        "study leave": "Study Leave",
        "s/l": "Study Leave",
        "sl": "Study Leave",
        "sick": "SICK",
        "audit": "AUDIT",
        "theatre": "Theatre",
    }
    return unavail_map.get(s_lower)


def is_session_type(val):
    """Check if a cell value is a valid session type code."""
    s = safe_str(val)
    if not s:
        return None
    # Check if it matches known session types (case-sensitive)
    if s in KNOWN_SESSION_TYPES:
        return s
    # Also check case-insensitive for common ones
    s_upper = s.upper()
    for known in KNOWN_SESSION_TYPES:
        if s_upper == known.upper():
            return known
    # If it looks like a session code (short alphanumeric), return it
    if re.match(r'^[A-Za-z][A-Za-z0-9/]{0,8}$', s) and s not in ("AM", "PM", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun", "KEY"):
        return s
    return None


def extract_sheet_data(sheet, wb, sheet_name):
    """Extract all data from a single weekly sheet."""
    week_start = parse_sheet_date(sheet_name)
    if not week_start:
        return None

    nrows = sheet.nrows
    ncols = sheet.ncols

    # =========================================================================
    # STEP 1: Find key structural rows by scanning for known markers
    # =========================================================================
    timetable_header_row = None
    day_header_row = None
    column_header_row = None
    clinician_start_row = None
    total_clinic_slots_row = None
    total_additional_row = None
    key_row = None

    for r in range(nrows):
        row_vals = [safe_str(sheet.cell_value(r, c)) for c in range(min(ncols, 5))]
        joined = " ".join(row_vals).strip()

        if "TIMETABLE FOR CLINICIAN" in joined.upper() or "TIMETABLE" in joined.upper():
            timetable_header_row = r
        if any("Monday" in v or "MONDAY" in v for v in row_vals):
            if day_header_row is None:
                day_header_row = r
        # Look for "Clinician" or numbered column headers row
        first_cell = safe_str(sheet.cell_value(r, 0))
        if first_cell.lower() in ("clinician name", "clinician", "name", ""):
            # Check if this row has AM/PM or appointment type headers nearby
            row_all = [safe_str(sheet.cell_value(r, c)) for c in range(min(ncols, 32))]
            if any(v in ("AM", "PM") for v in row_all) or any(v in APPOINTMENT_TYPE_NAMES for v in row_all):
                if column_header_row is None or r > (timetable_header_row or 0):
                    column_header_row = r

        if "total clinic slots" in joined.lower() or "total slots" in joined.lower():
            total_clinic_slots_row = r
        if "total additional" in joined.lower() or "additional session" in joined.lower():
            total_additional_row = r
        if first_cell.upper() == "KEY":
            key_row = r

    # =========================================================================
    # STEP 2: Find column mapping for day/period pairs
    # =========================================================================
    # The clinician timetable typically has:
    # Col 0: row number or clinician name
    # Then pairs of columns for AM/PM for each day (Mon-Sun)
    # Then appointment type total columns

    # Try to detect column layout from the day header row or column header row
    day_period_cols = []  # List of (col_index, day_name, period)
    appt_type_cols = []   # List of (col_index, appt_type_name)

    header_row_to_scan = column_header_row or day_header_row
    if header_row_to_scan is not None:
        row_vals = [safe_str(sheet.cell_value(header_row_to_scan, c)) for c in range(min(ncols, 32))]

        # Scan for AM/PM patterns
        for c in range(len(row_vals)):
            if row_vals[c] in ("AM", "PM"):
                # Determine which day this column belongs to
                # Look at the row above (day header row) for the day name
                if day_header_row is not None and day_header_row < header_row_to_scan:
                    # Check the day header row - days span across columns
                    day_val = safe_str(sheet.cell_value(day_header_row, c))
                    if not day_val:
                        # Merged cell - look left
                        for cl in range(c - 1, -1, -1):
                            day_val = safe_str(sheet.cell_value(day_header_row, cl))
                            if day_val:
                                break
                    # Map day name
                    day_name = None
                    for d in DAYS:
                        if d.lower() in day_val.lower():
                            day_name = d
                            break
                    if day_name:
                        day_period_cols.append((c, day_name, row_vals[c]))
                else:
                    # Try to infer day from column position
                    # Typical layout: col 1-2 = Mon AM/PM, col 3-4 = Tue AM/PM, etc.
                    day_idx = (c - 1) // 2
                    if 0 <= day_idx < 7:
                        day_period_cols.append((c, DAYS[day_idx], row_vals[c]))

            # Check for appointment type columns
            if row_vals[c] in APPOINTMENT_TYPE_NAMES:
                appt_type_cols.append((c, row_vals[c]))

    # If we couldn't detect day/period columns from headers, use default layout
    if not day_period_cols:
        # Default: col 1=Mon AM, col 2=Mon PM, col 3=Tue AM, col 4=Tue PM, ...
        for day_idx, day_name in enumerate(DAYS):
            for period_idx, period in enumerate(PERIODS):
                col = 1 + day_idx * 2 + period_idx
                if col < ncols:
                    day_period_cols.append((col, day_name, period))

    # =========================================================================
    # STEP 3: Find clinician rows - rows between column header and totals
    # =========================================================================
    clinician_rows = []
    start_scan = (column_header_row or 13) + 1
    end_scan = total_clinic_slots_row or key_row or min(nrows, 35)

    for r in range(start_scan, end_scan):
        # Check if this row has meaningful content
        row_vals = [safe_str(sheet.cell_value(r, c)) for c in range(min(ncols, 25))]
        joined = " ".join(row_vals).strip()

        # Skip empty rows, header rows, total rows
        if not joined:
            continue
        if "total" in joined.lower() and ("clinic" in joined.lower() or "additional" in joined.lower() or "slot" in joined.lower()):
            continue
        if "KEY" in joined.upper() and len(joined) < 10:
            continue

        # Check if the row has session type codes or unavailability markers
        has_content = False
        for c_idx, day, period in day_period_cols:
            if c_idx < ncols:
                cell_val = safe_str(sheet.cell_value(r, c_idx))
                if cell_val and cell_val != ".":
                    has_content = True
                    break

        # Also check first column for clinician identifier
        first_val = safe_str(sheet.cell_value(r, 0))

        if has_content or (first_val and first_val not in (".", "")):
            clinician_rows.append(r)

    # =========================================================================
    # STEP 4: Extract clinician sessions and unavailability
    # =========================================================================
    sessions = []
    unavailability = []
    clinician_names = {}
    all_session_types = set()
    clinician_id_counter = 1

    for row_idx in clinician_rows:
        first_cell = safe_str(sheet.cell_value(row_idx, 0))

        # Determine clinician ID
        # The first cell might be a number (row number) or a name
        clinician_id = None
        clinician_label = first_cell

        if first_cell.isdigit():
            clinician_id = int(first_cell)
        else:
            clinician_id = clinician_id_counter

        clinician_id_counter = max(clinician_id_counter, clinician_id + 1) if clinician_id else clinician_id_counter + 1

        if clinician_id and clinician_label:
            clinician_names[clinician_id] = clinician_label

        # Extract session data for each day/period
        for col_idx, day, period in day_period_cols:
            if col_idx >= ncols:
                continue
            cell_val = safe_str(sheet.cell_value(row_idx, col_idx))
            if not cell_val:
                continue

            # Check if it's unavailability
            unavail = is_unavailability(cell_val)
            if unavail:
                unavailability.append({
                    "clinicianId": clinician_id,
                    "day": day,
                    "period": period,
                    "reason": unavail,
                })
                continue

            # Check if it's a session type
            session_type = is_session_type(cell_val)
            if session_type:
                all_session_types.add(session_type)
                sessions.append({
                    "clinicianId": clinician_id,
                    "day": day,
                    "period": period,
                    "sessionType": session_type,
                    "location": "Main Site",
                })

    # =========================================================================
    # STEP 5: Extract appointment type slot counts
    # =========================================================================
    slot_totals = {}
    for appt_col, appt_name in appt_type_cols:
        # Sum values in this column for clinician rows
        total = 0
        for row_idx in clinician_rows:
            if appt_col < ncols:
                val = sheet.cell_value(row_idx, appt_col)
                total += safe_int(val)
        slot_totals[appt_name] = total

    # Also try to get from the totals row if present
    if total_clinic_slots_row is not None:
        for appt_col, appt_name in appt_type_cols:
            if appt_col < ncols:
                val = sheet.cell_value(total_clinic_slots_row, appt_col)
                v = safe_int(val)
                if v > 0:
                    slot_totals[appt_name] = v

    # Ensure all appointment types are present
    for at in APPOINTMENT_TYPE_NAMES:
        if at not in slot_totals:
            slot_totals[at] = 0

    # =========================================================================
    # STEP 6: Extract total clinic slots and additional sessions
    # =========================================================================
    total_clinic_slots = 0
    total_additional_sessions = 0

    if total_clinic_slots_row is not None:
        # Look for a numeric total in the row
        for c in range(ncols):
            val = safe_str(sheet.cell_value(total_clinic_slots_row, c))
            if val.lower() in ("total clinic slots", "total slots"):
                # The total is likely in the next column or further right
                for c2 in range(c + 1, min(ncols, c + 10)):
                    v = safe_int(sheet.cell_value(total_clinic_slots_row, c2))
                    if v > 0:
                        total_clinic_slots = v
                        break
                break
        # If not found, sum the slot totals
        if total_clinic_slots == 0:
            total_clinic_slots = sum(slot_totals.values())

    if total_additional_row is not None:
        for c in range(ncols):
            val = safe_str(sheet.cell_value(total_additional_row, c))
            if "additional" in val.lower():
                for c2 in range(c + 1, min(ncols, c + 10)):
                    v = safe_int(sheet.cell_value(total_additional_row, c2))
                    if v > 0:
                        total_additional_sessions = v
                        break
                break

    # Fallback: if total_clinic_slots is still 0, compute from slot_totals
    if total_clinic_slots == 0:
        total_clinic_slots = sum(slot_totals.values())

    return {
        "weekStart": week_start,
        "sessions": sessions,
        "slotTotals": slot_totals,
        "totalClinicSlots": total_clinic_slots,
        "totalAdditionalSessions": total_additional_sessions,
        "unavailability": unavailability,
        "clinicianNames": clinician_names,
        "sessionTypes": list(all_session_types),
    }


def main():
    print(f"Opening workbook: {EXCEL_PATH}")
    if not os.path.exists(EXCEL_PATH):
        print(f"ERROR: Excel file not found at {EXCEL_PATH}", file=sys.stderr)
        sys.exit(1)

    wb = xlrd.open_workbook(EXCEL_PATH)
    sheet_names = wb.sheet_names()
    print(f"Found {len(sheet_names)} sheets: {sheet_names}")

    # Filter to weekly sheets only (skip Sheet1, Sheet3)
    weekly_sheet_names = [s for s in sheet_names if s not in ("Sheet1", "Sheet3")]
    print(f"Processing {len(weekly_sheet_names)} weekly sheets...")

    # =========================================================================
    # Extract data from all weekly sheets
    # =========================================================================
    all_weeks = []
    all_clinicians = {}
    all_session_types = set()
    skipped = []

    for sheet_name in weekly_sheet_names:
        print(f"  Processing sheet: {sheet_name}...", end=" ")
        sheet = wb.sheet_by_name(sheet_name)

        result = extract_sheet_data(sheet, wb, sheet_name)
        if result is None:
            print("SKIPPED (could not parse date)")
            skipped.append(sheet_name)
            continue

        # Merge clinician names
        for cid, cname in result["clinicianNames"].items():
            if cid not in all_clinicians:
                all_clinicians[cid] = cname

        # Merge session types
        all_session_types.update(result["sessionTypes"])

        # Build week record (without clinicianNames/sessionTypes which are global)
        week_record = {
            "weekStart": result["weekStart"],
            "sessions": result["sessions"],
            "slotTotals": result["slotTotals"],
            "totalClinicSlots": result["totalClinicSlots"],
            "totalAdditionalSessions": result["totalAdditionalSessions"],
            "unavailability": result["unavailability"],
        }
        all_weeks.append(week_record)

        session_count = len(result["sessions"])
        unavail_count = len(result["unavailability"])
        print(f"OK ({session_count} sessions, {unavail_count} unavailable, slots={result['totalClinicSlots']})")

    # Sort weeks by date
    all_weeks.sort(key=lambda w: w["weekStart"])

    if skipped:
        print(f"\nSkipped sheets: {skipped}")

    # =========================================================================
    # Build output data
    # =========================================================================
    print(f"\n=== Summary ===")
    print(f"  Weeks extracted: {len(all_weeks)}")
    print(f"  Clinicians found: {len(all_clinicians)}")
    print(f"  Session types: {sorted(all_session_types)}")
    print(f"  Date range: {all_weeks[0]['weekStart'] if all_weeks else 'N/A'} to {all_weeks[-1]['weekStart'] if all_weeks else 'N/A'}")

    # Clinicians list
    clinicians = []
    for cid in sorted(all_clinicians.keys()):
        clinicians.append({
            "id": cid,
            "label": all_clinicians[cid],
        })

    # Session types list
    session_types = sorted(all_session_types)

    # Appointment types
    appointment_types = [
        {"code": "NewSRH", "name": "New SRH", "description": "New Sexual & Reproductive Health appointment"},
        {"code": "Review", "name": "Review", "description": "Follow-up review appointment"},
        {"code": "NCP", "name": "NCP", "description": "New Contraceptive Pill appointment"},
        {"code": "NMWM", "name": "NMWM", "description": "New Midweek Morning appointment"},
        {"code": "Nwash", "name": "Nwash", "description": "New Walk-in/Wash appointment"},
        {"code": "Nurse led", "name": "Nurse Led", "description": "Nurse-led appointment"},
    ]

    # =========================================================================
    # Write output files
    # =========================================================================
    os.makedirs(OUTPUT_DIR, exist_ok=True)

    def write_json(filename, data):
        filepath = os.path.join(OUTPUT_DIR, filename)
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"  Written: {filepath} ({os.path.getsize(filepath)} bytes)")

    print(f"\nWriting output files to {OUTPUT_DIR}...")
    write_json("clinicians.json", clinicians)
    write_json("weeks.json", all_weeks)
    write_json("sessionTypes.json", session_types)
    write_json("appointmentTypes.json", appointment_types)

    print("\nDone! Data extraction complete.")


if __name__ == "__main__":
    main()
