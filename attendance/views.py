import json
import math
from datetime import date
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.contrib import messages
from django.db import IntegrityError
from django.http import JsonResponse
from django.shortcuts import render, redirect
from .models import Student, Attendance

# face-api.js 128-value descriptors commonly use a Euclidean threshold near 0.6.
# Lower this if you observe false matches; raise only cautiously.
MATCH_THRESHOLD = 0.60

def dashboard(request):
    today = date.today()
    context = {
        'student_count': Student.objects.count(),
        'today_count': Attendance.objects.filter(attendance_date=today).count(),
        'absent_count': max(Student.objects.count() - Attendance.objects.filter(attendance_date=today).count(), 0),
        'recent': Attendance.objects.select_related('student')[:8],
    }
    return render(request, 'attendance/dashboard.html', context)

def register_student(request):
    if request.method == 'POST':
        name = request.POST.get('name', '').strip()
        roll = request.POST.get('roll_number', '').strip()
        email = request.POST.get('email', '').strip()
        descriptor_raw = request.POST.get('face_descriptor', '')
        try:
            descriptor = json.loads(descriptor_raw)
        except Exception:
            descriptor = []
        if not name or not roll or not isinstance(descriptor, list) or len(descriptor) != 128:
            messages.error(request, 'Please provide student details and capture a valid face.')
        elif Student.objects.filter(roll_number=roll).exists():
            messages.error(request, 'That roll number is already registered.')
        else:
            Student.objects.create(name=name, roll_number=roll, email=email, face_descriptor=descriptor)
            messages.success(request, f'{name} registered successfully.')
            return redirect('students')
    return render(request, 'attendance/register.html')

@ensure_csrf_cookie
def mark_attendance(request):
    return render(request, 'attendance/mark_attendance.html')

def students(request):
    return render(request, 'attendance/students.html', {'students': Student.objects.all()})

def records(request):
    qs = Attendance.objects.select_related('student')
    selected_date = request.GET.get('date')
    if selected_date:
        qs = qs.filter(attendance_date=selected_date)
    return render(request, 'attendance/records.html', {'records': qs, 'selected_date': selected_date or ''})

def distance(a, b):
    if not isinstance(a, list) or not isinstance(b, list) or len(a) != 128 or len(b) != 128:
        return 999.0
    try:
        values = [(float(x) - float(y)) ** 2 for x, y in zip(a, b)]
    except (TypeError, ValueError):
        return 999.0
    if not all(math.isfinite(value) for value in values):
        return 999.0
    return math.sqrt(sum(values))

def student_api(request):
    if request.method != 'GET': return JsonResponse({'error': 'GET only'}, status=405)
    data = [{'id': s.id, 'name': s.name, 'roll_number': s.roll_number, 'descriptor': s.face_descriptor} for s in Student.objects.all()]
    return JsonResponse({'students': data})

def attendance_api(request):
    if request.method != 'POST': return JsonResponse({'error': 'POST only'}, status=405)
    try:
        body = json.loads(request.body)
        descriptor = body.get('descriptor', [])
    except Exception:
        return JsonResponse({'error': 'Invalid JSON'}, status=400)
    if not isinstance(descriptor, list) or len(descriptor) != 128:
        return JsonResponse({'error': 'Invalid face descriptor. Please scan again.'}, status=400)
    if not Student.objects.exists():
        return JsonResponse({
            'success': False,
            'error': 'No students are registered yet. Register a student and capture their face first.',
            'distance': None,
            'threshold': MATCH_THRESHOLD,
        }, status=404)
    best = None
    best_distance = 999
    for student in Student.objects.all():
        d = distance(descriptor, student.face_descriptor)
        if d < best_distance:
            best_distance, best = d, student
    if not best or best_distance > MATCH_THRESHOLD:
        return JsonResponse({
            'success': False,
            'error': 'Face not recognized. Try better lighting, face the camera directly, or register this student again.',
            'distance': round(best_distance, 4),
            'threshold': MATCH_THRESHOLD,
        }, status=404)
    confidence = max(0, min(100, (1 - best_distance / MATCH_THRESHOLD) * 100))
    try:
        record = Attendance.objects.create(student=best, confidence=confidence)
    except IntegrityError:
        return JsonResponse({'success': False, 'duplicate': True, 'message': f'{best.name} is already marked present today.'}, status=409)
    return JsonResponse({'success': True, 'student': best.name, 'roll_number': best.roll_number, 'confidence': round(confidence, 1), 'marked_at': record.marked_at.strftime('%d %b %Y, %I:%M %p')})
