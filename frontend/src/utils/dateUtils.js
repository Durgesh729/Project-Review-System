/**
 * Formats a date string or object to DD/MM/YYYY format.
 * @param {string|Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
export const formatDateDDMMYYYY = (date) => {
    if (!date) return "—";
    const d = new Date(date);

    // Check if date is valid
    if (isNaN(d.getTime())) return "—";

    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};
