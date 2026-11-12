# CareFlow implementation plan

## Goal
Build a responsive hospital resource and patient readmission analytics application using ASP.NET Core, EF Core, SQL Server, and a minimalist light HTML/CSS/JavaScript frontend.

## Delivery phases and acceptance criteria
1. Foundation: .NET web API, environment configuration, SQL Server connectivity, Docker, and Git. No production secrets in source control.
2. Data model: Departments → Wards → Beds; Patients → Admissions; Admissions → ClinicalNotes and DischargePlans; DischargePlans → FollowUps. Authentication users carry Admin or User roles. Restrictive foreign keys protect historical records; a filtered unique index prevents two active admissions in one bed.
3. Security: password hashing, HttpOnly cookie authentication, separate Admin/Staff sign-in, role checks, antiforgery validation for writes, login throttling, and development-only seeded accounts.
4. Core features: patient and resource CRUD, admission/discharge workflow, notes, care-plan review, follow-up CRUD, server validation, search, sorting and filters.
5. Interface: responsive sidebar, teal/light theme, overview, patients, admissions, resources, discharge studio, reports, loading/empty/error states, accessible forms and tables.
6. Analytics: current occupied beds / total usable beds; admissions by day; ward utilization; completed-stay average length; observed readmission within 30 days of discharge, with mature cohorts distinguished from incomplete observation.
7. Advanced features: validated CSV patient import, spreadsheet-compatible CSV exports, print-to-PDF care plans, optional remote AI generation with explicit provider status and clinical review. Templates remain available without an AI key and are identified as templates.
8. Verification: compile, API checks for authorization/CRUD/validation/conflicts, JavaScript syntax check, Swagger and Postman collection. Record limitations honestly if SQL Server or browser tooling is unavailable.
9. Documentation: abstract, objectives, problem, methodology, architecture, ER diagram, DFD, results, limitations, conclusion, setup/deployment instructions, demo script, contributions, and professional PPTX.
10. Deployment: Docker-capable host or Azure App Service with SQL Server/Azure SQL. GitHub and production hosting require available authenticated accounts. Never substitute a static UI for a deployed .NET backend.

## Data contract
Eight domain entities: Department, Ward, Bed, Patient, Admission, ClinicalNote, DischargePlan, FollowUp. AppUser is the ninth security entity. Admin manages resources and all workflows; User represents authorized clinical staff, not a patient portal. All demo patient data is synthetic.

## Clinical scope
Readmission metrics are descriptive, not a validated prediction model. Generated text summarizes provided clinician instructions without inventing drugs, doses, diagnoses, or treatment. Plans remain drafts until staff review. This academic prototype requires operational security and clinical validation before real patient use.

## Planned evaluation
Admin sign-in → inspect dashboard → create patient → allocate free bed → add clinical note → generate and edit draft → approve plan → discharge → schedule follow-up → export report. Show staff restrictions and rejected duplicate bed allocation. Contributions are a template until actual team members provide their work.

## Final delivery status
- Implemented: API, SQL Server model, eight domain CRUD workflows, authentication/authorization, responsive dashboard, cohort comparisons, care-plan drafting/review, import/export, and follow-ups.
- Verified: Docker app with SQL Server, 20 final API checks, desktop/mobile browser workflows including approved PDF output.
- Delivered: project report/diagrams, deployment/API guides, Postman collection, screenshots, sample PDF, 19-slide PowerPoint, and incremental local Git commits.
- External tasks: owner will push to GitHub; no cloud destination or AI provider credentials were supplied. See VERIFICATION.md for exact evidence and limitations.
