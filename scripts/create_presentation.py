"""Regenerate the evaluation PowerPoint with python-pptx (pip install python-pptx)."""
from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
ROOT=Path(__file__).resolve().parents[1]
r=Presentation();r.slide_width=Inches(13.333);r.slide_height=Inches(7.5)
INK='20352F';MUTED='6D7D77';GREEN='167B65';PALE='EAF5EF';BG='F7F9F8';WHITE='FFFFFF'
def box(slide,x,y,w,h,fill=WHITE,line=None,radius=True):
 s=slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h));s.fill.solid();s.fill.fore_color.rgb=RGBColor.from_string(fill);s.line.fill.background() if not line else None
 if line:s.line.color.rgb=RGBColor.from_string(line)
 if radius:s.adjustments[0]=.12
 return s

def text(slide,x,y,w,h,value,size=20,color=INK,bold=False):
 shape=slide.shapes.add_textbox(Inches(x),Inches(y),Inches(w),Inches(h));tf=shape.text_frame;tf.word_wrap=True
 for i,line in enumerate(value.split('\n')):
  p=tf.paragraphs[0] if i==0 else tf.add_paragraph();p.text=line;p.font.name='Aptos';p.font.size=Pt(size);p.font.bold=bold;p.font.color.rgb=RGBColor.from_string(color);p.space_after=Pt(12)
 return shape

def slide(title,kicker='CAREFLOW / PROJECT EVALUATION',subtitle=''):
 s=r.slides.add_slide(r.slide_layouts[6]);s.background.fill.solid();s.background.fill.fore_color.rgb=RGBColor.from_string(BG)
 box(s,.55,.45,.4,.4,GREEN,radius=True);text(s,.61,.45,.3,.3,'+',18,WHITE,True);text(s,1.03,.43,3,.4,'CareFlow',20,INK,True)
 text(s,.65,1.1,11,.3,kicker,11,GREEN,True);text(s,.65,1.55,12,1,title,32,INK,True)
 if subtitle:text(s,.68,2.34,11.9,.6,subtitle,15,MUTED)
 text(s,.65,7.1,11,.25,'Hospital Resource & Patient Readmission Analytics  ·  Academic prototype',10,MUTED)
 text(s,12,7.08,.6,.25,f'{len(r.slides):02d}',10,MUTED)
 return s

def cards(s,items,y=3.1):
 w=(12.0-.28*(len(items)-1))/len(items)
 for i,(title,body) in enumerate(items):
  x=.65+i*(w+.28);box(s,x,y,w,3.2);text(s,x+.25,y+.28,w-.5,.7,title,21,GREEN,True);text(s,x+.25,y+1.05,w-.5,2,body,17,MUTED)

def bullets(s,lines,y=3.05):
 for i,line in enumerate(lines):
  box(s,.72,y+i*.65,.09,.09,GREEN,radius=False);text(s,1,y-.12+i*.65,11.5,.65,line,19,INK)

def note(s,value):s.notes_slide.notes_text_frame.text=value
s=slide('A clearer view of care.','CAREFLOW','Hospital Resource & Patient Readmission Analytics')
text(s,.7,3.3,7,1.2,'Connected resources.\nConfident discharge journeys.',29,GREEN,True)
text(s,.7,5.25,8,1,'ASP.NET Core  ·  Entity Framework Core  ·  SQL Server\nResponsive light UI  ·  Clinician-reviewed discharge drafting',18,MUTED)
note(s,'Introduce the project and team. Replace placeholders in the contribution slide with actual names before evaluation. The prototype uses synthetic patient data.')
s=slide('The operational problem','WHY THIS PROJECT','Disconnected information makes day-to-day care coordination harder.')
cards(s,[('Uncertain demand','Patient arrivals are variable. Teams need an accessible view of available beds.'),('Fragmented journeys','Admission history and follow-up arrangements can be difficult to review together.'),('Unclear next steps','Discharge instructions need to be understandable, consistent, and reviewed.')]);note(s,'These are the motivating problems supplied in the project brief. Do not claim measured outcomes from a real hospital.')
s=slide('What CareFlow sets out to do','OBJECTIVES')
bullets(s,['Maintain linked patient, admission, and hospital-resource records.','Track occupancy, patient flow, stay duration, and observed readmissions.','Prepare plain-language discharge drafts from clinician instructions.','Enable secure Admin and Staff workflows with validated APIs.','Deliver a reproducible application, tests, reports, and documentation.'])
s=slide('One stack, one connected workspace','TECHNOLOGY')
cards(s,[('Frontend','HTML + CSS + JavaScript\nResponsive layouts\nSVG analytics\nSame-origin API calls'),('Backend','C# / ASP.NET Core 10\nREST controllers\nCookie authentication\nRole and CSRF checks'),('Data & delivery','SQL Server + EF Core\nLINQ queries\nDocker + Git\nSwagger + Postman')]);note(s,'SQLite exists only as a development fallback. The required SQL Server provider is implemented and separately tested.')
s=slide('From browser to persisted care records','SYSTEM ARCHITECTURE')
for x,title,body in [(.7,'Responsive UI','Admin and clinical staff'),(4.8,'ASP.NET Core API','Auth · Validation · Analytics'),(8.9,'SQL Server','EF Core · Related tables')]:
 box(s,x,3,3.7,1.45);text(s,x+.2,3.25,3.3,.45,title,21,GREEN,True);text(s,x+.2,3.9,3.3,.35,body,14,MUTED)
for x in [4.4,8.5]:text(s,x,3.55,.35,.4,'›',25,GREEN,True)
box(s,4.8,5,3.7,1);text(s,5,5.2,3.3,.6,'Optional AI provider\nHTTPS · server-side secret',16,GREEN)
note(s,'The same ASP.NET Core process serves frontend assets and API routes. Only configured clinical text goes to the optional provider. Database and AI secrets stay server-side.')
s=slide('Eight connected domain tables','DATABASE DESIGN','Plus a separate AppUser table for authentication.')
positions={'Department':(.7,3),'Ward':(3.8,3),'Bed':(6.9,3),'Admission':(10,3),'Patient':(10,4.55),'ClinicalNote':(6.9,4.55),'DischargePlan':(3.8,4.55),'FollowUp':(.7,4.55)}
for name,(x,y) in positions.items():box(s,x,y,2.6,1,WHITE);text(s,x+.2,y+.22,2.3,.55,name,19,GREEN,True)
text(s,.8,6.1,11.7,.6,'Department → Ward → Bed → Admission ← Patient\nAdmission → Notes / Discharge plan → Follow-ups',17,MUTED)
note(s,'Open the full Mermaid ER diagram in PROJECT_REPORT.md to discuss keys and cardinalities. Restrictive foreign keys protect history. Unique filtered indexes protect active patient and bed assignments.')
s=slide('A workflow built around the care journey','METHODOLOGY')
cards(s,[('Admit','Find or create patient\nChoose an available bed\nValidate and persist'),('Prepare','Add clinician instructions\nGenerate an editable draft\nReview and approve'),('Continue care','Discharge and release bed\nSchedule follow-up\nReview outcomes')])
s=slide('A calm, readable operations dashboard','INTERFACE','Synthetic demonstration data; all metrics are computed from stored admissions.')
p=ROOT/'docs/screenshots/dashboard.png'
if p.exists():s.shapes.add_picture(str(p),Inches(.8),Inches(3.05),height=Inches(3.8))
text(s,5.1,3.4,7,2.8,'Current occupancy and available beds\nDaily admissions and occupied-bed trends\nWard utilization at a glance\nRecent patient activity',21,INK)
s=slide('Authentication is enforced on the server','SECURITY')
cards(s,[('Identity','Hashed passwords\nHttpOnly session cookies\nSeparate portal entry points\nLogin throttling'),('Authorization','Admin: resources and accounts\nStaff: patient care workflows\nAPI role checks\nRestricted report exports'),('Request integrity','CSRF tokens on all writes\nSecure cookies in production\nNo-store API responses\nValidation and safe errors')]);note(s,'This prototype does not include MFA, password-reset workflows or immutable clinical audit history. Those are production extensions, not claimed completed features.')
s=slide('Metrics with explicit definitions','ANALYTICS')
cards(s,[('Resource utilization','Active admissions ÷ in-service beds.\nHistorical chart displays occupied-bed counts.'),('Stay duration','Elapsed days for admissions completed in the selected reporting window.'),('Readmissions','Subsequent admission within 30 days. Denominator uses fully observed discharge cohorts.')]);note(s,'Readmission measurement is descriptive, not prediction. Same-time transfers count in this prototype; planned readmissions are not distinguished. No causal claims are made.')
s=slide('A useful draft. A human decision.','DISCHARGE STUDIO')
cards(s,[('Input','Clinician-entered instructions and admission diagnosis. No invented treatment data.'),('Generation','Structured template without a key, or configured AI plain-language rewriting.'),('Review','Editable output. Explicit clinician approval. Print or save the approved plan.')]);note(s,'AI can still be wrong. The prompt cannot guarantee clinical safety. Actual provider testing needs a configured key; template workflow is executable without one.')
s=slide('Three advanced capabilities','BEYOND CRUD')
cards(s,[('AI integration','Server-side provider request\nConfigurable endpoint/model\nTransparent template mode\nActionable failure handling'),('File importing','CSV upload\nUp to 500 patient rows\nValidation before saving\nAtomic batch behavior'),('Portable reports','Excel-compatible CSV\nFormula-prefix escaping\nApproved plan print/PDF\nNo XLSX claim')])
s=slide('Validation makes failures useful','DATA QUALITY')
bullets(s,['Reject duplicate medical record numbers and conflicting bed assignments.','Reject impossible birthdates and invalid admission/discharge ordering.','Prevent an occupied bed from being taken out of service.','Protect related clinical history from accidental deletion.','Explain validation, authorization and provider errors in the interface.'])
s=slide('Test the workflows that matter','VERIFICATION')
cards(s,[('API checks','18 baseline checks passed with SQLite.\n20 final checks passed with Docker + SQL Server.'),('Browser checks','Desktop navigation\nCreate/search/delete patient\nDraft, approval and PDF\nMobile layout and JS errors'),('Build & review','Backend compiles\nJavaScript syntax checked\nDependencies patched\nScreenshots captured')]);note(s,'Use docs/VERIFICATION.md for the exact final build/container status. Do not present local testing as evidence of public cloud deployment.')
s=slide('A complete evaluation package','DELIVERABLES')
bullets(s,['Source code and incremental local Git commits.','Swagger endpoints and an importable Postman collection.','Docker/Compose deployment files and SQL Server schema.','Detailed report with architecture, ER diagram, DFD and limitations.','Demonstration script, contribution template and this PowerPoint.'])
s=slide('Deployment and honest boundaries','DELIVERY STATUS')
cards(s,[('Local deployment','Docker-ready .NET application\nSQL Server persistence\nDevelopment-only demo users\nLoopback-only exposed ports'),('External delivery','Owner pushes to GitHub manually.\nCloud hosting requires an account, destination and deployment configuration.'),('Before real use','Clinical validation and audit trail\nIdentity lifecycle and MFA\nMigrations and scalability\nBackups and operational controls')])
s=slide('Individual contributions','TEAM EVALUATION','Replace placeholders with actual team members and commit evidence before presenting.')
for i,(name,scope) in enumerate([('[Name]','Schema, EF Core, APIs and data integrity'),('[Name]','Responsive UI and frontend/backend integration'),('[Name]','Analytics, drafting workflow and reports'),('[Name]','Testing, deployment, documentation and presentation')]):
 box(s,.7,3+i*.72,11.9,.57);text(s,.95,3.06+i*.72,2,.4,name,17,GREEN,True);text(s,3.1,3.06+i*.72,9,.4,scope,17,INK)
note(s,'For individual submission, combine the contributions under the actual student name. Disclose tool assistance as required by the course. No team contributions are fabricated.')
s=slide('Demonstrate the complete journey','LIVE WALKTHROUGH')
bullets(s,['Admin login → dashboard → create and search a patient.','Allocate a bed → add notes → prepare and review a care plan.','Save/print the approved plan → schedule follow-up → discharge.','Export a report → show rejected invalid or unauthorized requests.','Explain the model, tests, commits and future production work.'])
s=slide('Clarity across the care journey.','CONCLUSION')
text(s,.75,3.2,11.5,1.4,'CareFlow connects resources, patient records,\nand discharge planning in one working application.',30,GREEN,True)
text(s,.75,5.15,11.5,1,'A practical .NET full-stack foundation.\nReal clinical outcomes remain a future validation task.',21,MUTED)
r.save(ROOT/'docs/CareFlow-Presentation.pptx')
print(f'Created {len(r.slides)} slides: docs/CareFlow-Presentation.pptx')
