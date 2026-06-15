from sqlalchemy import Column, String, Float, DateTime, Enum, ForeignKey, Integer, Boolean, Index
from database import Base
import enum
from models.utils import _utcnow, new_uuid

class JobType(str, enum.Enum):
    COLORIZE = "COLORIZE"
    VIDEO_COLORIZE = "VIDEO_COLORIZE"
    RESTORE = "RESTORE"
    UPSCALE = "UPSCALE"
    BG_REMOVE = "BG_REMOVE"
    DEBLUR = "DEBLUR"
    RESTORE_DAMAGE = "RESTORE_DAMAGE"
    INPAINT = "INPAINT"

class JobStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, default=new_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False, index=True)
    input_path = Column(String, nullable=False)
    output_path = Column(String, nullable=True)
    processing_time = Column(Float, nullable=True)
    error_message = Column(String, nullable=True)
    device = Column(String, default="cpu", nullable=True)
    render_factor = Column(Integer, default=35, nullable=True)
    progress = Column(Integer, default=0, nullable=True)
    is_favorite = Column(Boolean, default=False, nullable=False)
    collection = Column(String, nullable=True)
    created_at = Column(DateTime, default=_utcnow, nullable=False)

    # Composite index for the most common query pattern: user's jobs ordered by date
    __table_args__ = (
        Index("ix_jobs_user_created", "user_id", "created_at"),
    )

