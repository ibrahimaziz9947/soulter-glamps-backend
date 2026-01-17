/**
 * Date Range Parsing Utility
 * Provides consistent date range parsing for dashboard and reporting endpoints
 */

import { AppError } from './errors.js';

/**
 * Parse date range from query parameters with validation
 * 
 * @param {string|undefined} queryFrom - Start date from query params (YYYY-MM-DD or ISO)
 * @param {string|undefined} queryTo - End date from query params (YYYY-MM-DD or ISO)
 * @param {number} defaultDays - Default range in days if from/to not provided (default: 30)
 * 
 * @returns {Object} Parsed date range with Date objects and ISO strings
 * @returns {Date} from - Start date as Date object (beginning of day)
 * @returns {Date} to - End date as Date object (end of day)
 * @returns {string} fromISO - Start date as ISO string
 * @returns {string} toISO - End date as ISO string
 * 
 * @throws {AppError} 400 - If date format is invalid
 * @throws {AppError} 400 - If from date is after to date
 * 
 * @example
 * // Default: last 30 days
 * const range = parseDateRange(undefined, undefined);
 * // { from: Date, to: Date, fromISO: "2025-12-19T00:00:00.000Z", toISO: "2026-01-18T23:59:59.999Z" }
 * 
 * @example
 * // Custom range with YYYY-MM-DD format
 * const range = parseDateRange('2026-01-01', '2026-01-31');
 * // { from: Date, to: Date, fromISO: "2026-01-01T00:00:00.000Z", toISO: "2026-01-31T23:59:59.999Z" }
 * 
 * @example
 * // Custom range with ISO datetime format
 * const range = parseDateRange('2026-01-01T10:00:00Z', '2026-01-31T18:00:00Z');
 * // { from: Date, to: Date, fromISO: "2026-01-01T10:00:00.000Z", toISO: "2026-01-31T18:00:00.000Z" }
 */
export const parseDateRange = (queryFrom, queryTo, defaultDays = 30) => {
  // Normalize empty strings to undefined
  const from = queryFrom === '' ? undefined : queryFrom;
  const to = queryTo === '' ? undefined : queryTo;

  let fromDate;
  let toDate;

  // If no dates provided, use default range
  if (!from && !to) {
    toDate = new Date();
    toDate.setHours(23, 59, 59, 999);
    
    fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - defaultDays);
    fromDate.setHours(0, 0, 0, 0);
  } else {
    // Parse provided dates
    fromDate = from ? parseDate(from, false, 'from') : null;
    toDate = to ? parseDate(to, true, 'to') : null;

    // If only one date provided, throw error for clarity
    if (fromDate && !toDate) {
      throw new AppError(
        "'to' date is required when 'from' date is provided",
        400
      );
    }
    if (!fromDate && toDate) {
      throw new AppError(
        "'from' date is required when 'to' date is provided",
        400
      );
    }
  }

  // Validate date range
  if (fromDate && toDate && fromDate > toDate) {
    throw new AppError(
      "'from' date must be before or equal to 'to' date",
      400
    );
  }

  return {
    from: fromDate,
    to: toDate,
    fromISO: fromDate.toISOString(),
    toISO: toDate.toISOString(),
  };
};

/**
 * Parse and validate a single date string
 * 
 * @param {string} dateString - Date string to parse
 * @param {boolean} isEndDate - Whether to use end of day (23:59:59.999) for date-only strings
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {Date} Parsed date object
 * @throws {AppError} 400 - If date format is invalid
 * 
 * @private
 * 
 * Supported formats:
 * - YYYY-MM-DD (e.g., 2026-01-15) - Treated as start/end of day based on isEndDate
 * - ISO datetime (e.g., 2026-01-15T10:30:00Z) - Used as-is
 */
const parseDate = (dateString, isEndDate = false, fieldName = 'date') => {
  if (!dateString) return null;

  // Check if it's a date-only string (YYYY-MM-DD)
  const dateOnlyRegex = /^\d{4}-\d{2}-\d{2}$/;
  const isDateOnly = dateOnlyRegex.test(dateString);

  let date;
  if (isDateOnly) {
    // Date-only format: treat as start/end of day in UTC
    if (isEndDate) {
      date = new Date(`${dateString}T23:59:59.999Z`);
    } else {
      date = new Date(`${dateString}T00:00:00.000Z`);
    }
  } else {
    // Assume ISO datetime string
    date = new Date(dateString);
  }

  // Validate date
  if (isNaN(date.getTime())) {
    throw new AppError(
      `Invalid date format for '${fieldName}'. Use YYYY-MM-DD or ISO format (e.g., 2026-01-15 or 2026-01-15T10:30:00Z)`,
      400
    );
  }

  return date;
};

/**
 * Format date range for display in responses
 * 
 * @param {Date} from - Start date
 * @param {Date} to - End date
 * @returns {Object} Formatted range object
 * @returns {string} from - ISO string of start date
 * @returns {string} to - ISO string of end date
 * 
 * @example
 * const display = formatDateRange(new Date('2026-01-01'), new Date('2026-01-31'));
 * // { from: "2026-01-01T00:00:00.000Z", to: "2026-01-31T23:59:59.999Z" }
 */
export const formatDateRange = (from, to) => {
  return {
    from: from.toISOString(),
    to: to.toISOString(),
  };
};
