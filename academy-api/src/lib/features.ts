export const features = {
	lms: process.env.FEATURE_LMS === 'true',
	attendanceScanner: process.env.FEATURE_ATTENDANCE_SCANNER === 'true',
	reports: process.env.FEATURE_REPORTS === 'true',
	credits: process.env.FEATURE_CREDITS === 'true',
};
