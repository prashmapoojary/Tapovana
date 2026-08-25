/**
 * Date and Time Input Normalizer & Display Utilities
 * Prevents HTML5 <input type="date"> and <input type="time"> validation errors.
 */

/**
 * Normalizes any date string/ISO timestamp/Date object to 'YYYY-MM-DD' for <input type="date">
 * @param {string|Date|null|undefined} dateVal
 * @returns {string} 'YYYY-MM-DD' or ''
 */
export function formatDateForInput(dateVal) {
  if (!dateVal) return "";
  try {
    if (typeof dateVal === "string") {
      const trimmed = dateVal.trim();
      if (!trimmed) return "";
      
      // If already YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        return trimmed;
      }
      // If YYYY-MM-DDTHH:mm:ss.sssZ or similar ISO format
      if (trimmed.includes("T")) {
        const parts = trimmed.split("T")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) {
          return parts;
        }
      }
      // Space separated Date Time
      if (trimmed.includes(" ")) {
        const parts = trimmed.split(" ")[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(parts)) {
          return parts;
        }
      }
    }

    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  } catch (err) {
    console.warn("formatDateForInput error:", err);
    return "";
  }
}

/**
 * Normalizes any time string (e.g. "10:00 AM - 12:00 PM", "10:00 AM", "2:30 PM", "14:30") to 24-hour 'HH:mm' for <input type="time">
 * @param {string|Date|null|undefined} timeVal
 * @returns {string} 'HH:mm' or ''
 */
export function formatTimeForInput(timeVal) {
  if (!timeVal) return "";
  try {
    let str = String(timeVal).trim();
    if (!str) return "";

    // If time range like "10:00 AM - 12:00 PM", extract first part "10:00 AM"
    if (str.includes("-")) {
      str = str.split("-")[0].trim();
    }

    // Match 12-hour or 24-hour patterns
    const match = str.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
    if (match) {
      let hours = parseInt(match[1], 10);
      const minutes = match[2];
      const period = match[3] ? match[3].toUpperCase() : null;

      if (period === "PM" && hours < 12) hours += 12;
      if (period === "AM" && hours === 12) hours = 0;

      const hh = String(hours).padStart(2, "0");
      return `${hh}:${minutes}`;
    }

    // Fallback: If it's already HH:mm
    if (/^\d{2}:\d{2}$/.test(str)) {
      return str;
    }

    // Fallback: try Date object parsing
    const d = new Date(`1970-01-01T${str}`);
    if (!isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, "0");
      const mm = String(d.getMinutes()).padStart(2, "0");
      return `${hh}:${mm}`;
    }

    return "";
  } catch (err) {
    console.warn("formatTimeForInput error:", err);
    return "";
  }
}

/**
 * Normalizes any date/time string to 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
 * @param {string|Date|null|undefined} dtVal
 * @returns {string} 'YYYY-MM-DDTHH:mm' or ''
 */
export function formatDateTimeLocalForInput(dtVal) {
  if (!dtVal) return "";
  try {
    const d = new Date(dtVal);
    if (isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch (err) {
    console.warn("formatDateTimeLocalForInput error:", err);
    return "";
  }
}

/**
 * Format user-friendly date for display (e.g., "29 Aug 2026")
 */
export function formatDisplayDate(dateVal) {
  if (!dateVal) return "";
  const dateStr = formatDateForInput(dateVal);
  if (!dateStr) return "";
  try {
    const [y, m, d] = dateStr.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
  } catch {
    return dateStr;
  }
}

/**
 * Format user-friendly time for display (e.g. "10:00 AM")
 */
export function formatDisplayTime(timeVal) {
  const time24 = formatTimeForInput(timeVal);
  if (!time24) return String(timeVal || "");
  try {
    const [hStr, mStr] = time24.split(":");
    let h = parseInt(hStr, 10);
    const period = h >= 12 ? "PM" : "AM";
    if (h > 12) h -= 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${mStr} ${period}`;
  } catch {
    return timeVal;
  }
}
