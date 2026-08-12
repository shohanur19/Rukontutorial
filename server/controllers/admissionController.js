const Admission = require('../models/Admission');
const Batch = require('../models/Batch');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const User = require('../models/User');
const { calculatePaymentStatus, generateStudentId } = require('../utils/helpers');

const currentMonth = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const populateAdmission = (query) =>
  query
    .populate('applicantUserId', 'name email')
    .populate('batchId')
    .populate('linkedStudentId')
    .populate('approvedBy', 'name email');

const normalizePaymentProvider = (provider) => (provider || '').toLowerCase();
const VALID_PAYMENT_PROVIDERS = ['bkash', 'rocket', 'nagad', 'bank'];

exports.getAdmissions = async (req, res, next) => {
  try {
    const { search, status, paymentStatus, batchId, page = 1, limit = 100 } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (paymentStatus) filter.paymentStatus = paymentStatus;
    if (batchId) filter.batchId = batchId;
    if (search) {
      const regex = { $regex: search, $options: 'i' };
      filter.$or = [
        { studentName: regex },
        { studentPhone: regex },
        { transactionId: regex },
        { batchName: regex },
        { courseName: regex },
        { interestedBatch: regex },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [admissions, count] = await Promise.all([
      populateAdmission(Admission.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit))),
      Admission.countDocuments(filter),
    ]);

    res.json({ success: true, count, data: admissions });
  } catch (error) {
    next(error);
  }
};

exports.getMyAdmissions = async (req, res, next) => {
  try {
    const admissions = await populateAdmission(
      Admission.find({ applicantUserId: req.user._id }).sort({ createdAt: -1 })
    );
    res.json({ success: true, count: admissions.length, data: admissions });
  } catch (error) {
    next(error);
  }
};

exports.createAdmission = async (req, res, next) => {
  try {
    const {
      batchId,
      studentName,
      studentPhone,
      guardianPhone,
      classLevel,
      schoolCollege,
      interestedBatch,
      address,
      message,
      paymentOption = 'pay_later',
      paymentProvider,
      centerAccountNumber,
      senderAccountNumber,
      transactionId,
      paidAmount,
      paymentDate,
      paymentNote,
    } = req.body;

    if (!studentName || !studentPhone) {
      return res.status(400).json({ success: false, message: 'Student name and phone are required' });
    }
    if (!batchId && !interestedBatch) {
      return res.status(400).json({ success: false, message: 'Please select a batch or course' });
    }

    let batch = null;
    if (batchId) {
      batch = await Batch.findById(batchId);
      if (!batch || batch.status !== 'active') {
        return res.status(400).json({ success: false, message: 'Selected batch is not available' });
      }
    }

    const duplicateFilter = {
      applicantUserId: req.user._id,
      status: 'pending',
      ...(batchId ? { batchId } : { interestedBatch }),
    };
    const duplicate = await Admission.findOne(duplicateFilter);
    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: 'You already have a pending admission request for this batch or course',
      });
    }

    let provider = normalizePaymentProvider(paymentProvider);
    let receivingAccount = null;
    if (batch) {
      const activeAccounts = (batch.paymentAccounts || []).filter((account) => account.isActive);
      receivingAccount =
        activeAccounts.find((account) => account.provider === provider) ||
        activeAccounts[0] ||
        null;
      provider = receivingAccount?.provider || provider;
    }
    const wantsToPayNow = paymentOption === 'pay_now';
    if (wantsToPayNow && !VALID_PAYMENT_PROVIDERS.includes(provider)) {
      return res.status(400).json({
        success: false,
        message: 'Payment provider must be bKash, Rocket, Nagad, or Bank',
      });
    }
    if (wantsToPayNow && (!provider || !senderAccountNumber || !transactionId || Number(paidAmount) <= 0)) {
      return res.status(400).json({
        success: false,
        message: 'Payment provider, sender number, transaction ID, and paid amount are required for pay now',
      });
    }

    const payableAmount = batch ? Number(batch.courseFee || 0) : Number(req.body.payableAmount || 0);
    const normalizedPaidAmount = wantsToPayNow ? Number(paidAmount || 0) : 0;
    const dueAmount = Math.max(0, payableAmount - normalizedPaidAmount);

    const admission = await Admission.create({
      applicantUserId: req.user._id,
      batchId: batch?._id || null,
      courseName: batch?.subject || req.body.courseName || '',
      batchName: batch?.name || interestedBatch || '',
      studentName,
      studentPhone,
      guardianPhone: guardianPhone || '',
      classLevel: batch?.classLevel || classLevel || '',
      schoolCollege,
      interestedBatch: batch?.name || interestedBatch || '',
      address,
      message,
      paymentOption: wantsToPayNow ? 'pay_now' : 'pay_later',
      paymentStatus: wantsToPayNow ? 'payment_submitted' : 'not_paid',
      paymentMethod: provider,
      paymentProvider: provider,
      centerAccountNumber: receivingAccount?.accountNumber || centerAccountNumber || '',
      senderAccountNumber: wantsToPayNow ? senderAccountNumber : '',
      transactionId: wantsToPayNow ? transactionId : '',
      payableAmount,
      paidAmount: normalizedPaidAmount,
      dueAmount,
      paymentDate: wantsToPayNow ? paymentDate || Date.now() : null,
      paymentNote,
    });

    const populated = await populateAdmission(Admission.findById(admission._id));
    res.status(201).json({ success: true, data: populated, message: 'Admission request submitted successfully' });
  } catch (error) {
    next(error);
  }
};

exports.approveAdmission = async (req, res, next) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });

    if (admission.status === 'approved') {
      const existingApproved = await populateAdmission(Admission.findById(admission._id));
      return res.json({ success: true, data: existingApproved, message: 'Admission is already approved' });
    }
    if (admission.status !== 'pending' && admission.status !== 'reviewed') {
      return res.status(400).json({ success: false, message: 'Only pending or reviewed admissions can be approved' });
    }

    const user = await User.findById(admission.applicantUserId);
    if (!user) return res.status(404).json({ success: false, message: 'Applicant user not found' });

    let student = await Student.findOne({ userId: user._id });
    if (!student) {
      const studentId = await generateStudentId(Student);
      student = await Student.create({
        studentId,
        userId: user._id,
        name: admission.studentName || user.name,
        phone: admission.studentPhone,
        guardianPhone: admission.guardianPhone || admission.studentPhone,
        classLevel: admission.classLevel || 'N/A',
        schoolCollege: admission.schoolCollege || '',
        address: admission.address || '',
        batchId: admission.batchId || null,
        admissionDate: Date.now(),
        status: 'active',
      });
    } else {
      student.name = admission.studentName || student.name;
      student.phone = admission.studentPhone || student.phone;
      student.guardianPhone = admission.guardianPhone || student.guardianPhone || admission.studentPhone;
      student.classLevel = admission.classLevel || student.classLevel;
      student.schoolCollege = admission.schoolCollege || student.schoolCollege;
      student.address = admission.address || student.address;
      if (admission.batchId) student.batchId = admission.batchId;
      student.status = 'active';
      await student.save();
    }

    const payableAmount = Number(admission.payableAmount || 0);
    const paidAmount = Number(admission.paidAmount || 0);
    const { dueAmount, status: paymentRecordStatus } = calculatePaymentStatus(payableAmount, paidAmount);

    if (admission.batchId && payableAmount > 0) {
      await Payment.findOneAndUpdate(
        { admissionId: admission._id },
        {
          studentId: student._id,
          batchId: admission.batchId,
          admissionId: admission._id,
          month: currentMonth(),
          payableAmount,
          paidAmount,
          dueAmount,
          status: paymentRecordStatus,
          paymentMethod: VALID_PAYMENT_PROVIDERS.includes(admission.paymentProvider)
            ? admission.paymentProvider
            : 'bkash',
          senderAccountNumber: admission.senderAccountNumber || '',
          centerAccountNumber: admission.centerAccountNumber || '',
          transactionId: admission.transactionId || '',
          note: admission.paymentNote || (paidAmount > 0 ? 'Admission payment submitted' : 'Admission due created'),
          paymentDate: admission.paymentDate || Date.now(),
        },
        { new: true, upsert: true, runValidators: true }
      );
    }

    admission.status = 'approved';
    admission.paymentStatus = paidAmount >= payableAmount && payableAmount > 0 ? 'paid' : paidAmount > 0 ? 'payment_submitted' : 'due';
    admission.dueAmount = dueAmount;
    admission.approvedBy = req.user._id;
    admission.approvedAt = Date.now();
    admission.linkedStudentId = student._id;
    await admission.save();

    const populated = await populateAdmission(Admission.findById(admission._id));
    res.json({ success: true, data: populated, message: 'Admission approved and student linked' });
  } catch (error) {
    next(error);
  }
};

exports.rejectAdmission = async (req, res, next) => {
  try {
    const admission = await Admission.findById(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });
    if (admission.status === 'approved') {
      return res.status(400).json({ success: false, message: 'Approved admissions cannot be rejected' });
    }

    admission.status = 'rejected';
    admission.paymentStatus = admission.paidAmount > 0 ? 'rejected' : admission.paymentStatus;
    admission.rejectedReason = req.body.rejectedReason || req.body.reason || '';
    await admission.save();

    const populated = await populateAdmission(Admission.findById(admission._id));
    res.json({ success: true, data: populated, message: 'Admission rejected' });
  } catch (error) {
    next(error);
  }
};

exports.updateAdmission = async (req, res, next) => {
  try {
    const admission = await Admission.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });
    res.json({ success: true, data: admission });
  } catch (error) {
    next(error);
  }
};

exports.deleteAdmission = async (req, res, next) => {
  try {
    const admission = await Admission.findByIdAndDelete(req.params.id);
    if (!admission) return res.status(404).json({ success: false, message: 'Admission not found' });
    res.json({ success: true, message: 'Admission deleted' });
  } catch (error) {
    next(error);
  }
};
