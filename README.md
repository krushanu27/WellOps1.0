# WellOps1.0

AI-powered employee wellness and burnout analytics platform built using FastAPI, React, PostgreSQL, and Machine Learning.

---

## Overview

WellOps is an enterprise-focused wellness analytics platform designed to help organizations monitor employee well-being ethically through survey-driven insights and predictive analytics.

The platform provides role-based dashboards, burnout risk prediction, survey management, analytics reporting, and ML-powered insights while maintaining privacy-aware workflows and non-invasive data collection practices.

---

## Key Features

### Authentication & Authorization
- JWT-based authentication
- Role-Based Access Control (RBAC)
- Admin, Manager, and Employee workflows

### Survey Management
- Create and manage surveys
- Survey versioning support
- Employee survey submissions
- Team-based survey access

### Analytics Dashboard
- Burnout prediction trends
- Team and organizational insights
- Risk distribution analytics
- Survey response analytics

### AI/ML Integration
- ML-powered burnout risk prediction
- Productivity prediction workflows
- Separate FastAPI ML microservice
- Real-time prediction APIs

### Ethical & Privacy-Focused Design
- Survey-based wellness tracking
- Non-invasive employee monitoring
- Privacy-aware analytics workflows
- Aggregated reporting approach

---

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- React Query
- Recharts

### Backend
- FastAPI
- SQLAlchemy
- PostgreSQL
- Alembic
- JWT Authentication

### Machine Learning
- Python
- Scikit-learn
- Pickle Models
- FastAPI ML Service

### DevOps & Tooling
- Docker
- GitHub
- VS Code

---

## System Architecture

```text
Frontend (React + Vite)
        ↓
Backend API (FastAPI)
        ↓
PostgreSQL Database
        ↓
ML Prediction Service (FastAPI)
```

---

## Project Structure

```text
WellOps1.0/
│
├── backend/               # FastAPI backend
├── ml-service/            # ML prediction microservice
├── wellops-frontend/      # React frontend
├── diagrams/              # Public architecture/assets
├── docker-compose.yml
└── README.md
```

---

## Installation

### Clone Repository

```bash
git clone https://github.com/krushanu27/WellOps1.0.git
cd WellOps1.0
```

---

## Backend Setup

### Create Virtual Environment

```bash
cd backend
python -m venv .venv
```

### Activate Environment

#### Windows

```bash
.venv\Scripts\activate
```

#### Linux/Mac

```bash
source .venv/bin/activate
```

### Install Dependencies

```bash
pip install -r requirements.txt
```

### Run Backend

```bash
uvicorn app.main:app --reload
```

Backend runs on:

```text
http://127.0.0.1:8000
```

Swagger Docs:

```text
http://127.0.0.1:8000/docs
```

---

## Frontend Setup

```bash
cd wellops-frontend
npm install
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

## ML Service Setup

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8001
```

ML Service runs on:

```text
http://127.0.0.1:8001
```

---

## Docker Setup

Run the complete stack using Docker:

```bash
docker-compose up --build
```

---

## API Features

### Authentication
- Login
- JWT Token Validation
- Role Authorization

### Surveys
- Create Surveys
- Publish Surveys
- Submit Responses
- View Survey Analytics

### Analytics
- Burnout Predictions
- Prediction Trends
- Dashboard Metrics
- Organizational Insights

---

## Future Enhancements

- Advanced ML models
- Real-time analytics
- Notification system
- AI-generated wellness recommendations
- Cloud deployment support
- Mobile application support

---

## Contributors

### Krushanu Bhatt
Project Developer

---

## License

This project is developed for educational and research purposes.