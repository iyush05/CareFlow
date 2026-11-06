# Final evaluation demonstration

## Preparation
Start the app and database. Open the dashboard, Swagger, source code, ER diagram, and presentation. Use synthetic accounts and records. Ensure the configured database provider is visible in the API lookup response if demonstrating SQL Server. Keep the template mode available if no AI key has been configured.

## Ten-minute walkthrough
| Time | Demonstration | Explanation |
|---|---|---|
| 0:00–1:00 | Problem and architecture slides | Hospital resources and discharge continuity; .NET/SQL stack |
| 1:00–2:00 | Sign in as Admin; dashboard | Live database aggregates, occupancy, mature readmission denominator |
| 2:00–3:00 | Create patient, search and edit | Input validation, medical record uniqueness, CRUD |
| 3:00–4:00 | Admit patient to available bed | Relationships, interval checks and filtered unique indexes |
| 4:00–5:30 | Add clinical instructions; draft plan | Explicit template/AI source, editable output, human review |
| 5:30–6:30 | Save approved plan; print PDF; follow-up | Continuity of care workflow |
| 6:30–7:15 | Discharge; inspect bed availability | Bed is released and history remains |
| 7:15–8:00 | Import CSV and export report | Atomic validation, downloadable records |
| 8:00–9:00 | Staff login / rejected admin endpoint | Server-side role authorization, not just hidden buttons |
| 9:00–10:00 | Swagger, tests, Git commits, limits | Demonstrate evidence and distinguish deployment status |

Show an invalid birthdate, duplicate record number, or duplicate bed assignment to demonstrate error handling. Delete a temporary empty patient to demonstrate Delete; explain why a patient with admission history cannot be deleted accidentally.

## Individual contribution record
Do not invent contributors. Replace the placeholders with actual names, work, and commit references.

| Team member | Contribution to explain | Evidence |
|---|---|---|
| [Actual name] | Schema, relationships, EF Core and API | [Commit IDs and files] |
| [Actual name] | UI, responsive design and API integration | [Commit IDs and screenshots] |
| [Actual name] | Analytics, AI draft workflow and reports | [Commit IDs and test evidence] |
| [Actual name] | Tests, deployment, documentation and slides | [Commit IDs and artifacts] |

For an individual submission, combine the rows under the actual student's name and accurately disclose tool assistance according to course requirements.

## Likely questions
- **Why SQL Server?** It satisfies the required stack and enforces relational constraints and filtered unique indexes for active assignments.
- **Why SQLite locally?** It is an explicitly development-only shortcut; SQL Server remains the deployment provider.
- **Is this readmission prediction?** No. The dashboard measures observed events. It does not claim a validated risk model or causal factors.
- **What prevents two active patients from taking one bed?** API checks plus a unique filtered database index on active bed assignments.
- **Does the AI prescribe care?** The prompt asks it to rewrite clinician-supplied information. Human review is still required and output may be incorrect.
- **Can the same person have multiple admissions?** Yes, over time; overlapping admissions are rejected.
- **How does authentication work?** Hashed passwords and HttpOnly cookies; all writes also require CSRF validation.
- **What would production need?** Clinical audit history, scalable queries, versioned migrations, stronger concurrency, identity lifecycle, deployment security, backups and clinical validation.
