
const Storage = {
    // Key used to store tasks in localStorage
    STORAGE_KEY: 'taskflow_tasks',

    /**
     * Retrieves all tasks from localStorage
     * @returns {Array} Array of task objects, or empty array if none exist
     */
    getTasks: function() {
        try {
            // Get the stored JSON string
            const tasksJSON = localStorage.getItem(this.STORAGE_KEY);
            
            // If no tasks stored, return empty array
            if (!tasksJSON) {
                return [];
            }
            
            // Parse JSON string back to JavaScript array
            const tasks = JSON.parse(tasksJSON);
            
            // Validate that we have an array
            if (!Array.isArray(tasks)) {
                console.warn('Stored tasks is not an array, returning empty array');
                return [];
            }
            
            return tasks;
        } catch (error) {
            // Handle JSON parse errors or other issues
            console.error('Error reading from localStorage:', error);
            return [];
        }
    },

    /**
     * Saves tasks array to localStorage
     * @param {Array} tasks - Array of task objects to save
     * @returns {boolean} True if successful, false otherwise
     */
    saveTasks: function(tasks) {
        try {
            // Validate input is an array
            if (!Array.isArray(tasks)) {
                console.error('saveTasks requires an array');
                return false;
            }
            
            // Convert tasks array to JSON string
            const tasksJSON = JSON.stringify(tasks);
            
            // Save to localStorage
            localStorage.setItem(this.STORAGE_KEY, tasksJSON);
            
            return true;
        } catch (error) {
            // Handle quota exceeded or other storage errors
            console.error('Error saving to localStorage:', error);
            
            // Check if storage quota exceeded
            if (error.name === 'QuotaExceededError') {
                alert('Storage quota exceeded! Please delete some tasks.');
            }
            
            return false;
        }
    },

    /**
     * Clears all tasks from localStorage
     * @returns {boolean} True if successful
     */
    clearAll: function() {
        try {
            localStorage.removeItem(this.STORAGE_KEY);
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    },

    /**
     * Checks if localStorage is available in the browser
     * @returns {boolean} True if localStorage is available
     */
    isAvailable: function() {
        try {
            const testKey = '__storage_test__';
            localStorage.setItem(testKey, testKey);
            localStorage.removeItem(testKey);
            return true;
        } catch (error) {
            return false;
        }
    },

    /**
     * Gets storage usage information
     * @returns {Object} Object containing used and available space info
     */
    getStorageInfo: function() {
        try {
            const tasksJSON = localStorage.getItem(this.STORAGE_KEY) || '';
            const usedBytes = new Blob([tasksJSON]).size;
            
            return {
                usedBytes: usedBytes,
                usedKB: (usedBytes / 1024).toFixed(2),
                taskCount: this.getTasks().length
            };
        } catch (error) {
            return {
                usedBytes: 0,
                usedKB: '0',
                taskCount: 0
            };
        }
    }
};