using System.ComponentModel.DataAnnotations;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.DataProtection.EntityFrameworkCore;
namespace CareFlow;

public abstract class Entity { public int Id { get; set; } }
public class Department : Entity { [Required, StringLength(80)] public string Name { get; set; } = ""; }
public class Ward : Entity { [Required, StringLength(80)] public string Name { get; set; } = ""; [Range(1, int.MaxValue)] public int DepartmentId { get; set; } public Department? Department { get; set; } }
public class Bed : Entity { [Required, StringLength(30)] public string Label { get; set; } = ""; [Range(1, int.MaxValue)] public int WardId { get; set; } public Ward? Ward { get; set; } public bool InService { get; set; } = true; }
public class Patient : Entity
{
    [Required, StringLength(100)] public string Name { get; set; } = "";
    [Required, StringLength(30)] public string MedicalRecordNumber { get; set; } = "";
    public DateTime DateOfBirth { get; set; }
    [Required, RegularExpression("Female|Male|Other|Prefer not to say")] public string Sex { get; set; } = "Prefer not to say";
    [StringLength(30)] public string Phone { get; set; } = "";
    [StringLength(1000)] public string Conditions { get; set; } = "";
}
public class Admission : Entity
{
    [Range(1, int.MaxValue)] public int PatientId { get; set; }
    public Patient? Patient { get; set; }
    [Range(1, int.MaxValue)] public int BedId { get; set; }
    public Bed? Bed { get; set; }
    public DateTime AdmittedAt { get; set; } = DateTime.UtcNow; public DateTime? DischargedAt { get; set; }
    [Required, StringLength(300)] public string Diagnosis { get; set; } = "";
    [Required, RegularExpression("Routine|Urgent|Emergency")] public string Priority { get; set; } = "Routine";
}
public class ClinicalNote : Entity { [Range(1, int.MaxValue)] public int AdmissionId { get; set; } public Admission? Admission { get; set; } [Required, StringLength(5000)] public string Instructions { get; set; } = ""; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; }
public class DischargePlan : Entity { [Range(1, int.MaxValue)] public int AdmissionId { get; set; } public Admission? Admission { get; set; } [Required, StringLength(15000)] public string Content { get; set; } = ""; public bool Approved { get; set; } public string Source { get; set; } = "Manual"; public DateTime CreatedAt { get; set; } = DateTime.UtcNow; }
public class FollowUp : Entity { [Range(1, int.MaxValue)] public int DischargePlanId { get; set; } public DischargePlan? DischargePlan { get; set; } public DateTime ScheduledAt { get; set; } [Required, StringLength(100)] public string Clinic { get; set; } = ""; public bool Completed { get; set; } }
public class AppUser : Entity { public string Email { get; set; } = ""; public string Name { get; set; } = ""; public string PasswordHash { get; set; } = ""; public string Role { get; set; } = "User"; }
public class HospitalDb(DbContextOptions<HospitalDb> options) : DbContext(options), IDataProtectionKeyContext
{
    public DbSet<DataProtectionKey> DataProtectionKeys => Set<DataProtectionKey>();
    public DbSet<Department> Departments => Set<Department>(); public DbSet<Ward> Wards => Set<Ward>(); public DbSet<Bed> Beds => Set<Bed>(); public DbSet<Patient> Patients => Set<Patient>(); public DbSet<Admission> Admissions => Set<Admission>(); public DbSet<ClinicalNote> ClinicalNotes => Set<ClinicalNote>(); public DbSet<DischargePlan> DischargePlans => Set<DischargePlan>(); public DbSet<FollowUp> FollowUps => Set<FollowUp>(); public DbSet<AppUser> Users => Set<AppUser>();
    protected override void OnModelCreating(ModelBuilder m)
    {
        m.Entity<Patient>().HasIndex(p => p.MedicalRecordNumber).IsUnique(); m.Entity<AppUser>().HasIndex(p => p.Email).IsUnique();
        m.Entity<Bed>().HasIndex(b => b.Label).IsUnique(); m.Entity<Department>().HasIndex(d => d.Name).IsUnique();
        var activeAdmissionFilter = Database.IsNpgsql() ? "\"DischargedAt\" IS NULL" : "[DischargedAt] IS NULL";
        m.Entity<Admission>().HasIndex(a => a.BedId).IsUnique().HasFilter(activeAdmissionFilter);
        m.Entity<Admission>().HasIndex(a => a.PatientId).IsUnique().HasFilter(activeAdmissionFilter);
        // Birth dates are calendar dates, unlike clinical timestamps which remain UTC.
        if (Database.IsNpgsql()) m.Entity<Patient>().Property(p => p.DateOfBirth).HasColumnType("date");
        else m.Ignore<DataProtectionKey>();
        m.Entity<DischargePlan>().HasIndex(p => p.AdmissionId).IsUnique();
        foreach (var fk in m.Model.GetEntityTypes().SelectMany(t => t.GetForeignKeys())) fk.DeleteBehavior = DeleteBehavior.Restrict;
    }
}
