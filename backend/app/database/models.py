# app/surveys/models.py
import enum
import uuid
from datetime import datetime,timezone
def utcnow():
    return datetime.now(timezone.utc)

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.models import utcnow
from app.database.session import Base


class SurveyStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    ARCHIVED = "ARCHIVED"


class SurveyVersionStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class QuestionType(str, enum.Enum):
    SCALE = "SCALE"
    SINGLE_CHOICE = "SINGLE_CHOICE"
    MULTI_CHOICE = "MULTI_CHOICE"
    TEXT = "TEXT"


class Survey(Base):
    __tablename__ = "surveys"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    status: Mapped[str] = mapped_column(
        Enum(SurveyStatus, name="survey_status"),
        nullable=False,
        default=SurveyStatus.DRAFT,
    )

    created_by_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    versions = relationship("SurveyVersion", back_populates="survey", cascade="all, delete-orphan")


class SurveyVersion(Base):
    __tablename__ = "survey_versions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    survey_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("surveys.id", ondelete="CASCADE"),
        nullable=False,
    )

    version_number: Mapped[int] = mapped_column(Integer, nullable=False)

    status: Mapped[str] = mapped_column(
        Enum(SurveyVersionStatus, name="survey_version_status"),
        nullable=False,
        default=SurveyVersionStatus.DRAFT,
    )

    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    survey = relationship("Survey", back_populates="versions")
    questions = relationship("SurveyQuestion", back_populates="version", cascade="all, delete-orphan")
    submissions = relationship("SurveySubmission", back_populates="version", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("survey_id", "version_number", name="uq_survey_versions_survey_id_version_number"),
    )


class SurveyQuestion(Base):
    __tablename__ = "survey_questions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("survey_versions.id", ondelete="CASCADE"),
        nullable=False,
    )

    question_key: Mapped[str] = mapped_column(String(100), nullable=False)
    prompt: Mapped[str] = mapped_column(Text, nullable=False)

    type: Mapped[str] = mapped_column(Enum(QuestionType, name="survey_question_type"), nullable=False)

    options: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    scale_min: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scale_max: Mapped[int | None] = mapped_column(Integer, nullable=True)

    required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    display_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    version = relationship("SurveyVersion", back_populates="questions")
    answers = relationship("SurveyAnswer", back_populates="question", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("version_id", "question_key", name="uq_survey_questions_version_id_question_key"),
        CheckConstraint("display_order >= 0", name="ck_survey_questions_display_order_nonnegative"),
    )



class SurveySubmission(Base):
    __tablename__ = "survey_submissions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    version_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("survey_versions.id", ondelete="CASCADE"),
        nullable=False,
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )

    team_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("teams.id", ondelete="RESTRICT"),
        nullable=False,
    )

    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

    version = relationship("SurveyVersion", back_populates="submissions")
    answers = relationship("SurveyAnswer", back_populates="submission", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("version_id", "user_id", name="uq_survey_submissions_version_id_user_id"),
    )


class SurveyAnswer(Base):
    __tablename__ = "survey_answers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)

    submission_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("survey_submissions.id", ondelete="CASCADE"),
        nullable=False,
    )

    question_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("survey_questions.id", ondelete="CASCADE"),
        nullable=False,
    )

    value: Mapped[dict] = mapped_column(JSONB, nullable=False)

    submission = relationship("SurveySubmission", back_populates="answers")
    question = relationship("SurveyQuestion", back_populates="answers")

    __table_args__ = (
        UniqueConstraint("submission_id", "question_id", name="uq_survey_answers_submission_id_question_id"),
    )
