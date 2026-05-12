from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
from typing import Any
from uuid import UUID
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.auth.deps import get_current_user
from app.audit.models import AuditLog
from app.database.models import (
    Survey,
    SurveyAnswer,
    SurveyQuestion,
    SurveySubmission,
    SurveyVersion,
)
from app.database.session import get_db
from app.surveys.prediction_service import (
    build_ml_payload,
    call_ml_prediction,
    create_prediction_audit_log,
)
from app.services.email import send_email
from app.surveys.schemas import (
    QuestionCreate,
    SubmissionCreate,
    SubmissionWithPredictionOut,
    SurveyCreate,
    SurveyOut,
    SurveyUpdate,
)
from app.users.models import User

router = APIRouter(prefix="/surveys", tags=["surveys"])
logger = logging.getLogger(__name__)


class QuestionUpdate(BaseModel):
    question_key: str = Field(min_length=1, max_length=100)
    prompt: str = Field(min_length=1)
    type: str
    options: dict[str, Any] | None = None
    scale_min: int | None = None
    scale_max: int | None = None
    required: bool = True
    display_order: int = Field(default=0, ge=0)


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def require_manager_or_admin(current_user: User) -> None:
    if current_user.role not in {"MANAGER", "ADMIN"}:
        raise HTTPException(status_code=403, detail="Not authorized")


def get_survey_or_404(db: Session, survey_id: UUID) -> Survey:
    survey = db.get(Survey, survey_id)
    if not survey:
        raise HTTPException(status_code=404, detail="Survey not found")
    return survey


def get_version_or_404(db: Session, survey_id: UUID, version_id: UUID) -> SurveyVersion:
    version = db.get(SurveyVersion, version_id)
    if not version or version.survey_id != survey_id:
        raise HTTPException(status_code=404, detail="Version not found")
    return version


def get_question_or_404(
    db: Session, version_id: UUID, question_id: UUID
) -> SurveyQuestion:
    question = db.get(SurveyQuestion, question_id)
    if not question or question.version_id != version_id:
        raise HTTPException(status_code=404, detail="Question not found")
    return question


def get_latest_draft_version(db: Session, survey_id: UUID) -> SurveyVersion | None:
    return (
        db.execute(
            select(SurveyVersion)
            .where(
                SurveyVersion.survey_id == survey_id,
                SurveyVersion.status == "DRAFT",
            )
            .order_by(desc(SurveyVersion.version_number), desc(SurveyVersion.created_at))
        )
        .scalars()
        .first()
    )


def get_latest_published_version(db: Session, survey_id: UUID) -> SurveyVersion | None:
    return (
        db.execute(
            select(SurveyVersion)
            .where(
                SurveyVersion.survey_id == survey_id,
                SurveyVersion.status == "PUBLISHED",
            )
            .order_by(desc(SurveyVersion.version_number), desc(SurveyVersion.created_at))
        )
        .scalars()
        .first()
    )


def get_latest_version(db: Session, survey_id: UUID) -> SurveyVersion | None:
    return (
        db.execute(
            select(SurveyVersion)
            .where(SurveyVersion.survey_id == survey_id)
            .order_by(desc(SurveyVersion.version_number), desc(SurveyVersion.created_at))
        )
        .scalars()
        .first()
    )


def get_next_version_number(db: Session, survey_id: UUID) -> int:
    latest = get_latest_version(db, survey_id)
    return 1 if not latest else latest.version_number + 1


def ensure_draft_version(version: SurveyVersion) -> None:
    if version.status != "DRAFT":
        raise HTTPException(
            status_code=400,
            detail="Only draft versions can be modified",
        )


def serialize_version(version: SurveyVersion) -> dict[str, Any]:
    return {
        "id": str(version.id),
        "survey_id": str(version.survey_id),
        "version_number": version.version_number,
        "status": version.status,
        "published_at": version.published_at,
        "created_at": version.created_at,
    }


def serialize_question(question: SurveyQuestion) -> dict[str, Any]:
    return {
        "id": str(question.id),
        "version_id": str(question.version_id),
        "question_key": question.question_key,
        "prompt": question.prompt,
        "type": question.type,
        "scale_min": question.scale_min,
        "scale_max": question.scale_max,
        "options": question.options,
        "required": question.required,
        "display_order": question.display_order,
    }


def clone_questions(
    db: Session, source_version_id: UUID, target_version_id: UUID
) -> None:
    source_questions = (
        db.execute(
            select(SurveyQuestion)
            .where(SurveyQuestion.version_id == source_version_id)
            .order_by(SurveyQuestion.display_order, SurveyQuestion.question_key)
        )
        .scalars()
        .all()
    )

    for q in source_questions:
        db.add(
            SurveyQuestion(
                id=uuid.uuid4(),
                version_id=target_version_id,
                question_key=q.question_key,
                prompt=q.prompt,
                type=q.type,
                options=q.options,
                scale_min=q.scale_min,
                scale_max=q.scale_max,
                required=q.required,
                display_order=q.display_order,
            )
        )


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SurveyOut)
def create_survey(
    body: SurveyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    survey = Survey(
        title=body.title,
        description=body.description,
        survey_type=body.survey_type,
        status="DRAFT",
        created_by_user_id=current_user.id,
    )
    db.add(survey)
    db.flush()

    draft_version = SurveyVersion(
        id=uuid.uuid4(),
        survey_id=survey.id,
        version_number=1,
        status="DRAFT",
    )
    db.add(draft_version)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="CREATE_SURVEY",
            endpoint="/surveys",
            status_code=201,
            meta={
                "survey_id": str(survey.id),
                "survey_title": body.title,
                "draft_version_id": str(draft_version.id),
                "survey_type": body.survey_type,
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

    results: list[dict[str, Any]] = []

    for survey in surveys:
        latest_draft = get_latest_draft_version(db, survey.id)
        latest_published = get_latest_published_version(db, survey.id)

        derived_status = survey.status
        if latest_draft:
            derived_status = "DRAFT"
        elif latest_published:
            derived_status = "PUBLISHED"

        item: dict[str, Any] = {
            "id": str(survey.id),
            "title": survey.title,
            "description": survey.description,
            "status": derived_status,
            "survey_type": survey.survey_type,
            "created_by_user_id": str(survey.created_by_user_id),
            "created_at": survey.created_at,
            "updated_at": survey.updated_at,
            "latest_version_id": str(latest_published.id) if latest_published else None,
            "latest_version_number": latest_published.version_number if latest_published else None,
            "last_submitted_version_number": None,
            "has_submitted_latest": False,
            "new_version_available": False,
        }

        if current_user.role == "EMPLOYEE" and latest_published:
            last_submission = (
                db.execute(
                    select(SurveySubmission, SurveyVersion)
                    .join(
                        SurveyVersion,
                        SurveySubmission.version_id == SurveyVersion.id,
                    )
                    .where(
                        SurveySubmission.user_id == current_user.id,
                        SurveyVersion.survey_id == survey.id,
                    )
                    .order_by(
                        desc(SurveyVersion.version_number),
                        desc(SurveySubmission.submitted_at),
                    )
                )
                .first()
            )

            if last_submission:
                submission, submitted_version = last_submission
                item["last_submitted_version_number"] = submitted_version.version_number
                item["has_submitted_latest"] = (
                    submitted_version.version_number == latest_published.version_number
                )
                item["new_version_available"] = (
                    submitted_version.version_number < latest_published.version_number
                )

        results.append(item)

    return results


@router.get("/{survey_id}", status_code=status.HTTP_200_OK, response_model=SurveyOut)
def get_survey(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    survey = get_survey_or_404(db, survey_id)
    return survey


@router.get("/{survey_id}/active-version", status_code=status.HTTP_200_OK)
def get_active_survey_version(
    survey_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    get_survey_or_404(db, survey_id)

    if current_user.role in {"MANAGER", "ADMIN"}:
        version = get_latest_draft_version(db, survey_id) or get_latest_published_version(
            db, survey_id
        )
    else:
        version = get_latest_published_version(db, survey_id)

    if not version:
        raise HTTPException(status_code=404, detail="No survey version found")

    return serialize_version(version)


@router.put("/{survey_id}", status_code=status.HTTP_200_OK, response_model=SurveyOut)
def update_survey(
    survey_id: UUID,
    body: SurveyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    survey = get_survey_or_404(db, survey_id)
    survey.title = body.title
    survey.description = body.description

    if body.survey_type is not None:
        survey.survey_type = body.survey_type

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="UPDATE_SURVEY",
            endpoint=f"/surveys/{survey_id}",
            status_code=200,
            meta={
                "survey_id": str(survey.id),
                "survey_title": survey.title,
                "survey_type": survey.survey_type,
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
    require_manager_or_admin(current_user)

    survey = get_survey_or_404(db, survey_id)

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


@router.post("/{survey_id}/versions/{version_id}/duplicate-to-draft", status_code=201)
def duplicate_published_version_to_draft(
    survey_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    get_survey_or_404(db, survey_id)
    version = get_version_or_404(db, survey_id, version_id)

    if version.status != "PUBLISHED":
        raise HTTPException(
            status_code=400,
            detail="Only published versions can be duplicated",
        )

    existing_draft = get_latest_draft_version(db, survey_id)
    if existing_draft:
        raise HTTPException(
            status_code=400,
            detail="A draft version already exists for this survey",
        )

    new_version = SurveyVersion(
        id=uuid.uuid4(),
        survey_id=survey_id,
        version_number=get_next_version_number(db, survey_id),
        status="DRAFT",
    )
    db.add(new_version)
    db.flush()

    clone_questions(db, version.id, new_version.id)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DUPLICATE_SURVEY_VERSION_TO_DRAFT",
            endpoint=f"/surveys/{survey_id}/versions/{version_id}/duplicate-to-draft",
            status_code=201,
            meta={
                "survey_id": str(survey_id),
                "source_version_id": str(version.id),
                "new_version_id": str(new_version.id),
                "new_version_number": new_version.version_number,
            },
        )
    )

    db.commit()
    db.refresh(new_version)
    return serialize_version(new_version)


@router.post("/{survey_id}/versions/{version_id}/publish", status_code=200)
def publish_survey_version(
    survey_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    version = get_version_or_404(db, survey_id, version_id)
    ensure_draft_version(version)

    has_questions = (
        db.execute(
            select(SurveyQuestion.id).where(SurveyQuestion.version_id == version.id)
        )
        .first()
        is not None
    )
    if not has_questions:
        raise HTTPException(
            status_code=400,
            detail="Cannot publish a survey version without questions",
        )

    version.status = "PUBLISHED"
    version.published_at = utcnow()

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="PUBLISH_SURVEY_VERSION",
            endpoint=f"/surveys/{survey_id}/versions/{version_id}/publish",
            status_code=200,
            meta={
                "survey_id": str(survey_id),
                "version_id": str(version.id),
                "version_number": version.version_number,
            },
        )
    )

    db.commit()
    db.refresh(version)
    return serialize_version(version)


@router.get("/{survey_id}/versions/{version_id}/questions", status_code=status.HTTP_200_OK)
def get_questions(
    survey_id: UUID,
    version_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    version = get_version_or_404(db, survey_id, version_id)

    if current_user.role == "EMPLOYEE" and version.status != "PUBLISHED":
        raise HTTPException(status_code=403, detail="Employees can only view published versions")

    questions = (
        db.execute(
            select(SurveyQuestion)
            .where(SurveyQuestion.version_id == version_id)
            .order_by(SurveyQuestion.display_order, SurveyQuestion.question_key)
        )
        .scalars()
        .all()
    )

    return [serialize_question(q) for q in questions]


@router.post("/{survey_id}/versions/{version_id}/questions", status_code=201)
def create_question(
    survey_id: UUID,
    version_id: UUID,
    body: QuestionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    version = get_version_or_404(db, survey_id, version_id)
    ensure_draft_version(version)

    question = SurveyQuestion(
        id=uuid.uuid4(),
        version_id=version.id,
        question_key=body.question_key,
        prompt=body.prompt,
        type=body.type,
        options=body.options,
        scale_min=body.scale_min,
        scale_max=body.scale_max,
        required=body.required,
        display_order=body.display_order,
    )
    db.add(question)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="CREATE_SURVEY_QUESTION",
            endpoint=f"/surveys/{survey_id}/versions/{version_id}/questions",
            status_code=201,
            meta={
                "survey_id": str(survey_id),
                "version_id": str(version_id),
                "question_key": body.question_key,
            },
        )
    )

    db.commit()
    db.refresh(question)
    return serialize_question(question)


@router.put("/{survey_id}/versions/{version_id}/questions/{question_id}", status_code=200)
def update_question(
    survey_id: UUID,
    version_id: UUID,
    question_id: UUID,
    body: QuestionUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    version = get_version_or_404(db, survey_id, version_id)
    ensure_draft_version(version)

    question = get_question_or_404(db, version.id, question_id)

    question.question_key = body.question_key
    question.prompt = body.prompt
    question.type = body.type
    question.options = body.options
    question.scale_min = body.scale_min
    question.scale_max = body.scale_max
    question.required = body.required
    question.display_order = body.display_order

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="UPDATE_SURVEY_QUESTION",
            endpoint=f"/surveys/{survey_id}/versions/{version_id}/questions/{question_id}",
            status_code=200,
            meta={
                "survey_id": str(survey_id),
                "version_id": str(version_id),
                "question_id": str(question_id),
            },
        )
    )

    db.commit()
    db.refresh(question)
    return serialize_question(question)


@router.delete(
    "/{survey_id}/versions/{version_id}/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_question(
    survey_id: UUID,
    version_id: UUID,
    question_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    require_manager_or_admin(current_user)

    version = get_version_or_404(db, survey_id, version_id)
    ensure_draft_version(version)

    question = get_question_or_404(db, version.id, question_id)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="DELETE_SURVEY_QUESTION",
            endpoint=f"/surveys/{survey_id}/versions/{version_id}/questions/{question_id}",
            status_code=204,
            meta={
                "survey_id": str(survey_id),
                "version_id": str(version_id),
                "question_id": str(question_id),
                "question_key": question.question_key,
            },
        )
    )

    db.delete(question)
    db.commit()
    return None


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
        raise HTTPException(status_code=403, detail="Only employees can submit surveys")

    version = get_version_or_404(db, survey_id, version_id)
    if version.status != "PUBLISHED":
        raise HTTPException(status_code=400, detail="Survey version is not published")

    existing = (
        db.execute(
            select(SurveySubmission).where(
                SurveySubmission.version_id == version_id,
                SurveySubmission.user_id == current_user.id,
            )
        )
        .scalars()
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="You have already submitted this survey")

    if not current_user.team_id:
        raise HTTPException(
            status_code=400,
            detail="You must be assigned to a team before submitting",
        )

    survey = get_survey_or_404(db, survey_id)

    submission = SurveySubmission(
        id=uuid.uuid4(),
        version_id=version_id,
        user_id=current_user.id,
        team_id=current_user.team_id,
    )
    db.add(submission)
    db.flush()

    question_lookup = {
        question.id: question
        for question in db.execute(
            select(SurveyQuestion).where(SurveyQuestion.version_id == version_id)
        )
        .scalars()
        .all()
    }

    for answer in body.answers:
        db.add(
            SurveyAnswer(
                id=uuid.uuid4(),
                submission_id=submission.id,
                question_id=answer.question_id,
                value=answer.value,
            )
        )

    prediction = None

    if survey.survey_type == "PREDICTION":
        ml_payload = build_ml_payload(db, body.answers)

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

    survey_report_lines = [
        f"Survey submission receipt",
        "",
        f"Survey: {survey.title}",
        f"Survey Type: {survey.survey_type}",
        f"Version: {version.version_number}",
        f"Submitted At (UTC): {submission.submitted_at.isoformat()}",
        "",
        "Responses:",
    ]
    for idx, answer in enumerate(body.answers, start=1):
        question = question_lookup.get(answer.question_id)
        prompt = question.prompt if question else str(answer.question_id)
        survey_report_lines.append(f"{idx}. {prompt}")
        survey_report_lines.append(json.dumps(answer.value, indent=2, default=str))
        survey_report_lines.append("")

    if prediction is not None:
        survey_report_lines.append("Prediction Result:")
        survey_report_lines.append(json.dumps(prediction, indent=2, default=str))
        survey_report_lines.append("")

    email_subject = f"Survey Submission Receipt - {survey.title}"
    email_body = "\n".join(survey_report_lines)
    try:
        send_email(
            to_email=current_user.email,
            subject=email_subject,
            body=email_body,
        )
    except Exception:
        logger.exception(
            "Failed to send survey receipt email",
            extra={
                "survey_id": str(survey_id),
                "version_id": str(version_id),
                "submission_id": str(submission.id),
                "user_id": str(current_user.id),
            },
        )

    return {
        "id": submission.id,
        "version_id": submission.version_id,
        "user_id": submission.user_id,
        "team_id": submission.team_id,
        "submitted_at": submission.submitted_at,
        "prediction": prediction,
    }