from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.database.models import Survey, SurveyVersion, SurveyQuestion, SurveySubmission, SurveyAnswer
from app.database.session import get_db
from app.audit.models import AuditLog
from app.users.models import User
from app.surveys.schemas import SubmissionCreate

router = APIRouter(prefix="/surveys", tags=["surveys"])


@router.post("", status_code=status.HTTP_201_CREATED)
def create_survey(
    title: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized to create surveys")

    survey = Survey(
        title=title,
        status="DRAFT",
        created_by_user_id=current_user.id,
    )
    db.add(survey)
    db.add(
        AuditLog(
            actor_user_id=current_user.id,
            actor_role=current_user.role,
            action="CREATE_SURVEY",
            endpoint="/surveys",
        )
    )
    db.commit()
    db.refresh(survey)

    return {
        "id": str(survey.id),
        "title": survey.title,
        "description": survey.description,
        "status": survey.status,
        "created_by_user_id": str(survey.created_by_user_id),
        "created_at": survey.created_at,
        "updated_at": survey.updated_at,
    }


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


@router.get("/{survey_id}", status_code=status.HTTP_200_OK)
def get_survey(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")

    return {
        "id": str(survey.id),
        "title": survey.title,
        "description": survey.description,
        "status": survey.status,
        "created_by_user_id": str(survey.created_by_user_id),
        "created_at": survey.created_at,
        "updated_at": survey.updated_at,
    }


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


@router.post("/{survey_id}/versions/{version_id}/submit", status_code=201)
def submit_survey(
    survey_id: UUID,
    version_id: UUID,
    body: SubmissionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
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

    submission = SurveySubmission(
        id=uuid.uuid4(),
        version_id=version_id,
        user_id=current_user.id,
        team_id=current_user.team_id,
    )
    db.add(submission)
    db.flush()

    for answer in body.answers:
        db.add(SurveyAnswer(
            id=uuid.uuid4(),
            submission_id=submission.id,
            question_id=answer.question_id,
            value=answer.value,
        ))

    db.commit()
    db.refresh(submission)

    return {
        "id": str(submission.id),
        "version_id": str(submission.version_id),
        "user_id": str(submission.user_id),
        "team_id": str(submission.team_id),
        "submitted_at": submission.submitted_at,
    }