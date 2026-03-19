from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import (
    Survey,
    SurveyVersion,
    SurveyQuestion,
    SurveySubmission,
    SurveyAnswer,
)
from app.database.session import get_db
from app.audit.models import AuditLog
from app.users.models import User
from app.surveys.schemas import (
    SubmissionCreate,
    SubmissionWithPredictionOut,
    SurveyCreate,
    SurveyUpdate,
    SurveyOut,
)
from app.surveys.prediction_service import (
    build_ml_payload,
    call_ml_prediction,
    create_prediction_audit_log,
)

router = APIRouter(prefix="/surveys", tags=["surveys"])


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SurveyOut)
def create_survey(
    body: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized to create surveys")

    survey = Survey(
        title=body.title,
        description=body.description,
        status="DRAFT",
        created_by_user_id=current_user.id,
    )
    db.add(survey)
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="CREATE_SURVEY",
            endpoint="/surveys",
            status_code=201,
            meta={
                "survey_title": body.title,
            },
        )
    )
    db.commit()
    db.refresh(survey)

    return survey


@router.get("", status_code=status.HTTP_200_OK)
def list_surveys(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    surveys = db.execute(
        select(Survey).order_by(Survey.created_at.desc())
    ).scalars().all()

    return [
        {
            "id": str(s.id),
            "title": s.title,
            "description": s.description,
            "status": s.status,
            "created_by_user_id": str(s.created_by_user_id),
            "created_at": s.created_at,
            "updated_at": s.updated_at,
        }
        for s in surveys
    ]


@router.get("/{survey_id}", status_code=status.HTTP_200_OK, response_model=SurveyOut)
def get_survey(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    return survey


@router.put("/{survey_id}", status_code=status.HTTP_200_OK, response_model=SurveyOut)
def update_survey(
    survey_id: UUID,
    body: SurveyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized to update surveys")

    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    survey.title = body.title
    survey.description = body.description

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="UPDATE_SURVEY",
            endpoint=f"/surveys/{survey_id}",
            status_code=200,
            meta={
                "survey_id": str(survey.id),
                "survey_title": survey.title,
            },
        )
    )

    db.commit()
    db.refresh(survey)
    return survey


@router.delete("/{survey_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_survey(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized to delete surveys")

    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DELETE_SURVEY",
            endpoint=f"/surveys/{survey_id}",
            status_code=204,
            meta={
                "survey_id": str(survey.id),
                "survey_title": survey.title,
            },
        )
    )

    db.delete(survey)
    db.commit()
    return None


@router.get("/{survey_id}/versions/{version_id}/questions")
def get_questions(
    survey_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = db.get(SurveyVersion, version_id)
    if not version or str(version.survey_id) != str(survey_id):
        raise HTTPException(404, "Version not found")

    questions = db.execute(
        select(SurveyQuestion)
        .where(SurveyQuestion.version_id == version_id)
        .order_by(SurveyQuestion.display_order)
    ).scalars().all()

    return [
        {
            "id": str(q.id),
            "question_key": q.question_key,
            "prompt": q.prompt,
            "type": q.type,
            "scale_min": q.scale_min,
            "scale_max": q.scale_max,
            "options": q.options,
            "required": q.required,
            "display_order": q.display_order,
        }
        for q in questions
    ]


@router.post(
    "/{survey_id}/versions/{version_id}/submit",
    status_code=201,
    response_model=SubmissionWithPredictionOut,
)
def submit_survey(
    survey_id: UUID,
    version_id: UUID,
    body: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role != "EMPLOYEE":
        raise HTTPException(403, "Only employees can submit surveys")

    version = db.get(SurveyVersion, version_id)
    if not version or str(version.survey_id) != str(survey_id):
        raise HTTPException(404, "Version not found")
    if version.status != "PUBLISHED":
        raise HTTPException(400, "Survey version is not published")

    existing = db.execute(
        select(SurveySubmission).where(
            SurveySubmission.version_id == version_id,
            SurveySubmission.user_id == current_user.id,
        )
    ).scalars().first()
    if existing:
        raise HTTPException(409, "You have already submitted this survey")

    if not current_user.team_id:
        raise HTTPException(400, "You must be assigned to a team before submitting")

    ml_payload = build_ml_payload(db, body.answers)

    submission = SurveySubmission(
        id=uuid.uuid4(),
        version_id=version_id,
        user_id=current_user.id,
        team_id=current_user.team_id,
    )
    db.add(submission)
    db.flush()

    for answer in body.answers:
        db.add(
            SurveyAnswer(
                id=uuid.uuid4(),
                submission_id=submission.id,
                question_id=answer.question_id,
                value=answer.value,
            )
        )

    prediction = call_ml_prediction(ml_payload)

    db.add(
        create_prediction_audit_log(
            user_id=current_user.id,
            team_id=current_user.team_id,
            prediction=prediction,
        )
    )

    db.commit()
    db.refresh(submission)

    return {
        "id": submission.id,
        "version_id": submission.version_id,
        "user_id": submission.user_id,
        "team_id": submission.team_id,
        "submitted_at": submission.submitted_at,
        "prediction": prediction,
    }