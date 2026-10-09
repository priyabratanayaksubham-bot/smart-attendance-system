# Smart Attendance — Django + Face Recognition

A Django/SQLite attendance application that captures face descriptors in the browser with face-api.js and compares them against registered students.

## Included features
- Student registration with name, roll number, email and face capture
- Browser webcam camera access and face descriptor capture
- Face matching against registered students
- One attendance record per student per day
- Recognition distance and threshold shown for failed matches
- Dashboard, student directory, attendance history and Django admin

## Run on Windows

Open PowerShell in this folder (the folder containing `manage.py`) and run:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Then open `http://127.0.0.1:8000/`. Allow camera permission in your browser.

If PowerShell blocks virtual-environment activation, you can skip activation and use `venv\Scripts\python.exe -m pip install -r requirements.txt`, followed by `venv\Scripts\python.exe manage.py migrate` and `venv\Scripts\python.exe manage.py runserver`.

## Face recognition notes
- Registration and attendance must use the same face-api.js model pipeline. If you change models, re-register faces.
- The face-api.js library and model files are loaded from external URLs, so an internet connection is needed the first time and whenever they are not cached.
- The browser camera works on `localhost`/`127.0.0.1` or an HTTPS site, and the browser must be allowed to access the camera.
- The Euclidean matching threshold is set to `0.60` in `attendance/views.py`. This can help when `0.48` was too strict, but a higher threshold can increase false matches. Test with your own users and lower it if different people are matched.
- Existing SQLite data is included in `db.sqlite3`; back it up before deleting or replacing it.

## Before production
Change `SECRET_KEY`, set `DEBUG=False`, configure specific `ALLOWED_HOSTS`, serve over HTTPS, restrict access to biometric descriptors, and configure a production database.
