require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const User = require('../models/User');
const Student = require('../models/Student');
const Batch = require('../models/Batch');
const Notice = require('../models/Notice');
const Material = require('../models/Material');
const Payment = require('../models/Payment');
const Exam = require('../models/Exam');
const Result = require('../models/Result');
const Teacher = require('../models/Teacher');
const Admission = require('../models/Admission');
const Attendance = require('../models/Attendance');
const { calculateGrade, calculatePaymentStatus } = require('../utils/helpers');

const seedData = async () => {
  try {
    await connectDB();

    await Promise.all([
      User.deleteMany(),
      Student.deleteMany(),
      Batch.deleteMany(),
      Notice.deleteMany(),
      Material.deleteMany(),
      Payment.deleteMany(),
      Exam.deleteMany(),
      Result.deleteMany(),
      Teacher.deleteMany(),
      Admission.deleteMany(),
      Attendance.deleteMany(),
    ]);

    console.log('Database cleared');

    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@rukons.com',
      password: 'admin123',
      role: 'admin',
      status: 'active',
    });

    const batches = await Batch.insertMany([
      {
        name: 'Class 9 Math Batch A',
        classLevel: 'Class 9',
        subject: 'Mathematics',
        teacherName: 'Rukon Ahmed',
        schedule: 'Sat, Mon, Wed',
        time: '4:00 PM - 6:00 PM',
        room: 'Room 101',
        courseFee: 1500,
        paymentInstructions: 'Send the monthly fee before submitting admission payment details.',
        paymentAccounts: [{ provider: 'bkash', accountNumber: '01341703221', accountName: "Rukon's Tutorial" }],
        status: 'active',
      },
      {
        name: 'SSC Physics',
        classLevel: 'Class 10',
        subject: 'Physics',
        teacherName: 'Karim Uddin',
        schedule: 'Sun, Tue, Thu',
        time: '5:00 PM - 7:00 PM',
        room: 'Room 102',
        courseFee: 1800,
        paymentInstructions: 'Use the listed receiving account and keep your transaction ID.',
        paymentAccounts: [{ provider: 'rocket', accountNumber: '01341703221', accountName: "Rukon's Tutorial" }],
        status: 'active',
      },
      {
        name: 'HSC Chemistry',
        classLevel: 'Class 12',
        subject: 'Chemistry',
        teacherName: 'Fatima Begum',
        schedule: 'Fri, Sat, Mon',
        time: '6:00 PM - 8:00 PM',
        room: 'Room 103',
        courseFee: 2000,
        paymentInstructions: 'Send payment to the receiving account before approval.',
        paymentAccounts: [{ provider: 'nagad', accountNumber: '01341703221', accountName: "Rukon's Tutorial" }],
        status: 'active',
      },
      {
        name: 'Admission Preparation',
        classLevel: 'HSC',
        subject: 'Combined Science',
        teacherName: 'Rukon Ahmed',
        schedule: 'Daily',
        time: '7:00 AM - 9:00 AM',
        room: 'Main Hall',
        courseFee: 2500,
        paymentInstructions: 'Bank transfer is accepted for this batch.',
        paymentAccounts: [{ provider: 'bank', accountNumber: 'AC-123456789', accountName: "Rukon's Tutorial" }],
        status: 'active',
      },
    ]);

    const studentUsers = [];
    const students = [];
    const studentData = [
      { name: 'Arif Hossain', email: 'arif@rukons.com', phone: '01711111111', classLevel: 'Class 9', batchIdx: 0 },
      { name: 'Sadia Akter', email: 'sadia@rukons.com', phone: '01722222222', classLevel: 'Class 10', batchIdx: 1 },
      { name: 'Rahim Khan', email: 'rahim@rukons.com', phone: '01733333333', classLevel: 'Class 12', batchIdx: 2 },
      { name: 'Nusrat Jahan', email: 'nusrat@rukons.com', phone: '01744444444', classLevel: 'HSC', batchIdx: 3 },
      { name: 'Imran Hasan', email: 'imran@rukons.com', phone: '01755555555', classLevel: 'Class 9', batchIdx: 0 },
    ];

    for (let i = 0; i < studentData.length; i++) {
      const s = studentData[i];
      const user = await User.create({
        name: s.name,
        email: s.email,
        password: 'student123',
        role: 'student',
        status: 'active',
      });
      studentUsers.push(user);

      const student = await Student.create({
        studentId: `RT25${String(i + 1).padStart(4, '0')}`,
        userId: user._id,
        name: s.name,
        phone: s.phone,
        guardianPhone: `018${String(i + 1).repeat(8).slice(0, 8)}`,
        classLevel: s.classLevel,
        schoolCollege: 'Katiadi Pilot High School',
        address: 'Katiadi, Kishoreganj',
        batchId: batches[s.batchIdx]._id,
        admissionDate: new Date('2025-01-15'),
        status: 'active',
      });
      students.push(student);
    }

    await Teacher.insertMany([
      {
        name: 'Rukon Ahmed',
        subject: 'Mathematics & Physics',
        bio: 'Founder and head instructor with 10+ years of teaching experience in board exam preparation.',
        photo: '/images/teacher-1.png',
        order: 1,
      },
      {
        name: 'Karim Uddin',
        subject: 'Physics',
        bio: 'Specialist in SSC and HSC Physics with excellent track record of A+ results.',
        photo: '/images/teacher-2.png',
        order: 2,
      },
      {
        name: 'Fatima Begum',
        subject: 'Chemistry & Biology',
        bio: 'Experienced science teacher focusing on concept-based learning for HSC candidates.',
        photo: '/images/teacher-placeholder.jpg',
        order: 3,
      },
    ]);

    await Notice.insertMany([
      {
        title: 'Welcome to New Academic Session 2025',
        description: 'Classes will begin from January 15, 2025. All students are requested to collect their routine from the office.',
        targetType: 'public',
        status: 'published',
        noticeImageUrl: '/images/classroom.jpeg',
      },
      {
        title: 'Monthly Test Schedule',
        description: 'Monthly test for all batches will be held on the last Saturday of this month. Please prepare accordingly.',
        targetType: 'all',
        status: 'published',
      },
      {
        title: 'Class 9 Math - Extra Class',
        description: 'Extra revision class this Friday at 4 PM for Class 9 Math Batch A students.',
        targetType: 'batch',
        batchId: batches[0]._id,
        status: 'published',
      },
    ]);

    await Material.insertMany([
      {
        title: 'Algebra Chapter 1 Notes',
        type: 'pdf',
        subject: 'Mathematics',
        batchId: batches[0]._id,
        url: 'https://drive.google.com/file/d/example1/view',
        description: 'Complete notes on algebraic expressions',
      },
      {
        title: 'Physics Motion Lecture',
        type: 'recorded_class',
        subject: 'Physics',
        batchId: batches[1]._id,
        url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        description: 'Recorded class on motion and velocity',
      },
      {
        title: 'Chemistry Organic Assignment',
        type: 'assignment',
        subject: 'Chemistry',
        batchId: batches[2]._id,
        url: 'https://drive.google.com/file/d/example2/view',
        description: 'Submit by next Sunday',
      },
      {
        title: 'Model Test 1 - Admission Prep',
        type: 'model_test',
        subject: 'Combined Science',
        batchId: batches[3]._id,
        url: 'https://drive.google.com/file/d/example3/view',
        description: 'Full syllabus model test paper',
      },
    ]);

    const currentMonth = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const prevMonth = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}`;

    for (let i = 0; i < students.length; i++) {
      const batch = batches[studentData[i].batchIdx];
      const { dueAmount, status } = calculatePaymentStatus(batch.courseFee, i % 3 === 0 ? batch.courseFee : i % 3 === 1 ? batch.courseFee / 2 : 0);

      await Payment.create({
        studentId: students[i]._id,
        batchId: batch._id,
        month: currentMonth,
        payableAmount: batch.courseFee,
        paidAmount: i % 3 === 0 ? batch.courseFee : i % 3 === 1 ? batch.courseFee / 2 : 0,
        dueAmount,
        status,
        paymentMethod: i % 2 === 0 ? 'bkash' : 'nagad',
        note: 'Monthly tuition fee',
      });

      await Payment.create({
        studentId: students[i]._id,
        batchId: batch._id,
        month: prevMonth,
        payableAmount: batch.courseFee,
        paidAmount: batch.courseFee,
        dueAmount: 0,
        status: 'paid',
        paymentMethod: 'bank',
      });
    }

    const exam = await Exam.create({
      title: 'Monthly Test - January',
      batchId: batches[0]._id,
      subject: 'Mathematics',
      totalMarks: 100,
      examDate: new Date('2025-01-25'),
    });

    const examResults = [
      { marks: 85, studentIdx: 0 },
      { marks: 72, studentIdx: 4 },
    ];

    for (const r of examResults) {
      const percentage = Math.round((r.marks / 100) * 100);
      await Result.create({
        examId: exam._id,
        studentId: students[r.studentIdx]._id,
        marks: r.marks,
        percentage,
        grade: calculateGrade(percentage),
        remarks: percentage >= 80 ? 'Excellent' : 'Good',
      });
    }

    const exam2 = await Exam.create({
      title: 'Physics Monthly Test',
      batchId: batches[1]._id,
      subject: 'Physics',
      totalMarks: 50,
      examDate: new Date('2025-01-20'),
    });

    const pct = Math.round((42 / 50) * 100);
    await Result.create({
      examId: exam2._id,
      studentId: students[1]._id,
      marks: 42,
      percentage: pct,
      grade: calculateGrade(pct),
      remarks: 'Very Good',
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    await Attendance.create({
      batchId: batches[0]._id,
      date: today,
      records: [
        { studentId: students[0]._id, status: 'present' },
        { studentId: students[4]._id, status: 'present' },
      ],
    });

    await Attendance.create({
      batchId: batches[0]._id,
      date: yesterday,
      records: [
        { studentId: students[0]._id, status: 'present' },
        { studentId: students[4]._id, status: 'absent' },
      ],
    });

    // await Admission.insertMany([
    //   {
    //     studentName: 'Tanvir Ahmed',
    //     studentPhone: '01912345678',
    //     guardianPhone: '01812345678',
    //     classLevel: 'Class 10',
    //     schoolCollege: 'Katiadi Govt High School',
    //     interestedBatch: 'SSC Physics',
    //     address: 'Katiadi, Kishoreganj',
    //     message: 'Interested in admission for SSC preparation',
    //     status: 'pending',
    //   },
    //   {
    //     studentName: 'Mim Akter',
    //     studentPhone: '01987654321',
    //     guardianPhone: '01887654321',
    //     classLevel: 'Class 9',
    //     schoolCollege: 'Local High School',
    //     interestedBatch: 'Class 9 Math Batch A',
    //     address: 'Purbapara, Katiadi',
    //     message: 'Want to join math batch',
    //     status: 'pending',
    //   },
    // ]);

    console.log('\n========== SEED DATA CREATED ==========');
    console.log('\nAdmin Login:');
    console.log('  Email: admin@rukons.com');
    console.log('  Password: admin123');
    console.log('\nStudent Logins (password: student123 for all):');
    studentData.forEach((s) => console.log(`  Email: ${s.email}`));
    console.log('\n=======================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Seed error:', error);
    process.exit(1);
  }
};

seedData();
