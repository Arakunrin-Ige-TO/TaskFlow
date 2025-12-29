/**
 * Application Controller
 * Coordinates between UI and TaskManager
 */
const App = {
    // Current state
    currentFilter: 'all',
    currentSort: 'dateCreated',
    currentSearch: '',
    editingTaskId: null,

    // DOM Element References (cached for performance)
    elements: {},

    /**
     * Initialize the application
     */
    init: function() {
        console.log('TaskFlow initializing...');
        
        // Check storage availability
        if (!Storage.isAvailable()) {
            alert('LocalStorage is not available. Tasks will not be saved.');
        }
        
        // Cache DOM elements
        this.cacheElements();
        
        // Initialize TaskManager
        TaskManager.init();
        
        // Set up event listeners
        this.bindEvents();
        
        // Set minimum date for date input to today
        this.setMinDate();
        
        // Render initial state
        this.render();
        
        console.log('TaskFlow ready!');
    },

    /**
     * Cache frequently accessed DOM elements
     */
    cacheElements: function() {
        this.elements = {
            // Form elements
            taskForm: document.getElementById('task-form'),
            taskTitle: document.getElementById('task-title'),
            taskPriority: document.getElementById('task-priority'),
            taskDueDate: document.getElementById('task-due-date'),
            taskCategory: document.getElementById('task-category'),
            submitBtn: document.getElementById('submit-btn'),
            
            // Filter and search
            searchInput: document.getElementById('search-input'),
            filterButtons: document.querySelectorAll('.filter-btn'),
            sortSelect: document.getElementById('sort-select'),
            
            // Task list
            taskList: document.getElementById('task-list'),
            emptyState: document.getElementById('empty-state'),
            
            // Stats
            totalTasks: document.getElementById('total-tasks'),
            completedTasks: document.getElementById('completed-tasks'),
            pendingTasks: document.getElementById('pending-tasks'),
            overdueTasks: document.getElementById('overdue-tasks'),
            
            // Action buttons
            clearCompletedBtn: document.getElementById('clear-completed-btn'),
            clearAllBtn: document.getElementById('clear-all-btn'),
            
            // Modal elements
            editModal: document.getElementById('edit-modal'),
            editForm: document.getElementById('edit-form'),
            editTaskId: document.getElementById('edit-task-id'),
            editTaskTitle: document.getElementById('edit-task-title'),
            editTaskPriority: document.getElementById('edit-task-priority'),
            editTaskDueDate: document.getElementById('edit-task-due-date'),
            editTaskCategory: document.getElementById('edit-task-category'),
            modalClose: document.getElementById('modal-close'),
            cancelEdit: document.getElementById('cancel-edit'),
            
            // Toast
            toast: document.getElementById('toast'),
            toastMessage: document.getElementById('toast-message')
        };
    },

    /**
     * Bind all event listeners
     */
    bindEvents: function() {
        // Form submission
        this.elements.taskForm.addEventListener('submit', (e) => this.handleFormSubmit(e));
        
        // Search input (with debounce)
        this.elements.searchInput.addEventListener('input', 
            this.debounce((e) => this.handleSearch(e), 300)
        );
        
        // Filter buttons
        this.elements.filterButtons.forEach(btn => {
            btn.addEventListener('click', (e) => this.handleFilter(e));
        });
        
        // Sort select
        this.elements.sortSelect.addEventListener('change', (e) => this.handleSort(e));
        
        // Task list - using event delegation for dynamic elements
        this.elements.taskList.addEventListener('click', (e) => this.handleTaskAction(e));
        this.elements.taskList.addEventListener('change', (e) => this.handleTaskCheckbox(e));
        
        // Clear buttons
        this.elements.clearCompletedBtn.addEventListener('click', () => this.handleClearCompleted());
        this.elements.clearAllBtn.addEventListener('click', () => this.handleClearAll());
        
        // Modal events
        this.elements.editForm.addEventListener('submit', (e) => this.handleEditSubmit(e));
        this.elements.modalClose.addEventListener('click', () => this.closeModal());
        this.elements.cancelEdit.addEventListener('click', () => this.closeModal());
        this.elements.editModal.addEventListener('click', (e) => {
            if (e.target === this.elements.editModal) {
                this.closeModal();
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    },

    /**
     * Set minimum date for date inputs to today
     */
    setMinDate: function() {
        const today = new Date().toISOString().split('T')[0];
        this.elements.taskDueDate.setAttribute('min', today);
        this.elements.editTaskDueDate.setAttribute('min', today);
    },

    /**
     * Render the entire application
     */
    render: function() {
        this.renderTasks();
        this.renderStats();
    },

    /**
     * Render the task list
     */
    renderTasks: function() {
        // Get filtered tasks
        let tasks = TaskManager.filterTasks(this.currentFilter);
        
        // Apply search filter
        if (this.currentSearch) {
            const searchTerm = this.currentSearch.toLowerCase();
            tasks = tasks.filter(task => 
                task.title.toLowerCase().includes(searchTerm)
            );
        }
        
        // Apply sorting
        tasks = TaskManager.sortTasks(tasks, this.currentSort);
        
        // Clear current list
        this.elements.taskList.innerHTML = '';
        
        // Show empty state or tasks
        if (tasks.length === 0) {
            this.elements.emptyState.classList.add('show');
            this.elements.taskList.style.display = 'none';
        } else {
            this.elements.emptyState.classList.remove('show');
            this.elements.taskList.style.display = 'flex';
            
            // Render each task
            tasks.forEach(task => {
                const taskElement = this.createTaskElement(task);
                this.elements.taskList.appendChild(taskElement);
            });
        }
    },

    /**
     * Create DOM element for a single task
     * @param {Task} task - Task object
     * @returns {HTMLElement} Task DOM element
     */
    createTaskElement: function(task) {
        // Create main container
        const taskItem = document.createElement('div');
        taskItem.className = `task-item priority-${task.priority}`;
        taskItem.dataset.taskId = task.id;
        
        if (task.isComplete) {
            taskItem.classList.add('completed');
        }
        
        // Build inner HTML
        taskItem.innerHTML = `
            <div class="task-checkbox">
                <input 
                    type="checkbox" 
                    ${task.isComplete ? 'checked' : ''} 
                    aria-label="Mark task as complete"
                >
            </div>
            <div class="task-content">
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div class="task-meta">
                    ${this.createMetaItem(this.getPriorityEmoji(task.priority), this.capitalize(task.priority))}
                    ${this.createMetaItem(this.getCategoryEmoji(task.category), this.capitalize(task.category))}
                    ${task.dueDate ? this.createDueDateMeta(task) : ''}
                </div>
            </div>
            <div class="task-actions">
                <button class="task-action-btn edit-btn" aria-label="Edit task" title="Edit">
                    ✏️
                </button>
                <button class="task-action-btn delete-btn" aria-label="Delete task" title="Delete">
                    🗑️
                </button>
            </div>
        `;
        
        return taskItem;
    },

    /**
     * Create a meta item HTML string
     */
    createMetaItem: function(emoji, text) {
        return `<span class="task-meta-item">${emoji} ${text}</span>`;
    },

    /**
     * Create due date meta item with overdue checking
     */
    createDueDateMeta: function(task) {
        const isOverdue = task.isOverdue();
        const formattedDate = this.formatDate(task.dueDate);
        const className = isOverdue ? 'task-meta-item overdue' : 'task-meta-item';
        
        return `<span class="${className}">📅 ${formattedDate}${isOverdue ? ' (Overdue)' : ''}</span>`;
    },

    /**
     * Render statistics
     */
    renderStats: function() {
        const stats = TaskManager.getStats();
        
        this.elements.totalTasks.textContent = stats.total;
        this.elements.completedTasks.textContent = stats.completed;
        this.elements.pendingTasks.textContent = stats.pending;
        this.elements.overdueTasks.textContent = stats.overdue;
    },

    /**
     * Handle form submission for new task
     * @param {Event} e - Submit event
     */
    handleFormSubmit: function(e) {
        e.preventDefault();
        
        // Get form values
        const title = this.elements.taskTitle.value.trim();
        const priority = this.elements.taskPriority.value;
        const dueDate = this.elements.taskDueDate.value || null;
        const category = this.elements.taskCategory.value;
        
        // Validate
        if (!title) {
            this.showToast('Please enter a task title', 'error');
            this.elements.taskTitle.focus();
            return;
        }
        
        // Create task
        const newTask = TaskManager.addTask({
            title,
            priority,
            dueDate,
            category
        });
        
        // Reset form
        this.elements.taskForm.reset();
        this.elements.taskPriority.value = 'medium';
        this.elements.taskTitle.focus();
        
        // Re-render
        this.render();
        
        // Show success message
        this.showToast('Task added successfully!', 'success');
    },

    /**
     * Handle search input
     * @param {Event} e - Input event
     */
    handleSearch: function(e) {
        this.currentSearch = e.target.value.trim();
        this.renderTasks();
    },

    /**
     * Handle filter button click
     * @param {Event} e - Click event
     */
    handleFilter: function(e) {
        const filterBtn = e.target;
        const filter = filterBtn.dataset.filter;
        
        // Update active state
        this.elements.filterButtons.forEach(btn => btn.classList.remove('active'));
        filterBtn.classList.add('active');
        
        // Update current filter and re-render
        this.currentFilter = filter;
        this.renderTasks();
    },

    /**
     * Handle sort selection change
     * @param {Event} e - Change event
     */
    handleSort: function(e) {
        this.currentSort = e.target.value;
        this.renderTasks();
    },

    /**
     * Handle task action buttons (edit, delete) using event delegation
     * @param {Event} e - Click event
     */
    handleTaskAction: function(e) {
        const target = e.target;
        const taskItem = target.closest('.task-item');
        
        if (!taskItem) return;
        
        const taskId = taskItem.dataset.taskId;
        
        // Edit button clicked
        if (target.closest('.edit-btn')) {
            this.openEditModal(taskId);
        }
        
        // Delete button clicked
        if (target.closest('.delete-btn')) {
            this.handleDeleteTask(taskId, taskItem);
        }
    },

    /**
     * Handle task checkbox change
     * @param {Event} e - Change event
     */
    handleTaskCheckbox: function(e) {
        if (e.target.type !== 'checkbox') return;
        
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = taskItem.dataset.taskId;
        const task = TaskManager.toggleTaskComplete(taskId);
        
        if (task) {
            // Add/remove completed class with animation
            taskItem.classList.toggle('completed', task.isComplete);
            
            // Update stats
            this.renderStats();
            
            // Show toast
            const message = task.isComplete ? 'Task completed! 🎉' : 'Task marked as pending';
            this.showToast(message, 'success');
            
            // If filtering by status, re-render after a short delay
            if (this.currentFilter !== 'all') {
                setTimeout(() => this.renderTasks(), 300);
            }
        }
    },

    /**
     * Handle task deletion
     * @param {string} taskId - Task ID to delete
     * @param {HTMLElement} taskElement - DOM element to remove
     */
    handleDeleteTask: function(taskId, taskElement) {
        // Confirm deletion
        if (!confirm('Are you sure you want to delete this task?')) {
            return;
        }
        
        // Add remove animation
        taskElement.style.transform = 'translateX(100%)';
        taskElement.style.opacity = '0';
        
        // Delete after animation
        setTimeout(() => {
            const deleted = TaskManager.deleteTask(taskId);
            
            if (deleted) {
                this.render();
                this.showToast('Task deleted', 'success');
            }
        }, 250);
    },

    /**
     * Handle clear completed button
     */
    handleClearCompleted: function() {
        const completedCount = TaskManager.getStats().completed;
        
        if (completedCount === 0) {
            this.showToast('No completed tasks to clear', 'error');
            return;
        }
        
        if (!confirm(`Delete ${completedCount} completed task(s)?`)) {
            return;
        }
        
        const deleted = TaskManager.clearCompleted();
        this.render();
        this.showToast(`${deleted} task(s) cleared`, 'success');
    },

    /**
     * Handle clear all button
     */
    handleClearAll: function() {
        const totalCount = TaskManager.getStats().total;
        
        if (totalCount === 0) {
            this.showToast('No tasks to clear', 'error');
            return;
        }
        
        if (!confirm(`Delete ALL ${totalCount} task(s)? This cannot be undone!`)) {
            return;
        }
        
        const deleted = TaskManager.clearAll();
        this.render();
        this.showToast(`All ${deleted} task(s) deleted`, 'success');
    },

    /**
     * Open edit modal for a task
     * @param {string} taskId - Task ID to edit
     */
    openEditModal: function(taskId) {
        const task = TaskManager.getTaskById(taskId);
        
        if (!task) {
            this.showToast('Task not found', 'error');
            return;
        }
        
        // Store editing task ID
        this.editingTaskId = taskId;
        
        // Populate form fields
        this.elements.editTaskId.value = task.id;
        this.elements.editTaskTitle.value = task.title;
        this.elements.editTaskPriority.value = task.priority;
        this.elements.editTaskDueDate.value = task.dueDate || '';
        this.elements.editTaskCategory.value = task.category;
        
        // Show modal
        this.elements.editModal.classList.add('show');
        
        // Focus title input
        setTimeout(() => this.elements.editTaskTitle.focus(), 100);
    },

    /**
     * Close edit modal
     */
    closeModal: function() {
        this.elements.editModal.classList.remove('show');
        this.editingTaskId = null;
        this.elements.editForm.reset();
    },

    /**
     * Handle edit form submission
     * @param {Event} e - Submit event
     */
    handleEditSubmit: function(e) {
        e.preventDefault();
        
        const taskId = this.editingTaskId;
        
        if (!taskId) {
            this.showToast('No task selected for editing', 'error');
            return;
        }
        
        // Get form values
        const title = this.elements.editTaskTitle.value.trim();
        const priority = this.elements.editTaskPriority.value;
        const dueDate = this.elements.editTaskDueDate.value || null;
        const category = this.elements.editTaskCategory.value;
        
        // Validate
        if (!title) {
            this.showToast('Please enter a task title', 'error');
            this.elements.editTaskTitle.focus();
            return;
        }
        
        // Update task
        const updated = TaskManager.updateTask(taskId, {
            title,
            priority,
            dueDate,
            category
        });
        
        if (updated) {
            this.closeModal();
            this.render();
            this.showToast('Task updated successfully!', 'success');
        } else {
            this.showToast('Failed to update task', 'error');
        }
    },

    /**
     * Handle keyboard shortcuts
     * @param {KeyboardEvent} e - Keyboard event
     */
    handleKeyboard: function(e) {
        // Escape key closes modal
        if (e.key === 'Escape' && this.elements.editModal.classList.contains('show')) {
            this.closeModal();
        }
        
        // Ctrl/Cmd + Enter submits form if focused
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (document.activeElement === this.elements.taskTitle) {
                this.elements.taskForm.dispatchEvent(new Event('submit'));
            }
        }
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - Type: 'success' or 'error'
     */
    showToast: function(message, type = 'success') {
        const toast = this.elements.toast;
        const toastMessage = this.elements.toastMessage;
        
        // Set message and type
        toastMessage.textContent = message;
        toast.className = 'toast';
        toast.classList.add(type);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Hide after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    },

    // ==========================================
    // UTILITY FUNCTIONS
    // ==========================================

    /**
     * Escape HTML to prevent XSS
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Capitalize first letter of string
     * @param {string} str - String to capitalize
     * @returns {string} Capitalized string
     */
    capitalize: function(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    },

    /**
     * Format date for display
     * @param {string} dateString - ISO date string
     * @returns {string} Formatted date
     */
    formatDate: function(dateString) {
        const date = new Date(dateString);
        const options = { month: 'short', day: 'numeric', year: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    },

    /**
     * Get emoji for priority level
     * @param {string} priority - Priority level
     * @returns {string} Emoji
     */
    getPriorityEmoji: function(priority) {
        const emojis = {
            low: '🟢',
            medium: '🟡',
            high: '🔴'
        };
        return emojis[priority] || '⚪';
    },

    /**
     * Get emoji for category
     * @param {string} category - Category name
     * @returns {string} Emoji
     */
    getCategoryEmoji: function(category) {
        const emojis = {
            personal: '👤',
            work: '💼',
            study: '📚',
            health: '🏃',
            other: '📌'
        };
        return emojis[category] || '📌';
    },

    /**
     * Debounce function for search input
     * @param {Function} func - Function to debounce
     * @param {number} wait - Wait time in milliseconds
     * @returns {Function} Debounced function
     */
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// ==========================================
// INITIALIZE APPLICATION
// ==========================================

// Wait for DOM to be fully loaded before initializing
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});