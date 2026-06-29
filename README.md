# Task Tracker MERN App

Task Tracker is a full-stack MERN application for creating, viewing, updating, deleting, filtering, and sorting tasks. It includes form validation, REST APIs, MongoDB persistence, responsive UI, and dynamic updates without page refresh.

## Tech Stack

- Frontend: React + Vite
- Backend: Node.js + Express
- Database: MongoDB + Mongoose

## Features

- CRUD for tasks
- Form validation on client and server
- Search, filter, and sort tasks
- Task summary metrics
- Responsive, card-based UI
- Toast notifications for user actions

## Project Structure

- `client/` React frontend
- `server/` Express API

## Local Setup

1. Install dependencies:
   `npm install`
2. Copy `.env.example` to `.env` and update values.
3. Start the app:
   `npm run dev`

The frontend runs on `http://localhost:5173` and the API runs on `http://localhost:4000`.

## Deployment

This repository is prepared for a split deployment:

- Deploy the API from `server/` to Render or a similar Node host.
- Deploy the React app from `client/` to Vercel or Netlify.
- Set `VITE_API_URL` in the frontend deployment to the public API URL.
- Set `CLIENT_URL` in the backend deployment to one or more comma-separated frontend origins if you want to lock CORS down further. Localhost and `*.vercel.app` origins are allowed automatically.

## API

- `GET /api/tasks`
- `GET /api/tasks/summary`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
