using CareFlow;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using System.Threading.RateLimiting;
var builder = WebApplication.CreateBuilder(args);
var sqlite = builder.Configuration["DatabaseProvider"] == "Sqlite";
if (sqlite && !builder.Environment.IsDevelopment()) throw new InvalidOperationException("SQLite is restricted to Development; configure SQL Server for deployment.");
builder.Services.AddDbContext<HospitalDb>(o => { if (sqlite) o.UseSqlite(builder.Configuration.GetConnectionString("Hospital") ?? "Data Source=careflow.db"); else o.UseSqlServer(builder.Configuration.GetConnectionString("Hospital") ?? throw new InvalidOperationException("Configure ConnectionStrings__Hospital.")); });
builder.Services.AddSingleton<IPasswordHasher<AppUser>, PasswordHasher<AppUser>>();
builder.Services.AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme).AddCookie(o => { o.Cookie.Name = "CareFlow.Session"; o.Cookie.HttpOnly = true; o.Cookie.SameSite = SameSiteMode.Strict; o.Cookie.SecurePolicy = builder.Environment.IsDevelopment() ? CookieSecurePolicy.SameAsRequest : CookieSecurePolicy.Always; o.ExpireTimeSpan = TimeSpan.FromHours(8); o.Events.OnRedirectToLogin = c => { c.Response.StatusCode = 401; return Task.CompletedTask; }; o.Events.OnRedirectToAccessDenied = c => { c.Response.StatusCode = 403; return Task.CompletedTask; }; });
builder.Services.AddAuthorization(); builder.Services.AddAntiforgery(o => o.HeaderName = "X-CSRF-TOKEN");
builder.Services.AddRateLimiter(o => { o.RejectionStatusCode = 429; o.AddPolicy("login", c => RateLimitPartition.GetFixedWindowLimiter(c.Connection.RemoteIpAddress?.ToString() ?? "unknown", _ => new FixedWindowRateLimiterOptions { PermitLimit = 10, Window = TimeSpan.FromMinutes(1), QueueLimit = 0 })); });
builder.Services.AddControllers().AddJsonOptions(o => { o.JsonSerializerOptions.ReferenceHandler = System.Text.Json.Serialization.ReferenceHandler.IgnoreCycles; o.JsonSerializerOptions.Converters.Add(new UtcDateTimeConverter()); });
builder.Services.AddEndpointsApiExplorer(); builder.Services.AddSwaggerGen(); builder.Services.AddHttpClient(); builder.Services.AddProblemDetails();
var app = builder.Build();
if (args.Contains("--schema")) { using var scope = app.Services.CreateScope(); Console.WriteLine(scope.ServiceProvider.GetRequiredService<HospitalDb>().Database.GenerateCreateScript()); return; }
app.UseExceptionHandler();
app.Use(async (c, next) => { c.Response.Headers["X-Content-Type-Options"] = "nosniff"; c.Response.Headers["X-Frame-Options"] = "DENY"; c.Response.Headers["Referrer-Policy"] = "same-origin"; c.Response.Headers["Content-Security-Policy"] = "default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"; if (c.Request.Path.StartsWithSegments("/api")) c.Response.Headers.CacheControl = "no-store"; await next(); });
if (!app.Environment.IsDevelopment()) { app.UseHsts(); app.UseHttpsRedirection(); }
app.UseDefaultFiles(); app.UseStaticFiles(); app.UseRouting(); app.UseRateLimiter(); app.UseAuthentication(); app.UseAuthorization();
app.Use(async (c, next) => { if (c.Request.Path.StartsWithSegments("/api") && !HttpMethods.IsGet(c.Request.Method) && !HttpMethods.IsHead(c.Request.Method)) { try { await c.RequestServices.GetRequiredService<IAntiforgery>().ValidateRequestAsync(c); } catch (AntiforgeryValidationException) { c.Response.StatusCode = 400; await c.Response.WriteAsJsonAsync(new { error = "Request verification failed. Refresh and try again." }); return; } } await next(); });
if (app.Environment.IsDevelopment()) { app.UseSwagger(); app.UseSwaggerUI(); }
app.MapControllers(); app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
if (app.Environment.IsDevelopment() || builder.Configuration.GetValue<bool>("InitializeDatabase")) { using var scope = app.Services.CreateScope(); var db = scope.ServiceProvider.GetRequiredService<HospitalDb>(); await db.Database.EnsureCreatedAsync(); if (app.Environment.IsDevelopment()) await Seed.Run(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>()); else await Seed.Admin(db, scope.ServiceProvider.GetRequiredService<IPasswordHasher<AppUser>>(), builder.Configuration); }
app.Run();
