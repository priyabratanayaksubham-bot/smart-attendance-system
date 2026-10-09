from django.contrib import admin
from django.urls import path
from attendance import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', views.dashboard, name='dashboard'),
    path('register/', views.register_student, name='register_student'),
    path('attendance/', views.mark_attendance, name='mark_attendance'),
    path('students/', views.students, name='students'),
    path('records/', views.records, name='records'),
    path('api/students/', views.student_api, name='student_api'),
    path('api/attendance/', views.attendance_api, name='attendance_api'),
]
