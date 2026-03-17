# ThinkLoop

A modern, full-stack productivity dashboard app with notes, Pomodoro timer, checklist, OCR, and more.

## Project Structure

```
ThinkLoop/
├── client/            # React + TypeScript (Create React App)
│   ├── src/
│   └── package.json
├── server/            # Express + TypeScript API server (MongoDB)
│   ├── src/
│   └── package.json
└── README.md
```

## Current Features

- Rich text note editor
- Pomodoro timer with custom durations
- Checklist and task management
- Pinned notes and quick access widgets
- Weather widget (city configurable)
- OCR (image-to-text) support via Tesseract.js
- User authentication (MongoDB)
- Responsive, modern UI
- Multiple Themes
- Undo/redo for notes and titles
- Storage limiting

## Getting Started

### Backend

```bash
cd server
npm install
npm run build
npm start
```

### Frontend

```bash
cd client
npm install
npm start
```

## Deployment (Render)

- Deploy both `client` and `server` as separate web services on [Render](https://render.com/).
- Set environment variables such as `MONGODB_URI` in the Render dashboard for the server.
- The free Render plan will automatically spin down your server after 15 minutes of inactivity, causing “cold starts” when accessed.

## Limitations of Free Plan

- **Cold starts:** The server may take a minute to wake up after inactivity.
- **Resource limits:** Free MongoDB and Render plans have storage and connection limits.

## Tech Stack

- **Frontend:** React, TypeScript, Create React App, rehype-highlight, Tesseract.js, CSS Modules
- **Backend:** Node.js, Express, TypeScript, MongoDB, bcrypt, dotenv
- **Deployment:** Render.com (free plan)
- **Other:** Weather API, OCR (Tesseract.js)

## Features Coming Soon

- Real-time collaboration
- Calendar integration
- Code Formatting using rehype-highlight
- More "Home" widgets
- AI summarizing and writing tools
- More themes and customization
