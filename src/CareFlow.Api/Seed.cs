using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
namespace CareFlow;

public static class Seed
{
    public static async Task Admin(HospitalDb db, IPasswordHasher<AppUser> hasher, IConfiguration config) { if (await db.Users.AnyAsync()) return; var password = config["Bootstrap:Password"] ?? throw new InvalidOperationException("Set Bootstrap__Password for first deployment."); if (password.Length < 14) throw new InvalidOperationException("Bootstrap password requires 14 characters."); var user = new AppUser { Email = (config["Bootstrap:Email"] ?? throw new InvalidOperationException("Set Bootstrap__Email")).Trim().ToLowerInvariant(), Name = "Administrator", Role = "Admin" }; user.PasswordHash = hasher.HashPassword(user, password); db.Users.Add(user); await db.SaveChangesAsync(); }
    public static async Task Run(HospitalDb db, IPasswordHasher<AppUser> hasher)
    {
        if (await db.Users.AnyAsync()) return;
        foreach (var role in new[] { "Admin", "User" }) { var u = new AppUser { Email = role == "Admin" ? "admin@careflow.local" : "staff@careflow.local", Name = role == "Admin" ? "Alex Morgan" : "Sam Taylor", Role = role }; u.PasswordHash = hasher.HashPassword(u, "CareFlow@Demo2026!"); db.Users.Add(u); }
        var departments = new[] { "General Medicine", "Cardiology", "Orthopedics", "Neurology" }.Select(n => new Department { Name = n }).ToArray(); db.Departments.AddRange(departments); await db.SaveChangesAsync();
        var wards = departments.Select((d, i) => new Ward { Name = new[] { "Maple Ward", "Cedar Ward", "Willow Ward", "Birch Ward" }[i], DepartmentId = d.Id }).ToArray(); db.Wards.AddRange(wards); await db.SaveChangesAsync();
        foreach (var w in wards) for (int i = 1; i <= 12; i++) db.Beds.Add(new Bed { WardId = w.Id, Label = $"{w.Name[..1]}-{i:00}" }); await db.SaveChangesAsync();
        string[] names = ["Avery Brooks", "Jordan Ellis", "Taylor Reed", "Riley Parker", "Morgan Chen", "Casey Patel", "Jamie Wilson", "Cameron Blake", "Drew Adams", "Quinn Lewis", "Skyler Hall", "Robin James", "Alex Rivera", "Emery Clark", "Finley Scott", "Harper Young", "Reese Walker", "Sage Allen", "Rowan King", "Charlie Evans", "Dakota Hill", "Elliot Green", "Peyton Baker", "Shawn Wright"];
        var people = names.Select((n, i) => new Patient { Name = n, MedicalRecordNumber = $"CF-{1001 + i}", DateOfBirth = new DateTime(1955 + i * 2, 3 + i % 8, 4 + i % 20), Sex = i % 2 == 0 ? "Female" : "Male", Phone = $"555-010-{i:0000}", Conditions = i % 3 == 0 ? "Clinician follow-up requested" : "" }).ToArray(); db.Patients.AddRange(people); await db.SaveChangesAsync(); var beds = await db.Beds.OrderBy(b => b.Id).ToListAsync();
        for (int i = 0; i < 24; i++) { var old = new Admission { PatientId = people[i].Id, BedId = beds[i].Id, AdmittedAt = DateTime.UtcNow.Date.AddDays(-65 + i), DischargedAt = DateTime.UtcNow.Date.AddDays(-61 + i), Diagnosis = new[] { "Observation", "Recovery monitoring", "Scheduled procedure", "Clinical evaluation" }[i % 4] }; db.Admissions.Add(old); }
        await db.SaveChangesAsync();
        for (int i = 0; i < 18; i++) { var a = new Admission { PatientId = people[i].Id, BedId = beds[i + i / 6].Id, AdmittedAt = DateTime.UtcNow.AddDays(-1 - i % 12), Diagnosis = new[] { "Observation", "Recovery monitoring", "Scheduled procedure", "Clinical evaluation" }[i % 4], Priority = i % 6 == 0 ? "Urgent" : "Routine" }; db.Admissions.Add(a); }
        for (int i = 18; i < 24; i++) db.Admissions.Add(new Admission { PatientId = people[i].Id, BedId = beds[i].Id, AdmittedAt = DateTime.UtcNow.Date.AddDays(-35 + i - 18), DischargedAt = DateTime.UtcNow.Date.AddDays(-32 + i - 18), Diagnosis = "Follow-up observation" });
        await db.SaveChangesAsync(); var active = await db.Admissions.Where(a => a.DischargedAt == null).ToListAsync(); foreach (var a in active) db.ClinicalNotes.Add(new ClinicalNote { AdmissionId = a.Id, Instructions = "Follow the instructions provided by your treating clinician. Bring your discharge documents to your scheduled follow-up. Contact the care team if you have questions about your care plan." }); await db.SaveChangesAsync();
    }
}
