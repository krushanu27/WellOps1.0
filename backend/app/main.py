from fastapi.middleware.cors import CORSMiddleware
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.database.session import get_db

from app.auth.routes import router as auth_router
from app.users.routes import router as users_router
from app.users.teams_routes import router as teams_router
from app.surveys.routes import router as surveys_router
from app.analytics.routes import router as analytics_router
from app.rbac_test.routes import router as rbac_test_router
from app.analytics.routes import router as analytics_router 



app = FastAPI(title="WellOps API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(teams_router)
app.include_router(surveys_router)
app.include_router(analytics_router)
app.include_router(rbac_test_router)
app.include_router(analytics_router)


@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/health/db")
def health_db(db: Session = Depends(get_db)):
    db.execute(text("SELECT 1"))
    return {"status": "ok", "db": "connected"}

@app.get("/")
def root():
    return {"status": "ok", "service": "WellOps1 backend"}