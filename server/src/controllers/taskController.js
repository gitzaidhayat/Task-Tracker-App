const Task = require('../models/Task');

const allowedStatuses = ['todo', 'in-progress', 'done'];
const allowedPriorities = ['low', 'medium', 'high'];
const allowedSortFields = ['createdAt', 'dueDate', 'title', 'priority', 'status'];

function buildTaskPayload(body) {
  return {
    title: typeof body.title === 'string' ? body.title.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    status: allowedStatuses.includes(body.status) ? body.status : undefined,
    priority: allowedPriorities.includes(body.priority) ? body.priority : undefined,
    dueDate: body.dueDate ? new Date(body.dueDate) : null,
    completed: Boolean(body.completed)
  };
}

function validateTaskInput(payload, isUpdate = false) {
  const errors = {};

  if (!isUpdate || Object.prototype.hasOwnProperty.call(payload, 'title')) {
    if (!payload.title) {
      errors.title = 'Title is required';
    } else if (payload.title.length < 3) {
      errors.title = 'Title must be at least 3 characters';
    } else if (payload.title.length > 100) {
      errors.title = 'Title must be at most 100 characters';
    }
  }

  if (payload.description && payload.description.length > 500) {
    errors.description = 'Description must be at most 500 characters';
  }

  if (payload.status && !allowedStatuses.includes(payload.status)) {
    errors.status = 'Invalid status';
  }

  if (payload.priority && !allowedPriorities.includes(payload.priority)) {
    errors.priority = 'Invalid priority';
  }

  if (payload.dueDate && Number.isNaN(payload.dueDate.getTime())) {
    errors.dueDate = 'Invalid due date';
  }

  return errors;
}

function parseSort(sortBy, sortOrder) {
  const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
  const order = sortOrder === 'asc' ? 1 : -1;
  return { [field]: order };
}

exports.getTasks = async (req, res, next) => {
  try {
    const { status, priority, search, sortBy, sortOrder } = req.query;
    const filter = {};

    if (status && allowedStatuses.includes(status)) {
      filter.status = status;
    }

    if (priority && allowedPriorities.includes(priority)) {
      filter.priority = priority;
    }

    if (search && search.trim()) {
      filter.$or = [
        { title: { $regex: search.trim(), $options: 'i' } },
        { description: { $regex: search.trim(), $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filter).sort(parseSort(sortBy, sortOrder));

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
};

exports.getSummary = async (_req, res, next) => {
  try {
    const [total, todo, inProgress, done, overdue] = await Promise.all([
      Task.countDocuments(),
      Task.countDocuments({ status: 'todo' }),
      Task.countDocuments({ status: 'in-progress' }),
      Task.countDocuments({ status: 'done' }),
      Task.countDocuments({ dueDate: { $lt: new Date() }, completed: false })
    ]);

    res.json({ total, todo, inProgress, done, overdue });
  } catch (error) {
    next(error);
  }
};

exports.createTask = async (req, res, next) => {
  try {
    const payload = buildTaskPayload(req.body);
    const errors = validateTaskInput(payload);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const task = await Task.create(payload);
    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const payload = buildTaskPayload(req.body);
    const errors = validateTaskInput(payload, true);

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ message: 'Validation failed', errors });
    }

    const task = await Task.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ task });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findByIdAndDelete(req.params.id);

    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    res.json({ message: 'Task deleted' });
  } catch (error) {
    next(error);
  }
};