/**
 * Format date to DD/MM/YYYY
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatDate = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();

    return `${day}/${month}/${year}`;
};

/**
 * Format time to HH:MM:SS AM/PM (12h)
 * @param {Date|string} date 
 * @returns {string}
 */
export const formatTime = (date) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    const hoursStr = String(hours).padStart(2, '0');

    return `${hoursStr}:${minutes}:${seconds} ${ampm}`;
};

/**
 * Combined format DD/MM/YYYY HH:MM:SS AM/PM
 */
export const formatDateTime = (date) => {
    if (!date) return '';
    return `${formatDate(date)} ${formatTime(date)}`;
};
