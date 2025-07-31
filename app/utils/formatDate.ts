// Función para formatear fecha para mostrar (DD/MM/YYYY)
const formatDateForDisplay = (dateString: string): string => {
    if (!dateString) return "";

    // Si está en formato YYYY-MM-DD, convertir a DD/MM/YYYY
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [year, month, day] = dateString.split('-');
        return `${day}/${month}/${year}`;
    }

    return dateString;
};

// Función para formatear fecha (YYYY-MM-DD)
const formatDateForDB = (dateString: string): string | null => {
    if (!dateString) return null;
    const isFormatDateClasic = /^\d{4}-\d{2}-\d{2}$/.test(dateString);
    const isFormatDateDDMMYYYY = /^\d{2}\/\d{2}\/\d{4}$/.test(dateString) ||
        /^\d{2}-\d{2}-\d{4}$/.test(dateString);

    // Si ya está en formato YYYY-MM-DD, devolverlo
    if (isFormatDateClasic) return dateString;

    // Si está en formato DD/MM/YYYY, convertir
    if (isFormatDateDDMMYYYY) {
        const [day, month, year] = dateString.split('/');
        return `${year}-${month}-${day}`;
    }

    return null;
};

export {
    formatDateForDisplay,
    formatDateForDB
}