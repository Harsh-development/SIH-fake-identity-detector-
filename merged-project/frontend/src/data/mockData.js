export const stats = [
  { label: 'Documents Scanned', value: '4,812', delta: '+186 today', trend: 'up' },
  { label: 'Pending Review', value: '37', delta: '12 flagged > 4h', trend: 'flat' },
  { label: 'High Risk Cases', value: '9', delta: '+3 this week', trend: 'down' },
  { label: 'Model Accuracy', value: '98.4%', delta: '+0.2% vs last month', trend: 'up' },
];

export const riskScore = {
  value: 42,
  band: 'Moderate',
  reasons: [
    { label: 'Font kerning inconsistency', weight: 'medium' },
    { label: 'Face match confidence 91.2%', weight: 'low' },
    { label: 'MRZ checksum verified', weight: 'low' },
  ],
};

export const latestScan = {
  docId: 'DOC-88213-IN',
  docType: 'Passport · Republic of India',
  submittedAt: '22 Aug 2026, 14:02 IST',
  officer: 'SSB-102',
  thumbnailLabel: 'Front · Photo page',
  status: 'Awaiting officer decision',
};

export const extractedInfo = [
  { field: 'Full Name', value: 'ANITA R. DESHMUKH' },
  { field: 'Document No.', value: 'M4821730' },
  { field: 'Date of Birth', value: '14 Mar 1994' },
  { field: 'Nationality', value: 'INDIAN' },
  { field: 'Date of Issue', value: '02 Jul 2022' },
  { field: 'Date of Expiry', value: '01 Jul 2032' },
  { field: 'MRZ Checksum', value: 'PASS' },
];

export const aiVerification = [
  { check: 'Document authenticity', result: 'Pass', confidence: 96 },
  { check: 'Face match to photo page', result: 'Pass', confidence: 91 },
  { check: 'Font & layout consistency', result: 'Review', confidence: 74 },
  { check: 'Hologram / security thread', result: 'Pass', confidence: 88 },
  { check: 'Data cross-reference (MRZ)', result: 'Pass', confidence: 99 },
];

export const tamperingAnalysis = {
  overallFlag: 'Low anomaly',
  regions: [
    { area: 'Photo boundary', anomalyScore: 8 },
    { area: 'Name field text', anomalyScore: 34 },
    { area: 'Issue date block', anomalyScore: 6 },
    { area: 'Security laminate', anomalyScore: 12 },
  ],
};

export const faceVerification = {
  matchScore: 91.2,
  livenessCheck: 'Passed',
  spoofAttempt: 'None detected',
  landmarksMatched: 68,
};

export const timeline = [
  { time: '14:02', event: 'Document uploaded by kiosk K-04' },
  { time: '14:02', event: 'OCR extraction completed' },
  { time: '14:03', event: 'Tampering analysis completed — 2 flags raised' },
  { time: '14:03', event: 'Face match executed against photo page' },
  { time: '14:04', event: 'Routed to Officer SSB-102 for manual review' },
];

export const caseDetails = {
  caseId: 'CASE-2026-88213',
  priority: 'Medium',
  assignedOfficer: 'SSB-102',
  location: 'Jabalpur Immigration Checkpoint',
  notes: 'Name field shows minor font-kerning deviation; recommend secondary inspection before clearance.',
};

export const recentHistory = [
  { id: 'DOC-88213-IN', type: 'Passport', time: '14:02', risk: 42, status: 'Review' },
  { id: 'DOC-88209-IN', type: 'Aadhaar', time: '13:47', risk: 12, status: 'Cleared' },
  { id: 'DOC-88201-IN', type: 'Driving Licence', time: '13:22', risk: 78, status: 'High Risk' },
  { id: 'DOC-88197-IN', type: 'Passport', time: '12:58', risk: 20, status: 'Cleared' },
  { id: 'DOC-88188-IN', type: 'Voter ID', time: '12:41', risk: 55, status: 'Review' },
  { id: 'DOC-88176-IN', type: 'Passport', time: '11:59', risk: 9, status: 'Cleared' },
];

export const riskDistribution = [
  { name: 'Low', value: 68, color: '#33D6A0' },
  { name: 'Moderate', value: 24, color: '#F2B84B' },
  { name: 'High', value: 8, color: '#F2495C' },
];
