import requests
from db import execute

BASE_URL = "http://localhost:8000/api"

# ── Wipe everything clean ──
from db import get_connection

with get_connection() as conn:
    with conn.cursor() as cursor:
        cursor.execute("SET FOREIGN_KEY_CHECKS = 0")
        cursor.execute("TRUNCATE TABLE attendance")
        cursor.execute("TRUNCATE TABLE sessions")
        cursor.execute("TRUNCATE TABLE memberships")
        cursor.execute("TRUNCATE TABLE membership_plans")
        cursor.execute("TRUNCATE TABLE users")
        cursor.execute("SET FOREIGN_KEY_CHECKS = 1")
        conn.commit()

print("Tables cleared — seeding fresh data...")
# ── Step 1: Users ──
users = [
    # Admin
    {"f_name": "Aryan", "l_name": "Bhat", "email": "aryan@profitness.com", "phone": "555-0001", "address": "100 Admin Blvd", "role": "admin"},
    # Trainers
    {"f_name": "Marcus", "l_name": "Chen", "email": "marcus@profitness.com", "phone": "555-0101", "address": "21 Fitness Ave", "role": "trainer"},
    {"f_name": "Sofia", "l_name": "Rodriguez", "email": "sofia@profitness.com", "phone": "555-0102", "address": "34 Strength St", "role": "trainer"},
    {"f_name": "James", "l_name": "Wright", "email": "james@profitness.com", "phone": "555-0103", "address": "56 Power Ln", "role": "trainer"},
    # Clients
    {"f_name": "Emily", "l_name": "Davis", "email": "emily@gmail.com", "phone": "555-0201", "address": "78 Oak Dr", "role": "client"},
    {"f_name": "Ryan", "l_name": "Patel", "email": "ryan@gmail.com", "phone": "555-0202", "address": "90 Maple Ct", "role": "client"},
    {"f_name": "Olivia", "l_name": "Kim", "email": "olivia@gmail.com", "phone": "555-0203", "address": "12 Pine Rd", "role": "client"},

    {"f_name": "Priya", "l_name": "Sharma", "email": "priya@gmail.com", "phone": "555-0205", "address": "67 Birch Ave", "role": "client"},
    {"f_name": "Tyler", "l_name": "Brooks", "email": "tyler@gmail.com", "phone": "555-0206", "address": "89 Walnut St", "role": "client"},
]

user_ids = []
for user in users:
    res = requests.post(f"{BASE_URL}/users", json=user)
    data = res.json()
    user_ids.append(data["id"])
    print(f"Created user: {user['f_name']} {user['l_name']} ({user['role']}) → ID {data['id']}")

#Readable references
admin_id = user_ids[0]
trainer_ids = user_ids[1:4]   # Marcus, Sofia, James
client_ids = user_ids[4:9]   # Emily, Ryan, Olivia, Priya, Tyler

print(f"\nTrainer IDs: {trainer_ids}")
print(f"Client IDs: {client_ids}\n")

# ── Step 2: Membership Plans ──
plans = [
    {"membership_name": "Monthly", "membership_session_limit": 12, "membership_duration": 30, "membership_price": 49},
    {"membership_name": "Quarterly", "membership_session_limit": 40, "membership_duration": 90, "membership_price": 179},
    {"membership_name": "Yearly", "membership_session_limit": None, "membership_duration": 365, "membership_price": 499},
]

plan_ids = []
for plan in plans:
    res = requests.post(f"{BASE_URL}/membership_plans", json=plan)
    data = res.json()
    plan_ids.append(data['id'])
    print(f"Created plan: {plan['membership_name']} (${plan['membership_price']}) → ID {data['id']}")

print()

# ── Step 3: Memberships ──
memberships = [
    {"client_id": client_ids[0], "plan_id": plan_ids[0], "start_date": "2026-02-01"},   # Emily → Monthly 
    {"client_id": client_ids[1], "plan_id": plan_ids[1], "start_date": "2026-01-15"},   # Ryan → Quarterly 
    {"client_id": client_ids[2], "plan_id": plan_ids[2], "start_date": "2026-01-01"},   # Olivia → Yearly 
    {"client_id": client_ids[3], "plan_id": plan_ids[0], "start_date": "2026-02-15"},   # Priya → Monthly 
    {"client_id": client_ids[4], "plan_id": plan_ids[2], "start_date": "2026-02-01"},   # Tyler → Yearly 
]

membership_ids = []
for m in memberships:
    res = requests.post(f"{BASE_URL}/memberships", json=m)
  
    data = res.json()
  
    membership_ids.append(data["id"])
    print(f"Created membership: client {m['client_id']} → plan {m['plan_id']} → ID {data['id']}")

print()

# ── Step 4: Sessions ──
sessions = [
    # Emily with Marcus
    {"client_id": client_ids[0], "trainer_id": trainer_ids[0], "membership_id": membership_ids[0], "scheduled_at": "2026-02-20 09:00:00", "duration_min": 60, "status": "completed", "notes": "Upper body strength training"},
    {"client_id": client_ids[0], "trainer_id": trainer_ids[0], "membership_id": membership_ids[0], "scheduled_at": "2026-02-22 09:00:00", "duration_min": 60, "status": "completed", "notes": "Lower body and core"},
    {"client_id": client_ids[0], "trainer_id": trainer_ids[0], "membership_id": membership_ids[0], "scheduled_at": "2026-02-27 09:00:00", "duration_min": 60, "status": "scheduled", "notes": "Cardio and flexibility"},
    # Ryan with Sofia
    {"client_id": client_ids[1], "trainer_id": trainer_ids[1], "membership_id": membership_ids[1], "scheduled_at": "2026-02-19 10:00:00", "duration_min": 45, "status": "completed", "notes": "HIIT session"},
    {"client_id": client_ids[1], "trainer_id": trainer_ids[1], "membership_id": membership_ids[1], "scheduled_at": "2026-02-21 10:00:00", "duration_min": 45, "status": "no_show", "notes": "Client did not show up"},
    {"client_id": client_ids[1], "trainer_id": trainer_ids[1], "membership_id": membership_ids[1], "scheduled_at": "2026-02-26 10:00:00", "duration_min": 45, "status": "scheduled", "notes": "Makeup HIIT session"},
    # Olivia with James
    {"client_id": client_ids[2], "trainer_id": trainer_ids[2], "membership_id": membership_ids[2], "scheduled_at": "2026-02-18 14:00:00", "duration_min": 60, "status": "completed", "notes": "Yoga and stretching"},
    {"client_id": client_ids[2], "trainer_id": trainer_ids[2], "membership_id": membership_ids[2], "scheduled_at": "2026-02-25 14:00:00", "duration_min": 60, "status": "scheduled", "notes": "Advanced yoga flow"},
    
    {"client_id": client_ids[4], "trainer_id": trainer_ids[1], "membership_id": membership_ids[3], "scheduled_at": "2026-02-21 16:00:00", "duration_min": 30, "status": "completed", "notes": "Quick cardio blast"},
    {"client_id": client_ids[4], "trainer_id": trainer_ids[1], "membership_id": membership_ids[3], "scheduled_at": "2026-02-26 16:00:00", "duration_min": 30, "status": "scheduled", "notes": "Endurance training"},
    # Tyler with James
    {"client_id": client_ids[4], "trainer_id": trainer_ids[2], "membership_id": membership_ids[4], "scheduled_at": "2026-02-19 08:00:00", "duration_min": 60, "status": "completed", "notes": "Full body workout"},
    {"client_id": client_ids[4], "trainer_id": trainer_ids[2], "membership_id": membership_ids[4], "scheduled_at": "2026-02-24 08:00:00", "duration_min": 60, "status": "cancelled", "notes": "Trainer sick — rescheduled"},
    {"client_id": client_ids[4], "trainer_id": trainer_ids[2], "membership_id": membership_ids[4], "scheduled_at": "2026-02-27 08:00:00", "duration_min": 60, "status": "scheduled", "notes": "Rescheduled full body workout"},
]

session_ids = []
for s in sessions:
    res = requests.post(f"{BASE_URL}/sessions", json=s)
    data = res.json()
    print(data)
    session_ids.append(data["id"])
    print(f"Created session: client {s['client_id']} + trainer {s['trainer_id']} on {s['scheduled_at']} → ID {data['id']}")

print()

# ── Step 5: Attendance (for completed sessions only) ──
completed_sessions = [
    # Session 1: Emily + Marcus (completed)
    (session_ids[0], client_ids[0], "client", "2026-02-20 08:55:00", "present"),
    (session_ids[0], trainer_ids[0], "trainer", "2026-02-20 08:50:00", "present"),
    # Session 2: Emily + Marcus (completed)
    (session_ids[1], client_ids[0], "client", "2026-02-22 09:05:00", "late"),
    (session_ids[1], trainer_ids[0], "trainer", "2026-02-22 08:55:00", "present"),
    # Session 4: Ryan + Sofia (completed)
    (session_ids[3], client_ids[1], "client", "2026-02-19 09:58:00", "present"),
    (session_ids[3], trainer_ids[1], "trainer", "2026-02-19 09:50:00", "present"),
    # Session 5: Ryan + Sofia (no_show)
    (session_ids[4], client_ids[1], "client", None, "absent"),
    (session_ids[4], trainer_ids[1], "trainer", "2026-02-21 09:55:00", "present"),
    # Session 7: Olivia + James (completed)
    (session_ids[6], client_ids[2], "client", "2026-02-18 13:55:00", "present"),
    (session_ids[6], trainer_ids[2], "trainer", "2026-02-18 13:50:00", "present"),

    # Session 11: Priya + Sofia (completed)
    (session_ids[10], client_ids[4], "client", "2026-02-21 15:57:00", "present"),
    (session_ids[10], trainer_ids[1], "trainer", "2026-02-21 15:50:00", "present"),
    # Session 13: Tyler + James (completed)
    (session_ids[12], client_ids[4], "client", "2026-02-19 07:55:00", "present"),
    (session_ids[12], trainer_ids[2], "trainer", "2026-02-19 07:50:00", "present"),
]

for s_id, u_id, role, check_in, status in completed_sessions:
    payload = {
        "session_id": s_id,
        "user_id": u_id,
        "role": role,
        "check_in": check_in,
        "status": status,
    }
    res = requests.post(f"{BASE_URL}/attendance", json=payload)
    data = res.json()
    print(f"Attendance: session {s_id}, user {u_id} ({role}) → {status}")

print("\nSeeding complete!")
print(f"   Users: {len(users)}")
print(f"   Plans: {len(plans)}")
print(f"   Memberships: {len(memberships)}")
print(f"   Sessions: {len(sessions)}")
print(f"   Attendance records: {len(completed_sessions)}")