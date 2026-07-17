from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


class FontConfig(BaseModel):
    size: float
    weight: float
    opsz: float
    tracking: float
    leading: float
    xheight: float

    @field_validator("weight")
    @classmethod
    def valid_weight(cls, value: float) -> float:
        if not 100 <= value <= 900:
            raise ValueError("weight must be 100–900")
        return value

    @field_validator("opsz")
    @classmethod
    def valid_opsz(cls, value: float) -> float:
        if not 14 <= value <= 32:
            raise ValueError("opsz must be 14–32")
        return value

    @field_validator("xheight")
    @classmethod
    def valid_xheight(cls, value: float) -> float:
        if not 82 <= value <= 122:
            raise ValueError("xheight must be 82–122")
        return value


class SessionCreate(BaseModel):
    viewport: dict = Field(default_factory=dict)
    browser_family: str | None = Field(default=None, max_length=40)
    variable_font_supported: bool | None = None


class TuningEventIn(BaseModel):
    role: Literal["display", "body"]
    control: Literal["size", "weight", "opsz", "tracking", "leading", "xheight"]
    value: float
    elapsed_ms: int = Field(ge=0)


class SurveyState(BaseModel):
    display: FontConfig
    body: FontConfig
    display_text: str = Field(max_length=1000)
    body_text: str = Field(max_length=10000)
    display_rating: int = Field(ge=1, le=7)
    body_rating: int = Field(ge=1, le=7)
    likes: str = Field(default="", max_length=10000)
    dislikes: str = Field(default="", max_length=10000)
    overall_rating: int = Field(default=4, ge=1, le=7)
    feelings: str = Field(default="", max_length=10000)


class DraftUpdate(BaseModel):
    revision: int = Field(ge=0)
    current_step: int = Field(ge=1, le=5)
    state: SurveyState
    events: list[TuningEventIn] = Field(default_factory=list, max_length=500)


class SubmitRequest(BaseModel):
    revision: int = Field(ge=0)
    state: SurveyState
    events: list[TuningEventIn] = Field(default_factory=list, max_length=500)


class ExperimentCreate(BaseModel):
    display_defaults: FontConfig
    body_defaults: FontConfig
    display_sample: str = Field(min_length=1, max_length=1000)
    body_sample: str = Field(min_length=1, max_length=10000)


class AdminLogin(BaseModel):
    pin: str
