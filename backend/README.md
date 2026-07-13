# SAMS Backend — Smart Attendance Management System

Complete Node.js + Express + MongoDB backend for the SAMS frontend.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js |
| Framework | Express.js |
| Database | MongoDB (Mongoose) |
| Auth | JWT (jsonwebtoken) |
| Password | bcryptjs |
| File Upload | Multer |
| Validation | express-validator |
| Mail | Nodemailer |
| Security | helmet, cors, compression |

---

## Project Structure

```
backend/
├── seed.js                    ← Run once to seed default accounts
├── .env                       ← Environment variables (fill this in)
└── src/
    ├── server.js              ← Entry point
    ├── app.js                 ← Express setup + route mounting
    ├── config/
    │   ├── db.js              ← MongoDB connection
    │   └── mail.js            ← Nodemailer transporter
    ├── controllers/
    │   ├── authController.js
    │   ├── adminController.js
    │   ├── attendanceController.js
    │   ├── sessionController.js
    │   ├── subjectController.js
    │   ├── assignmentController.js
    │   ├── faceController.js
    │   ├── dashboardController.js
    │   ├── reportController.js
    │   └── profileController.js
    ├── models/
    │   ├── User.js
    │   ├── Subject.js
    │   ├── Assignment.js
    │   ├── Session.js
    │   ├── Attendance.js
    │   └── PasswordReset.js
    ├── routes/
    │   ├── authRoutes.js
    │   ├── adminRoutes.js
    │   ├── attendanceRoutes.js
    │   ├── sessionRoutes.js
    │   ├── subjectRoutes.js
    │   ├── assignmentRoutes.js
    │   ├── faceRoutes.js
    │   ├── dashboardRoutes.js
    │   ├── reportRoutes.js
    │   └── profileRoutes.js
    ├── middleware/
    │   ├── authMiddleware.js       ← JWT protect()
    │   ├── roleMiddleware.js       ← authorise(...roles)
    │   ├── uploadMiddleware.js     ← Multer instances
    │   ├── validationMiddleware.js ← express-validator runner
    │   └── errorHandler.js        ← Global error handler
    ├── services/
    │   ├── faceRecognitionService.js  ← Embedding + cosine similarity
    │   └── mailService.js             ← Forgot-password email
    ├── validators/
    │   └── authValidation.js
    ├── utils/
    │   ├── generateToken.js
    │   ├── response.js      ← success() / error() helpers
    │   ├── dateUtils.js     ← todayString(), distanceMeters()
    │   └── logger.js
    └── uploads/
        ├── profiles/        ← Profile photos
        └── faces/           ← Face images
```

---

## Quick Start

### 1. Install dependencies
```bash
cd backend
npm install
```

### 2. Configure environment
Edit `.env` and set:
```
MONGO_DB_URI=mongodb://localhost:27017/sams_db
JWT_SECRET=your_secret_here
FRONTEND_URL=http://localhost:5173
```

### 3. Seed default accounts
```bash
node seed.js
```
This creates:
- **Admin:** admin@sams.edu / admin123
- **Faculty:** anita@sams.edu / faculty123
- **Student:** aarav@student.sams.edu / student123

### 4. Run the server
```bash
# Development (auto-restart)
npm run dev

# Production
npm start
```

Server starts at **http://localhost:5000**

---

## API Reference

### Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | ❌ | Login — returns JWT |
| POST | `/api/auth/logout` | ❌ | Logout |
| GET | `/api/auth/me` | ✅ | Current user profile |
| POST | `/api/auth/forgot-password` | ❌ | Send reset email |
| POST | `/api/auth/reset-password` | ❌ | Reset with token |
| PUT | `/api/auth/change-password` | ✅ | Change own password |

### Admin
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/dashboard` | Stats overview |
| GET | `/api/admin/users` | All users (filter by ?role=) |
| DELETE | `/api/admin/user/:id` | Delete user |
| POST | `/api/admin/students` | Register student + face |
| GET | `/api/admin/students` | List students |
| GET/PUT | `/api/admin/students/:id` | View / update student |
| POST | `/api/admin/students/:id/reset-password` | Reset student password |
| POST | `/api/admin/faculty` | Register faculty |
| GET | `/api/admin/faculty` | List faculty |
| GET/PUT | `/api/admin/faculty/:id` | View / update faculty |
| POST | `/api/admin/faculty/:id/reset-password` | Reset faculty password |
| GET | `/api/admin/attendance` | All attendance records |
| GET | `/api/admin/attendance/:id` | Single record |

### Sessions (Faculty)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/sessions/start` | Start attendance session |
| PUT | `/api/sessions/end/:id` | End session |
| GET | `/api/sessions` | List sessions |
| GET | `/api/sessions/active` | Get current active session |

### Attendance (Student)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/attendance/mark` | Mark attendance (face + GPS) |
| POST | `/api/attendance/check-out` | Check out |
| GET | `/api/attendance/history` | Own attendance history |
| GET | `/api/attendance/student/:id` | Student's records (admin/faculty) |
| GET | `/api/attendance/session/:id` | Session's records (admin/faculty) |
| GET | `/api/attendance/report` | Filtered report |

### Face Recognition
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/faces/register` | Register face for a student |
| POST | `/api/faces/verify` | Verify live face |
| GET | `/api/faces/student/:id` | Check if student has face |
| DELETE | `/api/faces/student/:id` | Remove face data |

### Subjects & Assignments
| Method | Endpoint | Description |
|---|---|---|
| GET/POST | `/api/subjects` | List / create subjects |
| PUT/DELETE | `/api/subjects/:id` | Update / delete subject |
| GET/POST | `/api/assignments` | Faculty-subject assignments |
| GET | `/api/assignments/faculty/:id` | Subjects for a faculty |
| DELETE | `/api/assignments/:id` | Remove assignment |

### Dashboard
| Endpoint | Role |
|---|---|
| GET `/api/dashboard/admin` | admin |
| GET `/api/dashboard/faculty` | faculty |
| GET `/api/dashboard/student` | student |

### Reports
| Endpoint | Description |
|---|---|
| GET `/api/reports/student` | Student attendance summary |
| GET `/api/reports/faculty` | Faculty session report |
| GET `/api/reports/subject` | Per-subject attendance |
| GET `/api/reports/date` | Attendance on a specific date |

### Profile
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/profile` | Own profile |
| PUT | `/api/profile` | Update profile |
| POST | `/api/profile/upload` | Upload profile photo |

---

## Authentication Flow

```
POST /api/auth/login  { email, password, role? }
→ { token, user }

Every protected request:
Authorization: Bearer <token>
```

The token contains `{ id, role }` and is verified by `authMiddleware.js`.

---

## Face Recognition Flow

1. **Registration** — Admin sends student's base64 face image to `POST /api/faces/register`
2. Backend calls `generateEmbedding(base64)` → 128-dim vector stored in `user.faceEmbeddings`
3. **Attendance** — Student sends live webcam base64 to `POST /api/attendance/mark`
4. Backend calls `compareFaces(liveImage, storedEmbeddings)` → cosine similarity → score 0–100
7. If score ≥ 60 → `verified: true` → attendance saved
8. If score < 60 → 400 error: `"Face Verification Failed"`

### Upgrading to a Real ML Model

Replace `generateEmbedding()` in `src/services/faceRecognitionService.js`:

```js
// Example: call a Python DeepFace microservice
async function generateEmbedding(base64Image) {
  const response = await fetch("http://localhost:8000/embed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ image: base64Image }),
  });
  const { embedding } = await response.json();
  return embedding; // 128 or 512-dim array
}
```

`compareFaces()` uses cosine similarity and works with any embedding size — no other changes needed.

---

## Connecting to Frontend

Set in your frontend `.env`:
```
VITE_API_URL=http://localhost:5000/api
```

The frontend's `api.js` axios instance already reads `VITE_API_URL` and sends `Authorization: Bearer <token>` from `localStorage.sams_user`.

---

## Default Credentials (after seed)

| Role | Email | Password |
|---|---|---|
| Admin | admin@sams.edu | admin123 |
| Faculty | anita@sams.edu | faculty123 |
| Faculty | rajesh@sams.edu | faculty123 |
| Student | aarav@student.sams.edu | student123 |
| Student | priya@student.sams.edu | student123 |
| Student | rohan@student.sams.edu | student123 |
