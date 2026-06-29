import { useEffect, useMemo, useRef, useState } from 'react';
import {
  createTask,
  deleteTask,
  getTaskSummary,
  getTasks,
  updateTask
} from './api';

const defaultForm = {
  title: '',
  description: '',
  status: 'todo',
  priority: 'medium',
  dueDate: '',
  completed: false
};

const defaultFilters = {
  search: '',
  status: '',
  priority: '',
  sortBy: 'createdAt',
  sortOrder: 'desc'
};

function formatDate(value) {
  if (!value) {
    return 'No due date';
  }

  return new Date(value).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function getStatusLabel(status) {
  return {
    todo: 'To do',
    'in-progress': 'In progress',
    done: 'Done'
  }[status] || status;
}

function getPriorityLabel(priority) {
  return {
    low: 'Low',
    medium: 'Medium',
    high: 'High'
  }[priority] || priority;
}

function App() {
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, todo: 0, inProgress: 0, done: 0, overdue: 0 });
  const [filters, setFilters] = useState(defaultFilters);
  const [form, setForm] = useState(defaultForm);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);
  const [errors, setErrors] = useState({});
  const hasLoadedOnce = useRef(false);

  const isEditing = Boolean(editingTaskId);

  const visibleCount = useMemo(() => tasks.length, [tasks]);

  function pushNotification(message, tone = 'success') {
    setNotification({ message, tone });
    window.clearTimeout(pushNotification.timer);
    pushNotification.timer = window.setTimeout(() => setNotification(null), 3000);
  }

  async function loadTasks(currentFilters = filters) {
    setLoading(true);
    try {
      const [taskData, summaryData] = await Promise.all([
        getTasks(currentFilters),
        getTaskSummary()
      ]);
      setTasks(taskData.tasks);
      setSummary(summaryData);
    } catch (error) {
      pushNotification(error.message, 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTasks();
  }, []);

  useEffect(() => {
    if (!hasLoadedOnce.current) {
      hasLoadedOnce.current = true;
      return;
    }

    const timer = window.setTimeout(() => {
      loadTasks(filters);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [filters]);

  function handleFilterChange(field, value) {
    setFilters((previous) => ({ ...previous, [field]: value }));
  }

  function clearFilters() {
    setFilters(defaultFilters);
  }

  function editTask(task) {
    setEditingTaskId(task._id);
    setForm({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      completed: task.completed
    });
    setErrors({});
  }

  function cancelEdit() {
    setEditingTaskId(null);
    setForm(defaultForm);
    setErrors({});
  }

  function validateForm(nextForm) {
    const nextErrors = {};
    if (!nextForm.title.trim()) {
      nextErrors.title = 'Title is required';
    } else if (nextForm.title.trim().length < 3) {
      nextErrors.title = 'Title must be at least 3 characters';
    }

    if (nextForm.description.length > 500) {
      nextErrors.description = 'Description must be 500 characters or less';
    }

    return nextErrors;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        dueDate: form.dueDate || null
      };

      if (isEditing) {
        await updateTask(editingTaskId, payload);
        pushNotification('Task updated successfully');
      } else {
        await createTask(payload);
        pushNotification('Task created successfully');
      }

      cancelEdit();
      await loadTasks(filters);
    } catch (error) {
      const serverErrors = error.details || {};
      setErrors(serverErrors);
      pushNotification(error.message, 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this task?')) {
      return;
    }

    try {
      await deleteTask(id);
      pushNotification('Task deleted');
      if (editingTaskId === id) {
        cancelEdit();
      }
      await loadTasks(filters);
    } catch (error) {
      pushNotification(error.message, 'error');
    }
  }

  return (
    <div className="shell">
      <div className="backdrop backdrop-one" />
      <div className="backdrop backdrop-two" />

      <main className="app">
        <section className="hero">
          <div>
            <p className="eyebrow">MERN Task Tracker</p>
            <h1>Track work with a fast, focused task board.</h1>
            <p className="hero-copy">
              Create, prioritize, filter, and manage tasks with live API updates backed by MongoDB.
            </p>
          </div>
          <div className="summary-grid">
            <SummaryCard label="Total" value={summary.total} />
            <SummaryCard label="To do" value={summary.todo} />
            <SummaryCard label="In progress" value={summary.inProgress} />
            <SummaryCard label="Done" value={summary.done} />
            <SummaryCard label="Overdue" value={summary.overdue} accent />
          </div>
        </section>

        <section className="toolbar card">
          <div className="toolbar-head">
            <div>
              <h2>Task controls</h2>
              <p>{visibleCount} task{visibleCount === 1 ? '' : 's'} visible</p>
            </div>
            <button className="ghost-button" type="button" onClick={clearFilters}>Reset filters</button>
          </div>

          <div className="filters">
            <label>
              <span>Search</span>
              <input
                value={filters.search}
                onChange={(event) => handleFilterChange('search', event.target.value)}
                placeholder="Search title or description"
              />
            </label>

            <label>
              <span>Status</span>
              <select value={filters.status} onChange={(event) => handleFilterChange('status', event.target.value)}>
                <option value="">All</option>
                <option value="todo">To do</option>
                <option value="in-progress">In progress</option>
                <option value="done">Done</option>
              </select>
            </label>

            <label>
              <span>Priority</span>
              <select value={filters.priority} onChange={(event) => handleFilterChange('priority', event.target.value)}>
                <option value="">All</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>

            <label>
              <span>Sort by</span>
              <select value={filters.sortBy} onChange={(event) => handleFilterChange('sortBy', event.target.value)}>
                <option value="createdAt">Newest</option>
                <option value="dueDate">Due date</option>
                <option value="title">Title</option>
                <option value="priority">Priority</option>
                <option value="status">Status</option>
              </select>
            </label>

            <label>
              <span>Order</span>
              <select value={filters.sortOrder} onChange={(event) => handleFilterChange('sortOrder', event.target.value)}>
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </label>
          </div>
        </section>

        <section className="content-grid">
          <form className="card form-card" onSubmit={handleSubmit}>
            <div className="form-header">
              <div>
                <p className="eyebrow">{isEditing ? 'Edit task' : 'New task'}</p>
                <h2>{isEditing ? 'Update your task' : 'Create a task'}</h2>
              </div>
              {isEditing ? (
                <button className="ghost-button" type="button" onClick={cancelEdit}>Cancel</button>
              ) : null}
            </div>

            <div className="field-grid">
              <label className="field full">
                <span>Title</span>
                <input
                  value={form.title}
                  onChange={(event) => setForm((previous) => ({ ...previous, title: event.target.value }))}
                  placeholder="Plan release review"
                />
                {errors.title ? <small className="error-text">{errors.title}</small> : null}
              </label>

              <label className="field full">
                <span>Description</span>
                <textarea
                  value={form.description}
                  onChange={(event) => setForm((previous) => ({ ...previous, description: event.target.value }))}
                  placeholder="Add supporting context, links, and notes"
                  rows="4"
                />
                {errors.description ? <small className="error-text">{errors.description}</small> : null}
              </label>

              <label className="field">
                <span>Status</span>
                <select
                  value={form.status}
                  onChange={(event) => setForm((previous) => ({ ...previous, status: event.target.value }))}
                >
                  <option value="todo">To do</option>
                  <option value="in-progress">In progress</option>
                  <option value="done">Done</option>
                </select>
              </label>

              <label className="field">
                <span>Priority</span>
                <select
                  value={form.priority}
                  onChange={(event) => setForm((previous) => ({ ...previous, priority: event.target.value }))}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label className="field">
                <span>Due date</span>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(event) => setForm((previous) => ({ ...previous, dueDate: event.target.value }))}
                />
              </label>

              <label className="checkbox-row full">
                <input
                  type="checkbox"
                  checked={form.completed}
                  onChange={(event) => setForm((previous) => ({ ...previous, completed: event.target.checked }))}
                />
                <span>Mark as completed</span>
              </label>
            </div>

            <button className="primary-button" type="submit" disabled={submitting}>
              {submitting ? 'Saving...' : isEditing ? 'Update task' : 'Create task'}
            </button>
          </form>

          <section className="card list-card">
            <div className="list-head">
              <div>
                <p className="eyebrow">Live board</p>
                <h2>Tasks</h2>
              </div>
              <p>Updates happen instantly without a page refresh.</p>
            </div>

            {loading ? <p className="state-message">Loading tasks...</p> : null}

            {!loading && tasks.length === 0 ? (
              <div className="empty-state">
                <h3>No tasks match the current filters.</h3>
                <p>Create a new task or reset the filters to continue.</p>
              </div>
            ) : null}

            <div className="task-list">
              {tasks.map((task) => (
                <article key={task._id} className="task-card">
                  <div className="task-top">
                    <div>
                      <div className="task-title-row">
                        <h3>{task.title}</h3>
                        {task.completed ? <span className="pill completed">Completed</span> : null}
                      </div>
                      <p className="task-description">{task.description || 'No description provided.'}</p>
                    </div>
                    <div className="task-actions">
                      <button className="secondary-button" type="button" onClick={() => editTask(task)}>Edit</button>
                      <button className="danger-button" type="button" onClick={() => handleDelete(task._id)}>Delete</button>
                    </div>
                  </div>

                  <div className="task-meta">
                    <span className={`pill status-${task.status}`}>{getStatusLabel(task.status)}</span>
                    <span className={`pill priority-${task.priority}`}>{getPriorityLabel(task.priority)}</span>
                    <span className="task-date">Due {formatDate(task.dueDate)}</span>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </section>
      </main>

      {notification ? <Toast message={notification.message} tone={notification.tone} /> : null}
    </div>
  );
}

function SummaryCard({ label, value, accent = false }) {
  return (
    <div className={`summary-card ${accent ? 'accent' : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Toast({ message, tone }) {
  return <div className={`toast ${tone}`}>{message}</div>;
}

export default App;