import asyncio
import sys
from database import SessionLocal
from models import User, UserRole
from sqlalchemy import select

async def promote_to_admin(email):
    async with SessionLocal() as session:
        result = await session.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        
        if not user:
            print(f"Hata: '{email}' e-posta adresine sahip kullanıcı bulunamadı.")
            return
        
        user.role = UserRole.ADMIN
        await session.commit()
        print(f"Başarılı: {user.email} kullanıcısı ADMIN yetkisine yükseltildi.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Kullanım: python promote_user.py <email>")
    else:
        email = sys.argv[1]
        asyncio.run(promote_to_admin(email))
