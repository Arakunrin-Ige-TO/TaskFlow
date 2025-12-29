class Task {
    /**
     * Creates a new Task instance
     * @param {Object} taskData - Object containing task properties
     */
    constructor(taskData) {
        // Generate unique ID using timestamp + random number
        this.id = taskData.id || this.generateId();
        
        // Required property
        this.title = taskData.title.trim();
        
        // Optional properties with defaults
        this.priority = taskData.priority || 'medium';
        this.category = taskData.category || 'personal';
        this.dueDate = taskData.dueDate || null;
        
        // Status tracking
        this.isComplete = taskData.isComplete || false;
        
        // Timestamps
        this.createdAt = taskData.createdAt || new Date().toISOString();
        this.completedAt = taskData.completedAt || null;
    }

    /**
     * Generates a unique ID for the task
     * @returns {string} Unique identifier
     */
    generateId() {
        return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Checks if the task is overdue
     * @returns {boolean} True if task is past due date and not completed
     */
    isOverdue() {
        if (!this.dueDate || this.isComplete) {
            return false;
        }
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const dueDate = new Date(this.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        return dueDate < today;
    }

    /**
     * Toggles the completion status of the task
     */
    toggleComplete() {
        this.isComplete = !this.isComplete;
        this.completedAt = this.isComplete ? new Date().toISOString() : null;
    }

    /**
     * Updates task properties
     * @param {Object} updates - Object containing properties to update
     */
    update(updates) {
        const allowedUpdates = ['title', 'priority', 'category', 'dueDate'];
        
        allowedUpdates.forEach(key => {
            if (updates.hasOwnProperty(key)) {
                this[key] = key === 'title' ? updates[key].trim() : updates[key];
            }
        });
    }

    /**
     * Converts task to plain object for storage
     * @returns {Object} Plain object representation of task
     */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            priority: this.priority,
            category: this.category,
            dueDate: this.dueDate,
            isComplete: this.isComplete,
            createdAt: this.createdAt,
            completedAt: this.completedAt
        };
    }
}

/**
 * TaskManager Object
 * Handles all task operations (CRUD) and filtering/sorting
 */
const TaskManager = {
    // Array to hold all tasks
    tasks: [],

    /**
     * Initializes TaskManager by loading tasks from storage
     */
    init: function() {
        this.loadTasks();
    },

    /**
     * Loads tasks from localStorage and converts to Task instances
     */
    loadTasks: function() {
        const storedTasks = Storage.getTasks();
        
        // Convert plain objects to Task instances
        this.tasks = storedTasks.map(taskData => new Task(taskData));
        
        console.log(`Loaded ${this.tasks.length} tasks from storage`);
    },

    /**
     * Saves current tasks to localStorage
     */
    saveTasks: function() {
        // Convert Task instances to plain objects
        const tasksData = this.tasks.map(task => task.toJSON());
        Storage.saveTasks(tasksData);
    },

    /**
     * Adds a new task
     * @param {Object} taskData - Data for the new task
     * @returns {Task} The newly created task
     */
    addTask: function(taskData) {
        // Create new Task instance
        const newTask = new Task(taskData);
        
        // Add to beginning of array (newest first)
        this.tasks.unshift(newTask);
        
        // Persist to storage
        this.saveTasks();
        
        return newTask;
    },

    /**
     * Gets a task by its ID
     * @param {string} taskId - The task's unique ID
     * @returns {Task|undefined} The task if found
     */
    getTaskById: function(taskId) {
        return this.tasks.find(task => task.id === taskId);
    },

    /**
     * Updates an existing task
     * @param {string} taskId - The task's unique ID
     * @param {Object} updates - Properties to update
     * @returns {Task|null} Updated task or null if not found
     */
    updateTask: function(taskId, updates) {
        const task = this.getTaskById(taskId);
        
        if (!task) {
            console.error(`Task with ID ${taskId} not found`);
            return null;
        }
        
        // Update task properties
        task.update(updates);
        
        // Persist changes
        this.saveTasks();
        
        return task;
    },

    /**
     * Toggles completion status of a task
     * @param {string} taskId - The task's unique ID
     * @returns {Task|null} Updated task or null if not found
     */
    toggleTaskComplete: function(taskId) {
        const task = this.getTaskById(taskId);
        
        if (!task) {
            console.error(`Task with ID ${taskId} not found`);
            return null;
        }
        
        // Toggle completion
        task.toggleComplete();
        
        // Persist changes
        this.saveTasks();
        
        return task;
    },

    /**
     * Deletes a task
     * @param {string} taskId - The task's unique ID
     * @returns {boolean} True if task was deleted
     */
    deleteTask: function(taskId) {
        const initialLength = this.tasks.length;
        
        // Filter out the task to delete
        this.tasks = this.tasks.filter(task => task.id !== taskId);
        
        // Check if a task was actually removed
        if (this.tasks.length < initialLength) {
            this.saveTasks();
            return true;
        }
        
        return false;
    },

    /**
     * Deletes all completed tasks
     * @returns {number} Number of tasks deleted
     */
    clearCompleted: function() {
        const initialLength = this.tasks.length;
        
        this.tasks = this.tasks.filter(task => !task.isComplete);
        
        const deletedCount = initialLength - this.tasks.length;
        
        if (deletedCount > 0) {
            this.saveTasks();
        }
        
        return deletedCount;
    },

    /**
     * Deletes all tasks
     * @returns {number} Number of tasks deleted
     */
    clearAll: function() {
        const count = this.tasks.length;
        this.tasks = [];
        Storage.clearAll();
        return count;
    },

    /**
     * Filters tasks based on criteria
     * @param {string} filter - Filter type: 'all', 'pending', 'completed', 'overdue'
     * @returns {Array} Filtered array of tasks
     */
    filterTasks: function(filter) {
        switch (filter) {
            case 'pending':
                return this.tasks.filter(task => !task.isComplete);
            
            case 'completed':
                return this.tasks.filter(task => task.isComplete);
            
            case 'overdue':
                return this.tasks.filter(task => task.isOverdue());
            
            case 'all':
            default:
                return [...this.tasks];
        }
    },

    /**
     * Searches tasks by title
     * @param {string} query - Search query
     * @returns {Array} Tasks matching the search query
     */
    searchTasks: function(query) {
        if (!query.trim()) {
            return [...this.tasks];
        }
        
        const searchTerm = query.toLowerCase().trim();
        
        return this.tasks.filter(task => 
            task.title.toLowerCase().includes(searchTerm)
        );
    },

    /**
     * Sorts tasks by specified criteria
     * @param {Array} tasks - Array of tasks to sort
     * @param {string} sortBy - Sort criteria
     * @returns {Array} Sorted array of tasks
     */
    sortTasks: function(tasks, sortBy) {
        // Create a copy to avoid mutating original array
        const sortedTasks = [...tasks];
        
        switch (sortBy) {
            case 'dueDate':
                return sortedTasks.sort((a, b) => {
                    // Tasks without due date go to end
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return new Date(a.dueDate) - new Date(b.dueDate);
                });
            
            case 'priority':
                const priorityOrder = { high: 0, medium: 1, low: 2 };
                return sortedTasks.sort((a, b) => 
                    priorityOrder[a.priority] - priorityOrder[b.priority]
                );
            
            case 'alphabetical':
                return sortedTasks.sort((a, b) => 
                    a.title.localeCompare(b.title)
                );
            
            case 'dateCreated':
            default:
                return sortedTasks.sort((a, b) => 
                    new Date(b.createdAt) - new Date(a.createdAt)
                );
        }
    },

    /**
     * Gets statistics about tasks
     * @returns {Object} Statistics object
     */
    getStats: function() {
        const total = this.tasks.length;
        const completed = this.tasks.filter(task => task.isComplete).length;
        const pending = total - completed;
        const overdue = this.tasks.filter(task => task.isOverdue()).length;
        
        return {
            total,
            completed,
            pending,
            overdue,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0
        };
    }
};