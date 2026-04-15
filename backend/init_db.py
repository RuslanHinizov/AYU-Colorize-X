"""
Database initialization script
Creates tables and adds an admin user.
Admin credentials are read from .env (ADMIN_EMAIL, ADMIN_PASSWORD).
"""
import asyncio
import os
from database import engine, Base, SessionLocal
from models import User, UserRole
from services.auth_service import get_password_hash
from sqlalchemy import select
from config import settings

async def init_db():
    """Initialize database with tables and admin user"""
    # Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    print("[OK] Database tables created")

    # Get admin credentials from environment/config
    admin_email = settings.ADMIN_EMAIL or os.getenv("ADMIN_EMAIL", "")
    admin_password = settings.ADMIN_PASSWORD or os.getenv("ADMIN_PASSWORD", "")

    if not admin_email or not admin_password:
        print("[!] ADMIN_EMAIL and ADMIN_PASSWORD not set in .env - skipping admin user creation")
        print("  Set these in your .env file and run again to create an admin user")
        return

    if len(admin_password) < 8:
        print("[!] ADMIN_PASSWORD must be at least 8 characters - skipping admin user creation")
        return

    # Create admin user if not exists
    async with SessionLocal() as db:
        result = await db.execute(select(User).where(User.email == admin_email))
        admin_user = result.scalar_one_or_none()

        if not admin_user:
            admin_user = User(
                email=admin_email,
                password_hash=get_password_hash(admin_password),
                role=UserRole.ADMIN,
                credits=999999,
                is_active=True
            )
            db.add(admin_user)
            await db.commit()
            print(f"[OK] Admin user created (email: {admin_email})")
        else:
            print("[OK] Admin user already exists")

if __name__ == "__main__":
    asyncio.run(init_db())
    print("\n[DONE] Database initialization complete!")
