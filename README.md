# 🚦 DriveLegal — India's Smart Traffic Management Platform

A modern, role-based traffic management web application built with React. Designed to streamline RTO operations, manage challans, and empower Indian citizens with real-time traffic information.

---

## 🌐 Live Demo
> Coming Soon

---

## ✨ Features

### 👤 Citizen Portal
- Register & login with vehicle details
- View all issued challans against registered vehicles
- Pay pending challans online
- Access location-based traffic rules
- AI-powered traffic assistant chatbot

### 🏛️ Admin Portal (Role-Based)
| Role | Access |
|------|--------|
| **RTO Officer** | Issue challans, manage violations |
| **Analyst** | Traffic data analysis & reports |
| **RTO Chief** | Full control — create/manage all accounts |

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, React Router v6 |
| Styling | CSS Modules, Tailwind CSS v3 |
| Auth | localStorage-based (JWT-ready) |
| State | React Context API |
| Charts | Recharts |
| Backend (planned) | Spring Boot + MySQL |

---

## 📁 Project Structure

```
src/
├── Auth/
│   ├── AuthContext.jsx       # Global auth state + localStorage
│   ├── Login.jsx             # Citizen login & registration
│   ├── AdminLogin.jsx        # Admin portal login
│   └── ProtectedRoute.jsx    # Role-based route guard
├── pages/
│   ├── Home.jsx
│   ├── About.jsx
│   ├── Services.jsx
│   ├── Contact.jsx
│   └── global.css
├── user/
│   ├── UserChallanDashboard.jsx
│   ├── LocationInfo.jsx
│   └── user.css
├── admin/
│   ├── RTOOfficer.jsx
│   ├── Analyst.jsx
│   ├── RTOChief.jsx
│   └── admin.css
└── Components/
    └── Chatbot.jsx
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- npm v9+

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/CoderPrashant2005/drivelegal-frontend.git

# 2. Navigate to project
cd drivelegal-frontend

# 3. Install dependencies
npm install

# 4. Start development server
npm start
```

App runs at **http://localhost:3000**

---

## 🔐 Default Login Credentials

### Citizen Portal — `/login`
> Register a new account from the login page

### Admin Portal — `/admin/login`
| Field | Value |
|-------|-------|
| Email | `chief@smartroad.system` |
| Password | `Chief@2024` |

> Use the RTO Chief account to create Officer and Analyst accounts from the dashboard.

---

## 🎨 Theme Support
- ☀️ Light Mode
- 🌙 Dark Mode
- Persists across sessions via localStorage

---

## 📸 Screenshots
> Coming Soon

---

## 🗺️ Roadmap

- [x] Role-based authentication (4 roles)
- [x] Citizen challan dashboard
- [x] Admin dashboards (Officer, Analyst, Chief)
- [x] Dark / Light theme toggle
- [x] AI Chatbot assistant
- [ ] Spring Boot REST API integration
- [ ] JWT authentication
- [ ] Payment gateway integration
- [ ] SMS/Email challan notifications
- [ ] Live traffic map (Leaflet.js)

---

## 👨‍💻 Author

**Prashant Sharma**
- GitHub: [@CoderPrashant2005](https://github.com/CoderPrashant2005)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

<p align="center">Made with ❤️ for India's smarter roads 🇮🇳</p>
