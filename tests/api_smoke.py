"""Real HTTP integration tests. Run against a development instance with synthetic data only."""
import json, urllib.request, urllib.error, http.cookiejar, os, uuid
from datetime import datetime, timezone, timedelta
BASE=os.getenv('CAREFLOW_URL','http://localhost:5080')
class Client:
 def __init__(self):
  self.opener=urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar())); self.token=''
 def call(self,path,method='GET',data=None,expected=200,csrf=True):
  req=urllib.request.Request(BASE+'/api/'+path, data=json.dumps(data).encode() if data is not None else None,method=method,headers={'Content-Type':'application/json',**({'X-CSRF-TOKEN':self.token} if csrf else {})})
  try:r=self.opener.open(req)
  except urllib.error.HTTPError as e:r=e
  raw=r.read().decode('utf-8-sig'); assert r.code==expected,f'{method} {path}: expected {expected}, got {r.code}: {raw}'
  try:return json.loads(raw) if raw else None
  except json.JSONDecodeError:return raw
 def login(self,email,role):
  self.token=self.call('auth/csrf')['token'];self.call('auth/login','POST',{'email':email,'password':'CareFlow@Demo2026!','role':role});self.token=self.call('auth/csrf')['token']
checks=[]
def ok(name):checks.append(name);print('PASS',name)
a=Client();a.call('patients',expected=401);ok('Anonymous patient access rejected')
a.login('admin@careflow.local','Admin');assert a.call('auth/me')['role']=='Admin';ok('Admin login and authenticated identity')
a.call('patients','POST',{},expected=400,csrf=False);ok('Missing CSRF token rejected')
a.call('patients','POST',{'name':'','medicalRecordNumber':'','dateOfBirth':'2100-01-01'},expected=400);ok('Invalid patient rejected')
s=Client();s.login('staff@careflow.local','User');s.call('beds',expected=403);s.call('hospital/export',expected=403);s.call('auth/users','POST',{'email':'x@example.com','name':'X','password':'long-enough-password','role':'Admin'},expected=403);ok('Staff cannot administer resources, export, or create admins')
uid=uuid.uuid4().hex[:8]
p={'name':'Integration Test','medicalRecordNumber':'TEST-'+uid,'dateOfBirth':'1990-01-01','sex':'Other','phone':'555-0123','conditions':''}
p=a.call('patients','POST',p,201);pid=p['id'];assert a.call('patients/'+str(pid))['name']=='Integration Test';p['name']='Integration Updated';a.call('patients/'+str(pid),'PUT',p);assert any(x['id']==pid for x in a.call('patients?search=Integration&sort=name'));ok('Patient create, read, update, and search')
a.call('patients','POST',{**p,'id':0},409);ok('Duplicate medical record number rejected')
lookup=a.call('hospital/lookups');admissions=a.call('admissions');busy={x['bedId'] for x in admissions if not x['dischargedAt']};free=next(b for b in lookup['beds'] if b['inService'] and b['id'] not in busy)
now=datetime.now(timezone.utc);ad={'patientId':pid,'bedId':free['id'],'admittedAt':(now-timedelta(hours=2)).isoformat(),'diagnosis':'Synthetic test','priority':'Routine'}
ad=a.call('admissions','POST',ad,201);aid=ad['id'];a.call('admissions','POST',{**ad,'id':0},400);ok('Admission created; overlapping admission rejected')
a.call('beds/'+str(free['id']),'PUT',{**free,'inService':False},400);ok('Occupied bed cannot go out of service')
note=a.call('notes','POST',{'admissionId':aid,'instructions':'Attend the follow-up arranged by your clinician.'},201)
draft=a.call('hospital/generate-plan','POST',{'admissionId':aid,'useAi':False});assert draft['source']=='Template' and 'Attend the follow-up' in draft['content'];ok('Template drafting preserves clinician instructions')
plan=a.call('plans','POST',{'admissionId':aid,'content':draft['content'],'source':draft['source'],'approved':False},201)
f=a.call('followups','POST',{'dischargePlanId':plan['id'],'scheduledAt':(now+timedelta(days=7)).isoformat(),'clinic':'Test clinic','completed':False},201)
f['completed']=True;a.call('followups/'+str(f['id']),'PUT',f);ok('Care plan and follow-up CRUD')
ad['dischargedAt']=now.isoformat();a.call('admissions/'+str(aid),'PUT',ad);assert a.call('admissions/'+str(aid))['dischargedAt'];ok('Discharge closes the admission')
metrics=a.call('hospital/analytics?days=30');assert len(metrics['series'])==30 and metrics['occupied']<=metrics['totalBeds'];ok('Analytics series and occupancy invariants')
assert 'Record number,Patient,Bed' in a.call('hospital/export');ok('CSV report generated')
count=len(a.call('patients'));a.call('hospital/import','POST',{'csv':'name,medicalRecordNumber,dateOfBirth,sex,phone\nValid,IMP-'+uid+',1990-01-01,Other,555\nInvalid,IMP-X,2999-01-01,Other,555'},400);assert len(a.call('patients'))==count;ok('CSV validation is atomic')
a.call('patients/'+str(pid),'DELETE',expected=409);ok('Related clinical history blocks patient deletion')
for path in ['followups/'+str(f['id']),'plans/'+str(plan['id']),'notes/'+str(note['id']),'admissions/'+str(aid),'patients/'+str(pid)]:a.call(path,'DELETE',expected=204)
ok('Dependent records and patient deleted in safe order')
a.call('auth/logout','POST',expected=204);a.call('patients',expected=401);ok('Logout invalidates session')
print(f'\n{len(checks)} integration checks passed.')
