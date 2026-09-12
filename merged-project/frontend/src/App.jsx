import { useState, useEffect, useRef } from 'react';

import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import StatCards from './components/StatCards';
import RiskScoreGauge from './components/RiskScoreGauge';
import LatestScanPanel from './components/LatestScanPanel';
import ExtractedInfoPanel from './components/ExtractedInfoPanel';
import AIVerificationPanel from './components/AIVerificationPanel';
import TamperingAnalysisPanel from './components/TamperingAnalysisPanel';
import FaceVerificationPanel from './components/FaceVerificationPanel';
import TimelinePanel from './components/TimelinePanel';
import DetailsPanel from './components/DetailsPanel';
import RecentHistoryPanel from './components/RecentHistoryPanel';
import RiskDistributionPanel from './components/RiskDistributionPanel';
import FaceDetector from './components/FaceDetector';
import { stats as mockStats } from './data/mockData';

const API_URL = 'http://127.0.0.1:8000';

// Maps the backend's risk recommendation to the status labels/colors
// the dashboard panels already know how to render.
const RECOMMENDATION_TO_STATUS = {
  Approve: 'Cleared',
  'Manual Review': 'Review',
  Reject: 'High Risk',
};

export default function App() {
  const [activeNav, setActiveNav] = useState('Home');
  const [activeTab, setActiveTab] = useState('Dashboard');

  const [faceDetectionResult, setFaceDetectionResult] = useState(null);

  const [documentFile, setDocumentFile] = useState(null);
  const [livePhotoFile, setLivePhotoFile] = useState(null);
  const [documentPreviewUrl, setDocumentPreviewUrl] = useState(null);

  const [verificationResult, setVerificationResult] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState('');

  // Session-only history of REAL verifications run against the
  // backend this session, newest first. Feeds RecentHistoryPanel
  // and the session stat counters below.
  const [history, setHistory] = useState([]);

  const previewUrlRef = useRef(null);

  // Revoke the object URL we create for the document preview when
  // it changes or the component unmounts, to avoid leaking memory.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }
    };
  }, []);

  const handleFaceResult = (result) => {
    setFaceDetectionResult(result);
  };

  const handleDocumentChange = (event) => {
    const file = event.target.files?.[0] || null;

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    let newPreviewUrl = null;

    // Object URLs only work for images; a PDF upload has no inline
    // preview, so leave the LatestScanPanel thumbnail placeholder.
    if (file && file.type.startsWith('image/')) {
      newPreviewUrl = URL.createObjectURL(file);
      previewUrlRef.current = newPreviewUrl;
    }

    setDocumentFile(file);
    setDocumentPreviewUrl(newPreviewUrl);
    setVerificationResult(null);
    setError('');
  };

  const handleLivePhotoChange = (event) => {
    const file = event.target.files?.[0] || null;

    setLivePhotoFile(file);
    setVerificationResult(null);
    setError('');
  };

  const handleVerify = async () => {
    setError('');
    setVerificationResult(null);

    if (!documentFile) {
      setError('Please select a government document first.');
      return;
    }

    if (!livePhotoFile) {
      setError('Please select a reference/live face photo.');
      return;
    }

    const formData = new FormData();

    // IMPORTANT:
    // These names must match FastAPI:
    // document: UploadFile
    // live_photo: UploadFile
    formData.append('document', documentFile);
    formData.append('live_photo', livePhotoFile);

    setIsVerifying(true);

    try {
      const response = await fetch(`${API_URL}/api/verify-document`, {
        method: 'POST',
        body: formData,
      });

      let data;

      try {
        data = await response.json();
      } catch {
        throw new Error('Backend returned an invalid response.');
      }

      if (!response.ok) {
        throw new Error(
          data?.detail || `Verification failed with status ${response.status}`
        );
      }

      setVerificationResult(data);

      // Record this real result in the session history feed.
      const status =
        RECOMMENDATION_TO_STATUS[data?.status] ||
        RECOMMENDATION_TO_STATUS[data?.summary?.recommendation] ||
        'Review';

      const historyRow = {
        id: data?.docId || data?.requestId || `DOC-${Date.now()}`,
        type: data?.docType || 'Government ID',
        time: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        risk:
          typeof data?.riskScore === 'number'
            ? Math.round(data.riskScore)
            : 0,
        status,
      };

      setHistory((prev) => [historyRow, ...prev].slice(0, 6));
    } catch (err) {
      console.error('Verification error:', err);

      setError(
        err?.message ||
          'Unable to connect to the verification backend.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const getFaceScore = () => {
    const face = verificationResult?.modules?.face_verification;

    if (!face) return null;

    const possibleValues = [
      face.score,
      face.similarity,
      face.similarity_score,
      face.confidence,
      face.match_score,
      face.match_percentage,
    ];

    const value = possibleValues.find(
      (item) => typeof item === 'number'
    );

    if (typeof value !== 'number') return null;

    // If backend returns 0-1, convert to percentage.
    if (value >= 0 && value <= 1) {
      return value * 100;
    }

    return value;
  };

  const getFaceStatus = () => {
    const face = verificationResult?.modules?.face_verification;

    if (!face) return 'UNKNOWN';

    return (
      face.status ||
      face.match_status ||
      face.recommendation ||
      'UNKNOWN'
    );
  };

  const getRiskScore = () => {
    const score = verificationResult?.riskScore;

    if (typeof score !== 'number') return 0;

    return score;
  };

  const faceScore = getFaceScore();
  const faceStatus = getFaceStatus();
  const riskScore = getRiskScore();

  // Shape the real backend face_verification result into the props
  // FaceVerificationPanel expects. Returns undefined (so the panel
  // falls back to its mock data) until a verification has run.
  const getFaceVerificationPanelData = () => {
    const face = verificationResult?.modules?.face_verification;

    if (!face) return undefined;

    return {
      matchScore:
        faceScore !== null ? Math.round(faceScore * 10) / 10 : 0,
      livenessCheck:
        face.liveness_check ||
        face.livenessCheck ||
        (face.is_live === true
          ? 'Passed'
          : face.is_live === false
          ? 'Failed'
          : 'Not checked'),
      spoofAttempt:
        face.spoof_attempt ||
        face.spoofAttempt ||
        (face.is_spoof ? 'Detected' : 'None detected'),
      landmarksMatched:
        face.landmarks_matched ?? face.landmarksMatched ?? '—',
    };
  };

  const faceVerificationPanelData = getFaceVerificationPanelData();

  // ==================================================================
  // Map the raw backend response into the props each dashboard panel
  // expects. Every function below returns `undefined` (letting the
  // panel fall back to its mock data) until a verification has run.
  // ==================================================================

  const getExtractedInfoRows = () => {
    const ocr = verificationResult?.modules?.ocr;

    if (!ocr) return undefined;

    const rows = [
      { field: 'Document Type', value: ocr.document_type || 'Unknown' },
      { field: 'Document No.', value: ocr.document_number || 'Not detected' },
      { field: 'Full Name', value: ocr.name || 'Not detected' },
      { field: 'Date of Birth', value: ocr.date_of_birth || 'Not detected' },
      {
        field: 'OCR Confidence',
        value:
          typeof ocr.ocr_confidence === 'number'
            ? `${ocr.ocr_confidence}%`
            : 'N/A',
      },
    ];

    if (ocr.raw_text) {
      const snippet =
        ocr.raw_text.length > 160
          ? `${ocr.raw_text.slice(0, 160)}…`
          : ocr.raw_text;

      rows.push({ field: 'Raw OCR Text', value: snippet || '—' });
    }

    return rows;
  };

  const getAIVerificationRows = () => {
    const modules = verificationResult?.modules;

    if (!modules) return undefined;

    const ocr = modules.ocr || {};
    const validation = modules.validation || {};
    const tampering = modules.tampering || {};

    const ocrConfidence =
      typeof ocr.ocr_confidence === 'number' ? ocr.ocr_confidence : 0;

    const validationConfidence = validation.is_valid
      ? 100
      : Math.max(0, 100 - (validation.issues?.length || 0) * 25);

    const tamperConfidence = Math.max(
      0,
      100 - (tampering.tamper_score || 0)
    );

    const faceConfidence = faceScore !== null ? faceScore : 0;

    return [
      {
        check: 'OCR Extraction',
        result: ocrConfidence >= 60 ? 'Pass' : 'Review',
        confidence: ocrConfidence,
      },
      {
        check: 'Document Validation',
        result: validation.is_valid ? 'Pass' : 'Review',
        confidence: validationConfidence,
      },
      {
        check: 'Tampering Check',
        result: tampering.risk_level === 'low' ? 'Pass' : 'Review',
        confidence: tamperConfidence,
      },
      {
        check: 'Face Verification',
        result: faceStatus === 'MATCH' ? 'Pass' : 'Review',
        confidence: faceConfidence,
      },
    ];
  };

  const getTamperingPanelData = () => {
    const tampering = verificationResult?.modules?.tampering;

    if (!tampering) return undefined;

    const riskLevel = tampering.risk_level || 'unknown';

    return {
      overallFlag: `${riskLevel} anomaly`.replace(/^\w/, (c) =>
        c.toUpperCase()
      ),
      regions: [
        {
          area: 'Error Level Analysis',
          anomalyScore: Math.round(tampering.tamper_score ?? 0),
        },
      ],
      notes: tampering.notes,
    };
  };

  const getTimelineData = () => {
    if (!verificationResult) return undefined;

    const modules = verificationResult.modules || {};
    const ocr = modules.ocr || {};
    const validation = modules.validation || {};
    const tampering = modules.tampering || {};
    const face = modules.face_verification || {};

    return [
      { time: 'Now', event: `Document uploaded: ${verificationResult.thumbnailLabel || documentFile?.name || 'document'}` },
      {
        time: 'Now',
        event: `OCR extraction completed — ${
          typeof ocr.ocr_confidence === 'number' ? `${ocr.ocr_confidence}% confidence` : 'no confidence data'
        }`,
      },
      {
        time: 'Now',
        event: `Document validation ${validation.is_valid ? 'passed' : `raised ${validation.issues?.length || 0} issue(s)`}`,
      },
      {
        time: 'Now',
        event: `Tampering analysis completed — ${tampering.risk_level || 'unknown'} risk (score ${Math.round(tampering.tamper_score ?? 0)})`,
      },
      {
        time: 'Now',
        event: `Face verification completed — ${face.match === true ? 'match' : face.match === false ? 'no match' : 'presence only'}`,
      },
      {
        time: 'Now',
        event: `Risk score calculated: ${Math.round(riskScore)}/100 — ${verificationResult.status || 'awaiting decision'}`,
      },
    ];
  };

  const getDetailsPanelData = () => {
    if (!verificationResult) return undefined;

    const validation = verificationResult.modules?.validation;

    let priority = 'Low';
    if (riskScore >= 70) priority = 'High';
    else if (riskScore >= 35) priority = 'Medium';

    const notes =
      validation?.issues?.length > 0
        ? validation.issues.join('; ')
        : `Recommendation: ${verificationResult.status || 'Awaiting officer decision'}.`;

    return {
      caseId: `CASE-${verificationResult.requestId || 'UNKNOWN'}`,
      priority,
      assignedOfficer: verificationResult.officer || 'Officer System',
      location: 'Verification Portal',
      notes,
    };
  };

  const getRiskDistributionData = () => {
    const breakdown = verificationResult?.riskBreakdown;

    if (!breakdown) return undefined;

    return [
      { name: 'Validation', value: Math.round(breakdown.validation_risk ?? 0), color: '#33D6A0' },
      { name: 'Tampering', value: Math.round(breakdown.tampering_risk ?? 0), color: '#F2B84B' },
      { name: 'Face Match', value: Math.round(breakdown.face_match_risk ?? 0), color: '#F2495C' },
    ];
  };

  const getRiskScoreGaugeData = () => {
    if (!verificationResult) return undefined;

    let band = 'Low';
    if (riskScore >= 67) band = 'High';
    else if (riskScore >= 34) band = 'Moderate';

    const reasons = [];
    const validation = verificationResult.modules?.validation;
    const tampering = verificationResult.modules?.tampering;

    if (validation?.issues?.length) {
      reasons.push({ label: validation.issues[0], weight: 'medium' });
    }

    if (tampering?.risk_level) {
      reasons.push({
        label: `Tampering risk: ${tampering.risk_level} (score ${Math.round(tampering.tamper_score ?? 0)})`,
        weight: tampering.risk_level === 'high' ? 'high' : tampering.risk_level === 'medium' ? 'medium' : 'low',
      });
    }

    if (faceScore !== null) {
      reasons.push({
        label: `Face match confidence ${Math.round(faceScore)}%`,
        weight: faceScore >= 80 ? 'low' : faceScore >= 50 ? 'medium' : 'high',
      });
    }

    if (reasons.length === 0) {
      reasons.push({ label: 'No risk signals reported', weight: 'low' });
    }

    return { value: Math.round(riskScore), band, reasons };
  };

  const getSessionStatsData = () => {
    if (history.length === 0) return undefined;

    const reviewCount = history.filter((h) => h.status === 'Review').length;
    const highRiskCount = history.filter((h) => h.status === 'High Risk').length;

    return [
      {
        ...mockStats[0],
        value: `${history.length} this session`,
        delta: `${history.length} scan(s) analyzed`,
        trend: 'up',
      },
      {
        ...mockStats[1],
        value: String(reviewCount),
        delta: `${reviewCount} flagged for review`,
        trend: 'flat',
      },
      {
        ...mockStats[2],
        value: String(highRiskCount),
        delta: `${highRiskCount} this session`,
        trend: highRiskCount > 0 ? 'down' : 'up',
      },
      mockStats[3],
    ];
  };

  const extractedInfoRows = getExtractedInfoRows();
  const aiVerificationRows = getAIVerificationRows();
  const tamperingPanelData = getTamperingPanelData();
  const timelineData = getTimelineData();
  const detailsPanelData = getDetailsPanelData();
  const riskDistributionData = getRiskDistributionData();
  const riskScoreGaugeData = getRiskScoreGaugeData();
  const sessionStatsData = getSessionStatsData();

  return (
    <div className="grid min-h-screen bg-bg-base grid-cols-[220px_1fr] grid-rows-[64px_1fr] max-[900px]:grid-cols-[72px_1fr]">
      <Sidebar
        active={activeNav}
        onNavigate={setActiveNav}
      />

      <Topbar
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      <main className="min-w-0 flex flex-col gap-4.5 px-7 pt-6 pb-12 max-[700px]:px-4 max-[700px]:pt-4.5">

        {/* ========================================================= */}
        {/* FACE DETECTION TAB                                        */}
        {/* ========================================================= */}

        {activeTab === 'Face Detection' ? (
          <div>
            <div className="mb-6">
              <h1 className="font-display text-[22px] font-bold text-text-primary mb-1">
                Live Face Detection
              </h1>

              <p className="text-[13px] text-text-secondary max-w-[620px]">
                Real-time webcam face detection using face-api.js.
              </p>
            </div>

            {faceDetectionResult?.detected && (
              <div className="mb-4 px-4 py-3 rounded-lg bg-green-900/30 border border-green-700 text-green-300 text-sm">
                Face detected —{' '}
                {faceDetectionResult.faceCount || 1} face(s)
                with{' '}
                {Math.round(
                  (faceDetectionResult.confidence || 0) * 100
                )}
                % confidence.
              </div>
            )}

            <div className="flex justify-center">
              <FaceDetector
                onResult={handleFaceResult}
                autoStart={false}
              />
            </div>
          </div>

        ) : (

          /* ======================================================= */
          /* DASHBOARD                                               */
          /* ======================================================= */

          <div className="flex flex-col gap-4.5">

            <div>
              <h1 className="font-display text-[22px] font-bold text-text-primary mb-1">
                Verification Dashboard
              </h1>

              <p className="text-[13px] text-text-secondary max-w-[700px]">
                Real-time government document authenticity,
                biometric verification, tampering analysis and
                risk scoring.
              </p>
            </div>


            {/* =================================================== */}
            {/* DOCUMENT VERIFICATION                               */}
            {/* =================================================== */}

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-text-primary">
                  Government ID Verification
                </h2>

                <p className="text-sm text-text-secondary mt-1">
                  Upload a government document and a reference face
                  to perform the complete verification pipeline.
                </p>
              </div>


              <div className="grid grid-cols-2 gap-4 max-[800px]:grid-cols-1">

                {/* DOCUMENT */}

                <div className="rounded-lg border border-white/10 p-4">

                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Government Document
                  </label>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleDocumentChange}
                    className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-white/10 file:text-text-primary hover:file:bg-white/20"
                  />

                  {documentFile && (
                    <div className="mt-3 text-xs text-text-secondary">
                      Selected: {documentFile.name}
                    </div>
                  )}

                </div>


                {/* FACE */}

                <div className="rounded-lg border border-white/10 p-4">

                  <label className="block text-sm font-medium text-text-primary mb-2">
                    Reference / Live Face
                  </label>

                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    onChange={handleLivePhotoChange}
                    className="block w-full text-sm text-text-secondary file:mr-4 file:rounded-md file:border-0 file:px-4 file:py-2 file:bg-white/10 file:text-text-primary hover:file:bg-white/20"
                  />

                  {livePhotoFile && (
                    <div className="mt-3 text-xs text-text-secondary">
                      Selected: {livePhotoFile.name}
                    </div>
                  )}

                </div>

              </div>


              {/* ERROR */}

              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  ❌ {error}
                </div>
              )}


              {/* VERIFY BUTTON */}

              <div className="mt-5 flex justify-end">

                <button
                  type="button"
                  onClick={handleVerify}
                  disabled={
                    isVerifying ||
                    !documentFile ||
                    !livePhotoFile
                  }
                  className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {isVerifying
                    ? 'Analyzing...'
                    : 'Start Verification'}
                </button>

              </div>

            </section>


            {/* =================================================== */}
            {/* LIVE FACE VERIFICATION (webcam, front page)          */}
            {/* =================================================== */}

            <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

              <div className="mb-5">
                <h2 className="text-lg font-semibold text-text-primary">
                  Live Face Verification
                </h2>

                <p className="text-sm text-text-secondary mt-1">
                  Detect a face via webcam right here on the dashboard
                  before running the full document verification below.
                </p>
              </div>

              {faceDetectionResult?.detected && (
                <div className="mb-4 px-4 py-3 rounded-lg bg-green-900/30 border border-green-700 text-green-300 text-sm">
                  Face detected —{' '}
                  {faceDetectionResult.faceCount || 1} face(s)
                  with{' '}
                  {Math.round(
                    (faceDetectionResult.confidence || 0) * 100
                  )}
                  % confidence.
                </div>
              )}

              <div className="flex justify-center">
                <FaceDetector
                  onResult={handleFaceResult}
                  autoStart={false}
                />
              </div>

            </section>


            {/* =================================================== */}
            {/* PROCESSING                                           */}
            {/* =================================================== */}

            {isVerifying && (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">

                <div className="flex items-center gap-3">

                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-white" />

                  <div>
                    <h3 className="font-semibold text-text-primary">
                      Verification in progress
                    </h3>

                    <p className="text-sm text-text-secondary">
                      Running OCR, document validation,
                      tampering detection and face verification...
                    </p>
                  </div>

                </div>

              </section>
            )}


            {/* =================================================== */}
            {/* FINAL VERIFICATION RESULT                           */}
            {/* =================================================== */}

            {verificationResult && (
              <section className="rounded-xl border border-white/10 bg-white/[0.03] p-5">

                <div className="flex items-center justify-between mb-5 max-[700px]:flex-col max-[700px]:items-start max-[700px]:gap-3">

                  <div>
                    <h2 className="text-lg font-semibold text-text-primary">
                      Final Verification Result
                    </h2>

                    <p className="text-xs text-text-secondary mt-1">
                      Request ID: {verificationResult.requestId || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-full border border-white/10 px-4 py-2 text-sm font-bold">
                    {verificationResult.status || 'UNKNOWN'}
                  </div>

                </div>


                {/* SUMMARY CARDS */}

                <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[600px]:grid-cols-1">

                  <ResultCard
                    title="Risk Score"
                    value={`${Math.round(riskScore)}`}
                  />

                  <ResultCard
                    title="Face Match"
                    value={
                      faceScore !== null
                        ? `${Math.round(faceScore)}%`
                        : 'N/A'
                    }
                  />

                  <ResultCard
                    title="Document"
                    value={
                      verificationResult.docType || 'Unknown'
                    }
                  />

                  <ResultCard
                    title="Verification"
                    value={
                      verificationResult.status || 'Unknown'
                    }
                  />

                </div>


                {/* FACE SCORE GRAPH */}

                <div className="mt-6 rounded-lg border border-white/10 p-5">

                  <div className="flex justify-between items-center mb-3">

                    <div>
                      <h3 className="font-semibold text-text-primary">
                        Face Match Analysis
                      </h3>

                      <p className="text-xs text-text-secondary">
                        Real result returned by the face recognition backend.
                      </p>
                    </div>

                    <span className="text-xl font-bold text-text-primary">
                      {faceScore !== null
                        ? `${Math.round(faceScore)}%`
                        : 'N/A'}
                    </span>

                  </div>


                  {/* BAR */}

                  <div className="relative h-5 w-full overflow-hidden rounded-full bg-white/10">

                    <div
                      className="h-full rounded-full bg-white transition-all duration-700"
                      style={{
                        width: `${Math.min(
                          Math.max(faceScore || 0, 0),
                          100
                        )}%`,
                      }}
                    />

                  </div>


                  {/* LEVELS */}

                  <div className="mt-3 grid grid-cols-3 text-center text-xs">

                    <div>
                      <div className="font-semibold text-text-primary">
                        LOW
                      </div>

                      <div className="text-text-secondary">
                        Low confidence
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-text-primary">
                        MEDIUM
                      </div>

                      <div className="text-text-secondary">
                        Review required
                      </div>
                    </div>

                    <div>
                      <div className="font-semibold text-text-primary">
                        HIGH
                      </div>

                      <div className="text-text-secondary">
                        Strong match
                      </div>
                    </div>

                  </div>


                  <div className="mt-4 text-center">

                    <span className="text-sm font-semibold">
                      Face Match Status:{' '}
                    </span>

                    <span className="text-sm">
                      {faceStatus}
                    </span>

                  </div>

                </div>


                {/* MODULE RESULTS */}

                <div className="mt-6">

                  <h3 className="font-semibold text-text-primary mb-3">
                    Verification Modules
                  </h3>

                  <div className="grid grid-cols-4 gap-3 max-[1000px]:grid-cols-2 max-[600px]:grid-cols-1">

                    <ModuleCard
                      title="OCR"
                      data={
                        verificationResult.modules?.ocr
                      }
                    />

                    <ModuleCard
                      title="Document Validation"
                      data={
                        verificationResult.modules?.validation
                      }
                    />

                    <ModuleCard
                      title="Tampering"
                      data={
                        verificationResult.modules?.tampering
                      }
                    />

                    <ModuleCard
                      title="Face Verification"
                      data={
                        verificationResult.modules?.face_verification
                      }
                    />

                  </div>

                </div>


                {/* RAW RESULT */}

                <details className="mt-5">

                  <summary className="cursor-pointer text-sm text-text-secondary hover:text-text-primary">
                    Show complete backend response
                  </summary>

                  <pre className="mt-3 overflow-auto rounded-lg bg-black/30 p-4 text-xs text-text-secondary">
                    {JSON.stringify(
                      verificationResult,
                      null,
                      2
                    )}
                  </pre>

                </details>

              </section>
            )}


            {/* =================================================== */}
            {/* EXISTING DASHBOARD COMPONENTS                       */}
            {/* =================================================== */}

            <StatCards data={sessionStatsData} />

            <RiskScoreGauge data={riskScoreGaugeData} />

            <div className="grid gap-3.5 grid-cols-3 max-[1200px]:grid-cols-2 max-[700px]:grid-cols-1">

              <LatestScanPanel
                docId={verificationResult?.docId}
                docType={verificationResult?.docType}
                submittedAt={
                  verificationResult
                    ? new Date().toLocaleTimeString()
                    : undefined
                }
                officer={verificationResult?.officer}
                status={
                  isVerifying
                    ? 'Analyzing Document...'
                    : verificationResult?.status
                }
                previewUrl={documentPreviewUrl}
                loading={isVerifying}
              />

              <ExtractedInfoPanel data={extractedInfoRows} />

              <AIVerificationPanel data={aiVerificationRows} />

            </div>


            <div className="grid gap-3.5 grid-cols-4 max-[1200px]:grid-cols-2 max-[700px]:grid-cols-1">

              <TamperingAnalysisPanel data={tamperingPanelData} />

              <FaceVerificationPanel data={faceVerificationPanelData} />

              <TimelinePanel data={timelineData} />

              <DetailsPanel data={detailsPanelData} />

            </div>


            <div className="grid gap-3.5 grid-cols-[1.6fr_1fr] max-[1200px]:grid-cols-1">

              <RecentHistoryPanel data={history} />

              <RiskDistributionPanel
                data={riskDistributionData}
                title={riskDistributionData ? 'Risk Score Breakdown' : undefined}
                eyebrow={riskDistributionData ? 'Latest Scan' : undefined}
              />

            </div>

          </div>
        )}
      </main>
    </div>
  );
}


/* =============================================================== */
/* RESULT CARD                                                     */
/* =============================================================== */

function ResultCard({ title, value }) {
  return (
    <div className="rounded-lg border border-white/10 p-4">

      <p className="text-xs text-text-secondary">
        {title}
      </p>

      <p className="mt-2 text-xl font-bold text-text-primary break-words">
        {value}
      </p>

    </div>
  );
}


/* =============================================================== */
/* MODULE CARD                                                     */
/* =============================================================== */

function ModuleCard({ title, data }) {
  if (!data) {
    return (
      <div className="rounded-lg border border-white/10 p-4">

        <p className="text-sm font-semibold text-text-primary">
          {title}
        </p>

        <p className="mt-2 text-xs text-text-secondary">
          No result returned.
        </p>

      </div>
    );
  }

  const status =
    data.status ||
    data.result ||
    data.recommendation ||
    data.is_valid;

  return (
    <div className="rounded-lg border border-white/10 p-4">

      <p className="text-sm font-semibold text-text-primary">
        {title}
      </p>

      <p className="mt-2 text-sm text-text-secondary break-words">
        {typeof status === 'boolean'
          ? status
            ? 'PASSED'
            : 'FAILED'
          : status || 'PROCESSED'}
      </p>

    </div>
  );
}
