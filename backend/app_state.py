"""
Shared application state - avoids circular imports between main.py and routers/admin.py
"""

app_settings = {
    "maintenance_mode": False,
    "announcement": None,
    "max_concurrent_jobs": 5
}
