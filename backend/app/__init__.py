from fastapi import FastAPI

app = FastAPI(title="WellOps API")

@app.get("/health")
def health():
    return {"status": "ok"}
