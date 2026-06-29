const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const taskRoutes = require('./routes/taskRoutes');
const { notFound, errorHandler } = require('./middleware/errorMiddleware');

const app = express();

const configuredOrigins = (process.env.CLIENT_URL || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const defaultOrigins = [
  /^https:\/\/.+\.vercel\.app$/i,
  /^http:\/\/localhost:\d+$/i,
  /^http:\/\/127\.0\.0\.1:\d+$/i
];

const allowedOrigins = [...configuredOrigins, ...defaultOrigins];

function isAllowedOrigin(origin) {
  return allowedOrigins.some((allowedOrigin) => {
    if (allowedOrigin instanceof RegExp) {
      return allowedOrigin.test(origin);
    }

    return allowedOrigin === origin;
  });
}

const corsOptions = {
  origin(origin, callback) {
    if (!origin || isAllowedOrigin(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`Origin ${origin} is not allowed by CORS`));
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(helmet());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(morgan('dev'));
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
}));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/tasks', taskRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;