"""Production bootstrap and restart checks against a disposable, empty PostgreSQL DB.

Build Release first. Set ConnectionStrings__Hospital to the test database and
optionally DOTNET to the dotnet executable. Never use a live database here.
The loopback HTTP transport simulates Render's HTTPS-terminating ingress.
"""
import json
import os
from pathlib import Path
from http.cookies import SimpleCookie
import socket
import subprocess
import tempfile
import time
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / 'src/CareFlow.Api'
assert os.environ.get('ConnectionStrings__Hospital'), 'Set the disposable PostgreSQL connection string.'
with socket.socket() as sock:
    sock.bind(('127.0.0.1', 0))
    PORT = sock.getsockname()[1]
BASE = f'http://127.0.0.1:{PORT}'
cookies = {}
csrf = ''
env = {
    **os.environ,
    'ASPNETCORE_ENVIRONMENT': 'Production',
    'ASPNETCORE_URLS': BASE,
    'DatabaseProvider': 'PostgreSql',
    'RENDER': 'true',
    'InitializeDatabase': 'true',
    'Bootstrap__Email': ' Deploy.Test@Example.com ',
    'Bootstrap__Password': 'Disposable-test-password-2026!',
}


def call(path, method='GET', data=None, expected=200):
    headers = {'X-Forwarded-Proto': 'https', 'Content-Type': 'application/json',
               'Host': 'careflow-test.onrender.com'}
    if csrf:
        headers['X-CSRF-TOKEN'] = csrf
    if cookies:
        # Only this localhost test manually sends Secure cookies over the proxy hop.
        headers['Cookie'] = '; '.join(f'{k}={v}' for k, v in cookies.items())
    req = urllib.request.Request(BASE + path, method=method, headers=headers,
                                 data=None if data is None else json.dumps(data).encode())
    try:
        response = urllib.request.urlopen(req, timeout=5)
    except urllib.error.HTTPError as error:
        response = error
    with response:
        raw = response.read().decode()
        assert response.status == expected, f'{path}: {response.status}: {raw}'
        for header in response.headers.get_all('Set-Cookie', []):
            parsed = SimpleCookie()
            parsed.load(header)
            for key, morsel in parsed.items():
                cookies[key] = morsel.value
                if key == 'CareFlow.Session':
                    assert morsel['secure'] and morsel['httponly']
        result = json.loads(raw) if raw and response.headers.get_content_type() == 'application/json' else raw
        return result, response.headers


def start(log):
    process = subprocess.Popen(
        [os.environ.get('DOTNET', 'dotnet'), str(APP / 'bin/Release/net10.0/CareFlow.Api.dll')],
        cwd=APP, env=env, stdout=log, stderr=subprocess.STDOUT)
    try:
        for _ in range(120):
            if process.poll() is not None:
                raise AssertionError('Production server exited during startup')
            try:
                call('/health')
                return process
            except (urllib.error.URLError, TimeoutError):
                time.sleep(0.5)
        raise AssertionError('Production server did not become ready')
    except BaseException:
        stop(process)
        raise


def stop(process):
    process.terminate()
    try:
        process.wait(timeout=10)
    except subprocess.TimeoutExpired:
        process.kill()
        process.wait()


process = None
with tempfile.TemporaryFile(mode='w+t') as log:
    try:
        process = start(log)
        call('/api/patients', expected=401)
        call('/swagger/index.html', expected=404)
        csrf = call('/api/auth/csrf')[0]['token']
        call('/api/auth/login', 'POST', {
            'email': 'deploy.test@example.com', 'password': env['Bootstrap__Password'], 'role': 'Admin'})
        csrf = call('/api/auth/csrf')[0]['token']
        assert call('/api/auth/me')[0]['role'] == 'Admin'
        assert call('/api/patients')[0] == [], 'Use a fresh, disposable database'
        assert call('/api/hospital/lookups')[0]['demo'] is False
        assert 'max-age=' in call('/')[1]['Strict-Transport-Security']
        patient = call('/api/patients', 'POST', {
            'name': 'Production Test', 'medicalRecordNumber': 'PROD-CHECK-1',
            'dateOfBirth': '1990-01-01', 'sex': 'Other'}, expected=201)[0]
        assert patient['dateOfBirth'].startswith('1990-01-01')
        print('PASS Production bootstrap, normalized admin email, secure cookies, HTTPS ingress, and empty database')
        stop(process)
        process = None
        env['InitializeDatabase'] = 'false'
        del env['Bootstrap__Email']
        del env['Bootstrap__Password']
        process = start(log)
        assert call('/api/auth/me')[0]['role'] == 'Admin'
        assert call(f"/api/patients/{patient['id']}")[0]['name'] == 'Production Test'
        call(f"/api/patients/{patient['id']}", 'DELETE', expected=204)
        print('PASS Records, session cookie, and CSRF token survive restart without bootstrap secrets')
    except BaseException:
        log.seek(0)
        print(log.read())
        raise
    finally:
        if process is not None:
            stop(process)
