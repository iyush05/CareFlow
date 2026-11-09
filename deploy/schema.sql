CREATE TABLE [Departments] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(80) NOT NULL,
    CONSTRAINT [PK_Departments] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Patients] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(100) NOT NULL,
    [MedicalRecordNumber] nvarchar(30) NOT NULL,
    [DateOfBirth] datetime2 NOT NULL,
    [Sex] nvarchar(max) NOT NULL,
    [Phone] nvarchar(30) NOT NULL,
    [Conditions] nvarchar(1000) NOT NULL,
    CONSTRAINT [PK_Patients] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Users] (
    [Id] int NOT NULL IDENTITY,
    [Email] nvarchar(450) NOT NULL,
    [Name] nvarchar(max) NOT NULL,
    [PasswordHash] nvarchar(max) NOT NULL,
    [Role] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Users] PRIMARY KEY ([Id])
);
GO


CREATE TABLE [Wards] (
    [Id] int NOT NULL IDENTITY,
    [Name] nvarchar(80) NOT NULL,
    [DepartmentId] int NOT NULL,
    CONSTRAINT [PK_Wards] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Wards_Departments_DepartmentId] FOREIGN KEY ([DepartmentId]) REFERENCES [Departments] ([Id]) ON DELETE NO ACTION
);
GO


CREATE TABLE [Beds] (
    [Id] int NOT NULL IDENTITY,
    [Label] nvarchar(30) NOT NULL,
    [WardId] int NOT NULL,
    [InService] bit NOT NULL,
    CONSTRAINT [PK_Beds] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Beds_Wards_WardId] FOREIGN KEY ([WardId]) REFERENCES [Wards] ([Id]) ON DELETE NO ACTION
);
GO


CREATE TABLE [Admissions] (
    [Id] int NOT NULL IDENTITY,
    [PatientId] int NOT NULL,
    [BedId] int NOT NULL,
    [AdmittedAt] datetime2 NOT NULL,
    [DischargedAt] datetime2 NULL,
    [Diagnosis] nvarchar(300) NOT NULL,
    [Priority] nvarchar(max) NOT NULL,
    CONSTRAINT [PK_Admissions] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_Admissions_Beds_BedId] FOREIGN KEY ([BedId]) REFERENCES [Beds] ([Id]) ON DELETE NO ACTION,
    CONSTRAINT [FK_Admissions_Patients_PatientId] FOREIGN KEY ([PatientId]) REFERENCES [Patients] ([Id]) ON DELETE NO ACTION
);
GO


CREATE TABLE [ClinicalNotes] (
    [Id] int NOT NULL IDENTITY,
    [AdmissionId] int NOT NULL,
    [Instructions] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_ClinicalNotes] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_ClinicalNotes_Admissions_AdmissionId] FOREIGN KEY ([AdmissionId]) REFERENCES [Admissions] ([Id]) ON DELETE NO ACTION
);
GO


CREATE TABLE [DischargePlans] (
    [Id] int NOT NULL IDENTITY,
    [AdmissionId] int NOT NULL,
    [Content] nvarchar(max) NOT NULL,
    [Approved] bit NOT NULL,
    [Source] nvarchar(max) NOT NULL,
    [CreatedAt] datetime2 NOT NULL,
    CONSTRAINT [PK_DischargePlans] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_DischargePlans_Admissions_AdmissionId] FOREIGN KEY ([AdmissionId]) REFERENCES [Admissions] ([Id]) ON DELETE NO ACTION
);
GO


CREATE TABLE [FollowUps] (
    [Id] int NOT NULL IDENTITY,
    [DischargePlanId] int NOT NULL,
    [ScheduledAt] datetime2 NOT NULL,
    [Clinic] nvarchar(100) NOT NULL,
    [Completed] bit NOT NULL,
    CONSTRAINT [PK_FollowUps] PRIMARY KEY ([Id]),
    CONSTRAINT [FK_FollowUps_DischargePlans_DischargePlanId] FOREIGN KEY ([DischargePlanId]) REFERENCES [DischargePlans] ([Id]) ON DELETE NO ACTION
);
GO


CREATE UNIQUE INDEX [IX_Admissions_BedId] ON [Admissions] ([BedId]) WHERE [DischargedAt] IS NULL;
GO


CREATE UNIQUE INDEX [IX_Admissions_PatientId] ON [Admissions] ([PatientId]) WHERE [DischargedAt] IS NULL;
GO


CREATE UNIQUE INDEX [IX_Beds_Label] ON [Beds] ([Label]);
GO


CREATE INDEX [IX_Beds_WardId] ON [Beds] ([WardId]);
GO


CREATE INDEX [IX_ClinicalNotes_AdmissionId] ON [ClinicalNotes] ([AdmissionId]);
GO


CREATE UNIQUE INDEX [IX_Departments_Name] ON [Departments] ([Name]);
GO


CREATE UNIQUE INDEX [IX_DischargePlans_AdmissionId] ON [DischargePlans] ([AdmissionId]);
GO


CREATE INDEX [IX_FollowUps_DischargePlanId] ON [FollowUps] ([DischargePlanId]);
GO


CREATE UNIQUE INDEX [IX_Patients_MedicalRecordNumber] ON [Patients] ([MedicalRecordNumber]);
GO


CREATE UNIQUE INDEX [IX_Users_Email] ON [Users] ([Email]);
GO


CREATE INDEX [IX_Wards_DepartmentId] ON [Wards] ([DepartmentId]);
GO



