from __future__ import annotations

from typing import Optional, Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator, model_validator


UserRole = Literal["ADMIN", "MANAGER", "EMPLOYEE"]


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole
    team_id: Optional[UUID] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value

    @model_validator(mode="after")
    def validate_role_team(self):
        if self.role == "ADMIN" and self.team_id is not None:
            raise ValueError("ADMIN user cannot be assigned to a team")
        return self


class UserUpdateRequest(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role: Optional[UserRole] = None
    team_id: Optional[UUID] = None

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return value
        value = value.strip()
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters long")
        return value


class UserResponse(BaseModel):
    id: UUID
    email: EmailStr
    role: str
    team_id: Optional[UUID] = None

    model_config = {"from_attributes": True}