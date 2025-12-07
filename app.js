// Todo App - Main JavaScript

// State Management
let todos = [];
let currentFilter = 'all';
let currentSearch = '';
let currentCategoryFilter = null;

// DOM Elements
const todoForm = document.getElementById('todo-form');
const todoInput = document.getElementById('todo-input');
const categoryInput = document.getElementById('category-input');
const dueDateInput = document.getElementById('due-date-input');
const priorityInput = document.getElementById('priority-input');
const todosContainer = document.getElementById('todos-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const categoryFilters = document.getElementById('category-filters');
const statsTotal = document.getElementById('stats-total');
const statsCompleted = document.getElementById('stats-completed');
const clearCompletedBtn = document.getElementById('clear-completed');
const clearAllBtn = document.getElementById('clear-all');
const categorySuggestions = document.getElementById('category-suggestions');
const voiceBtn = document.getElementById('voice-btn');
const languageSelect = document.getElementById('language-select');
const voiceStatus = document.getElementById('voice-status');
const addHeaderBtn = document.getElementById('add-header-btn');
const addTodoSection = document.getElementById('add-todo-section');
const discardBtn = document.getElementById('discard-btn');

// Voice Recognition
let recognition = null;
let isListening = false;

// Initialize App
function init() {
    loadTodos();
    renderTodos();
    updateStats();
    updateCategoryFilters();
    attachEventListeners();
    initVoiceRecognition();
}

// Event Listeners
function attachEventListeners() {
    todoForm.addEventListener('submit', handleAddTodo);
    searchInput.addEventListener('input', handleSearch);
    filterBtns.forEach(btn => btn.addEventListener('click', handleFilterChange));
    clearCompletedBtn.addEventListener('click', handleClearCompleted);
    clearAllBtn.addEventListener('click', handleClearAll);
    voiceBtn.addEventListener('click', toggleVoiceRecognition);
    addHeaderBtn.addEventListener('click', toggleAddTodoSection);
    discardBtn.addEventListener('click', handleDiscardTodo);
}

// Toggle Add Todo Section
function toggleAddTodoSection() {
    addTodoSection.classList.toggle('hidden');
    if (!addTodoSection.classList.contains('hidden')) {
        todoInput.focus();
    }
}

// Handle Discard Todo
function handleDiscardTodo() {
    todoForm.reset();
    priorityInput.value = 'medium';
    addTodoSection.classList.add('hidden');
}

// Voice Recognition Setup
function initVoiceRecognition() {
    // Check if browser supports Web Speech API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
        voiceBtn.style.display = 'none';
        console.warn('Speech recognition not supported in this browser');
        return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    // Set initial language
    recognition.lang = languageSelect.value;

    // Update language when changed
    languageSelect.addEventListener('change', () => {
        recognition.lang = languageSelect.value;
        updateVoiceStatus('Language changed to ' + languageSelect.options[languageSelect.selectedIndex].text);
    });

    // Recognition event handlers
    recognition.onstart = () => {
        isListening = true;
        voiceBtn.classList.add('listening');
        updateVoiceStatus('Listening...', 'listening');
    };

    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        todoInput.value = transcript;
        updateVoiceStatus('✓ Recognized: ' + transcript, 'success');
        todoInput.focus();

        // Clear status after 3 seconds
        setTimeout(() => {
            updateVoiceStatus('');
        }, 3000);
    };

    recognition.onerror = (event) => {
        let errorMessage = 'Error occurred';

        switch (event.error) {
            case 'no-speech':
                errorMessage = 'No speech detected. Please try again.';
                break;
            case 'audio-capture':
                errorMessage = 'Microphone not found or not accessible.';
                break;
            case 'not-allowed':
                errorMessage = 'Microphone access denied. Please allow microphone access.';
                break;
            case 'network':
                errorMessage = 'Network error occurred.';
                break;
            default:
                errorMessage = 'Error: ' + event.error;
        }

        updateVoiceStatus(errorMessage, 'error');

        // Clear error after 5 seconds
        setTimeout(() => {
            updateVoiceStatus('');
        }, 5000);
    };

    recognition.onend = () => {
        isListening = false;
        voiceBtn.classList.remove('listening', 'processing');
    };
}

// Toggle Voice Recognition
function toggleVoiceRecognition() {
    if (!recognition) {
        updateVoiceStatus('Voice recognition not available', 'error');
        return;
    }

    if (isListening) {
        recognition.stop();
        updateVoiceStatus('Stopped listening');
    } else {
        try {
            recognition.start();
        } catch (error) {
            console.error('Recognition error:', error);
            updateVoiceStatus('Failed to start recognition', 'error');
        }
    }
}

// Update Voice Status
function updateVoiceStatus(message, className = '') {
    voiceStatus.textContent = message;
    voiceStatus.className = 'voice-status';
    if (className) {
        voiceStatus.classList.add(className);
    }
}

// Add Todo
function handleAddTodo(e) {
    e.preventDefault();

    const text = todoInput.value.trim();
    if (!text) return;

    const todo = {
        id: Date.now(),
        text: text,
        completed: false,
        category: categoryInput.value.trim() || null,
        dueDate: dueDateInput.value || null,
        priority: priorityInput.value,
        createdAt: new Date().toISOString()
    };

    todos.unshift(todo);
    saveTodos();
    renderTodos();
    updateStats();
    updateCategoryFilters();
    updateCategorySuggestions();

    // Reset form
    todoForm.reset();
    priorityInput.value = 'medium';

    // Hide the add todo section
    addTodoSection.classList.add('hidden');

    // Add animation
    const firstTodo = todosContainer.querySelector('.todo-item');
    if (firstTodo) {
        firstTodo.style.animation = 'none';
        setTimeout(() => {
            firstTodo.style.animation = '';
        }, 10);
    }
}

// Toggle Todo Completion
function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (todo) {
        todo.completed = !todo.completed;
        saveTodos();
        renderTodos();
        updateStats();
    }
}

// Delete Todo
function deleteTodo(id) {
    todos = todos.filter(t => t.id !== id);
    saveTodos();
    renderTodos();
    updateStats();
    updateCategoryFilters();
}

// Filter Todos
function getFilteredTodos() {
    let filtered = [...todos];

    // Apply completion filter
    if (currentFilter === 'active') {
        filtered = filtered.filter(t => !t.completed);
    } else if (currentFilter === 'completed') {
        filtered = filtered.filter(t => t.completed);
    }

    // Apply search filter
    if (currentSearch) {
        const search = currentSearch.toLowerCase();
        filtered = filtered.filter(t =>
            t.text.toLowerCase().includes(search) ||
            (t.category && t.category.toLowerCase().includes(search))
        );
    }

    // Apply category filter
    if (currentCategoryFilter) {
        filtered = filtered.filter(t => t.category === currentCategoryFilter);
    }

    return filtered;
}

// Render Todos
function renderTodos() {
    const filtered = getFilteredTodos();

    if (filtered.length === 0) {
        todosContainer.innerHTML = '';
        emptyState.classList.add('visible');
        return;
    }

    emptyState.classList.remove('visible');

    todosContainer.innerHTML = filtered.map(todo => {
        const isOverdue = todo.dueDate && new Date(todo.dueDate) < new Date() && !todo.completed;

        return `
            <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                <div class="todo-content">
                    <div class="todo-checkbox ${todo.completed ? 'checked' : ''}" onclick="toggleTodo(${todo.id})"></div>
                    <div class="todo-main">
                        <div class="todo-text">${escapeHtml(todo.text)}</div>
                        <div class="todo-meta">
                            ${todo.category ? `<span class="todo-category">${escapeHtml(todo.category)}</span>` : ''}
                            ${todo.dueDate ? `<span class="todo-due-date ${isOverdue ? 'overdue' : ''}">📅 ${formatDate(todo.dueDate)}</span>` : ''}
                            <span class="todo-priority ${todo.priority}"></span>
                        </div>
                    </div>
                    <div class="todo-actions">
                        <button class="btn-delete" onclick="deleteTodo(${todo.id})" title="Delete">🗑️</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// Handle Search
function handleSearch(e) {
    currentSearch = e.target.value.trim();
    renderTodos();
}

// Handle Filter Change
function handleFilterChange(e) {
    filterBtns.forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.dataset.filter;
    renderTodos();
}

// Handle Category Filter
function handleCategoryFilter(category) {
    if (currentCategoryFilter === category) {
        currentCategoryFilter = null;
    } else {
        currentCategoryFilter = category;
    }
    updateCategoryFilters();
    renderTodos();
}

// Update Category Filters
function updateCategoryFilters() {
    const categories = [...new Set(todos.map(t => t.category).filter(Boolean))];

    if (categories.length === 0) {
        categoryFilters.innerHTML = '';
        return;
    }

    categoryFilters.innerHTML = categories.map(cat => `
        <button class="category-filter ${currentCategoryFilter === cat ? 'active' : ''}" 
                onclick="handleCategoryFilter('${escapeHtml(cat)}')">
            🏷️ ${escapeHtml(cat)}
        </button>
    `).join('');
}

// Update Category Suggestions
function updateCategorySuggestions() {
    const categories = [...new Set(todos.map(t => t.category).filter(Boolean))];
    categorySuggestions.innerHTML = categories.map(cat =>
        `<option value="${escapeHtml(cat)}">`
    ).join('');
}

// Update Stats
function updateStats() {
    const total = todos.length;
    const completed = todos.filter(t => t.completed).length;

    statsTotal.textContent = `${total} task${total !== 1 ? 's' : ''}`;
    statsCompleted.textContent = `${completed} done`;
}

// Clear Completed
function handleClearCompleted() {
    if (todos.filter(t => t.completed).length === 0) return;

    if (confirm('Clear all completed tasks?')) {
        todos = todos.filter(t => !t.completed);
        saveTodos();
        renderTodos();
        updateStats();
        updateCategoryFilters();
    }
}

// Clear All
function handleClearAll() {
    if (todos.length === 0) return;

    if (confirm('Clear all tasks? This cannot be undone.')) {
        todos = [];
        saveTodos();
        renderTodos();
        updateStats();
        updateCategoryFilters();
    }
}

// Local Storage
function saveTodos() {
    localStorage.setItem('todos', JSON.stringify(todos));
}

function loadTodos() {
    const stored = localStorage.getItem('todos');
    if (stored) {
        try {
            todos = JSON.parse(stored);
        } catch (e) {
            console.error('Error loading todos:', e);
            todos = [];
        }
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Reset time for comparison
    today.setHours(0, 0, 0, 0);
    tomorrow.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    if (compareDate.getTime() === today.getTime()) {
        return 'Today';
    } else if (compareDate.getTime() === tomorrow.getTime()) {
        return 'Tomorrow';
    } else {
        const options = { month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
