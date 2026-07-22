<div align="center">

# Smart College Project Management System

<img src="https://readme-typing-svg.demolab.com?font=JetBrains+Mono&weight=600&size=24&duration=3000&pause=1200&color=58A6FF&center=true&vCenter=true&width=900&lines=Modern+Academic+Project+Management+Platform;Role-Based+Dashboard+Architecture;Academic-Year+Driven+Project+Lifecycle;Built+for+Scalability+%26+Real-World+Workflows" />
<p align="center">
<img width="500" src="https://media.giphy.com/media/L8K62iTDkzGX6/giphy.gif">
</p>
<br>

<img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white"/>
<img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white"/>
<img src="https://img.shields.io/badge/PostgreSQL-336791?style=for-the-badge&logo=postgresql&logoColor=white"/>
<img src="https://img.shields.io/badge/Role-Based%20Access-0D1117?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Academic%20Workflow-7C3AED?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Responsive%20UI-238636?style=for-the-badge"/>
<img src="https://img.shields.io/badge/Status-Active-success?style=for-the-badge"/>

</div>

---

## Overview

Smart College Project Management System is a centralized platform that digitizes the complete academic project lifecycle within a college environment.

The platform connects **Head of Department, Project Coordinators, Mentors, and Mentees** through role-specific dashboards while managing project allocation, submissions, evaluations, academic years, and progress tracking from one unified system.

The architecture is designed around an **Academic-Year Driven Model**, ensuring projects remain visible only within their relevant academic sessions while preserving historical records for future reference.

---

## Core Features
<p align="center">

<img src="https://skillicons.dev/icons?i=supabase,postgres,firebase,git,github,vscode&perline=8"/>

</p>
<table>
<tr>
<td width="50%">

### Administration

- Role-Based Authentication
- Academic Year Management
- Department Dashboard
- Coordinator Management
- Mentor Management
- Analytics Dashboard

</td>

<td width="50%">

### Project Management

- Project Allocation
- Mentor Assignment
- Mentee Assignment
- Semester Timeline
- Proposal Submission
- Document Management

</td>
</tr>

<tr>
<td>

### Monitoring

- Progress Tracking
- Review Scheduling
- Evaluation Workflow
- Submission History
- Status Monitoring
- Deadline Management

</td>

<td>

### User Experience

- Responsive Interface
- Advanced Search
- Smart Filtering
- Notifications
- Dashboard Insights
- Clean Navigation

</td>
</tr>
</table>

---

## User Roles

| Role | Responsibilities |
|------|------------------|
| **Head of Department** | Academic year management, analytics, department monitoring, coordinator & mentor oversight |
| **Project Coordinator** | Project creation, mentor allocation, mentee assignment, semester planning |
| **Mentor** | Student supervision, document review, evaluations, feedback, progress monitoring |
| **Mentee** | Project submission, milestone tracking, document uploads, feedback review |

---

## Academic-Year Mapping Engine

The Academic-Year Mapping Engine is the foundation of the system.

Instead of assigning projects to a single session, the platform intelligently maps each project using:

- Assignment Date
- Semester Duration
- Academic Calendar
- Semester Blocks *(January–June / July–December)*

This ensures:

- Accurate academic history
- Automatic year-wise filtering
- Zero cross-year project confusion
- Consistent historical records
- Simplified project administration

---

## Project Workflow

```text
Project Creation
        │
        ▼
Mentor Assignment
        │
        ▼
Mentee Allocation
        │
        ▼
Project Proposal
        │
        ▼
Document Submission
        │
        ▼
Mentor Review
        │
        ▼
Evaluation
        │
        ▼
Project Completion
```

---

## System Modules

```text
Smart College Project Management System

├── Authentication
├── Academic Year Management
├── Dashboard
│   ├── HOD
│   ├── Coordinator
│   ├── Mentor
│   └── Mentee
├── Project Management
├── Mentor Allocation
├── Student Allocation
├── Document Management
├── Review System
├── Evaluation Module
├── Analytics
├── Notifications
└── Profile Management
```

---

## Technology Stack

| Category | Technology |
|----------|------------|
| Frontend | Flutter |
| Backend | Supabase |
| Database | PostgreSQL |
| Authentication | Supabase Auth |
| State Management | Flutter Provider / Riverpod *(Based on implementation)* |
| Storage | Supabase Storage |

---

## Current Development Progress

| Module | Status |
|---------|:------:|
| Authentication | ████████████████████ 100% |
| Role Management | ████████████████████ 100% |
| Academic Year Module | ████████████████████ 100% |
| Dashboard | ███████████████████░ 95% |
| Project Allocation | ███████████████████░ 95% |
| Document Submission | ██████████████████░░ 90% |
| Review & Evaluation | █████████████████░░░ 85% |
| Notifications | ███████████████░░░░░ 75% |
| Analytics | ████████████████░░░░ 80% |

---

## Design Goals

- Modern academic workflow
- Scalable architecture
- Clean role separation
- Maintainable codebase
- High performance
- Responsive interface
- Secure authentication
- Long-term extensibility

---

## Repository Structure

```text
lib/
│
├── core/
├── models/
├── services/
├── screens/
│   ├── hod/
│   ├── coordinator/
│   ├── mentor/
│   └── mentee/
├── widgets/
├── providers/
├── utils/
└── main.dart
```

---

<div align="center">

### Building a smarter and more structured academic project ecosystem.

</div>
