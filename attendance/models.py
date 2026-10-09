from django.db import models

class Student(models.Model):
    name = models.CharField(max_length=120)
    roll_number = models.CharField(max_length=50, unique=True)
    email = models.EmailField(blank=True)
    face_descriptor = models.JSONField(default=list)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.name} ({self.roll_number})'

class Attendance(models.Model):
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendance')
    attendance_date = models.DateField(auto_now_add=True)
    marked_at = models.DateTimeField(auto_now_add=True)
    confidence = models.FloatField(default=0)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['student', 'attendance_date'], name='one_attendance_per_day')]
        ordering = ['-marked_at']

    def __str__(self):
        return f'{self.student.name} - {self.attendance_date}'
