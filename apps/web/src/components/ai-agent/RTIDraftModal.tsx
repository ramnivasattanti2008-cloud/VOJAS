'use client';

import {
  Check,
  Copy,
  Download,
  Printer,
  Scale,
  ShieldAlert,
  X
} from 'lucide-react';
import { useState } from 'react';

export interface RTIDraftModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectDetails?: {
    id: string;
    name: string;
    location?: string;
    state?: string;
    district?: string;
    approvedAmount?: number;
    disbursedAmount?: number;
    physicalProgress?: number;
    riskFinding?: string;
  };
}

export function RTIDraftModal({
  isOpen,
  onClose,
  projectDetails,
}: RTIDraftModalProps) {
  const [copied, setCopied] = useState(false);
  const [applicantName, setApplicantName] = useState('A Concerned Citizen');
  const [applicantAddress, setApplicantAddress] = useState(
    projectDetails?.district
      ? `Resident of ${projectDetails.district}, ${projectDetails.state || 'India'}`
      : 'District Resident, State of Odisha'
  );
  const [contactNumber, setContactNumber] = useState('');

  if (!isOpen) return null;

  const todayStr = new Date().toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const pName = projectDetails?.name || 'Public Infrastructure Development Work';
  const pId = projectDetails?.id || 'VOJAS-REF-UNKNOWN';
  const pDistrict = projectDetails?.district || 'District Nodal Authority';
  const pState = projectDetails?.state || 'State Department of Rural/Urban Development';
  const pSanctioned = projectDetails?.approvedAmount
    ? `₹${projectDetails.approvedAmount.toLocaleString('en-IN')}`
    : 'As per official administrative sanction';
  const pDisbursed = projectDetails?.disbursedAmount
    ? `₹${projectDetails.disbursedAmount.toLocaleString('en-IN')}`
    : 'As recorded in public disbursement logs';

  const rtiText = `FORM 'A'
APPLICATION FOR INFORMATION UNDER SECTION 6(1) OF THE RIGHT TO INFORMATION ACT, 2005

Date: ${todayStr}

To,
The Public Information Officer (PIO) / Assistant Public Information Officer (APIO),
Office of the District Collector & District Magistrate / District Rural Development Agency (DRDA),
District: ${pDistrict},
State: ${pState}.

1. FULL NAME OF THE APPLICANT:
   ${applicantName}

2. ADDRESS FOR CORRESPONDENCE:
   ${applicantAddress}
   ${contactNumber ? `Contact Number: ${contactNumber}` : ''}

3. CITIZENSHIP STATUS:
   The applicant is a citizen of India as per Section 3 of the RTI Act, 2005.

4. DETAILS OF PUBLIC WORK CONCERNED:
   (a) Name of Project / Work: ${pName}
   (b) Government / MPLADS Identification Reference: ${pId}
   (c) Recorded Location: ${projectDetails?.location || pDistrict}
   (d) Sanctioned Financial Allocation: ${pSanctioned}
   (e) Recorded Fund Release / Disbursement: ${pDisbursed}

5. PARTICULARS OF INFORMATION REQUIRED UNDER SECTION 6(1):
   The applicant respectfully requests certified copies / information regarding the following items:

   Query 1: Certified copy of the Administrative Approval (AA) and Financial Sanction (FS) order issued for the above work, including sanction order number, date, and recommending authority.

   Query 2: Certified copy of the Technical Sanction (TS), Detailed Project Report (DPR), and sanctioned itemized Bill of Quantities (BOQ).

   Query 3: Certified copy of the Notice Inviting Tender (NIT), comparative evaluation statement of bids, and the formal Agreement / Work Order executed with the awarded contractor.

   Query 4: Certified copies of all Measurement Book (MB) recordings, running bills, and site inspection notes recorded by the Junior Engineer, Assistant Engineer, and Executive Engineer under General Financial Rules (GFR 2017).

   Query 5: Certified copies of all payment vouchers, RTGS / bank transfer advice records, and contractor invoice clearances detailing the release of ${pDisbursed}.

   Query 6: Certified copies of Utilization Certificates (UC) submitted in Form GFR 12-C along with physical completion certificate, if issued.

   Query 7: High-resolution geotagged photographs taken during periodic milestone inspections mandated prior to each stage disbursement.

   ${
     projectDetails?.riskFinding
       ? `Query 8: Specific Action Taken Report (ATR) regarding the recorded audit anomaly: "${projectDetails.riskFinding}".`
       : 'Query 8: If the work is incomplete or abandoned, certified copy of any show-cause notice or liquidated damages penalty assessed on the contractor.'
   }

6. STATUTORY DECLARATION & APPLICATION FEE:
   (a) The information sought relates to public funds and does not fall under any exemption specified under Section 8 or Section 9 of the RTI Act, 2005.
   (b) The statutory application fee of ₹10 (Rupees Ten only) is attached / tendered herewith by way of Indian Postal Order (IPO) / Court Fee Stamp / online treasury challan as prescribed under the RTI Rules.

7. STATUTORY TIMELINE:
   As provided under Section 7(1) of the RTI Act, 2005, the requested information should be provided within 30 days of the receipt of this application.

Yours faithfully,

_______________________
(Signature / Thumb Impression of Applicant)
Name: ${applicantName}
`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(rtiText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
      setCopied(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([rtiText], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `RTI_Application_${pId.replace(/[^a-zA-Z0-9_-]/g, '_')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head>
          <title>RTI Application - ${pId}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; font-size: 13pt; line-height: 1.5; }
            pre { white-space: pre-wrap; font-family: inherit; }
          </style>
        </head>
        <body>
          <pre>${rtiText}</pre>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-60 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 bg-linear-to-r from-blue-50/80 to-indigo-50/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900">
                  RTI Application Generator
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  Section 6(1) RTI Act 2005
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Statutory legal request for certified vouchers, MB entries &amp; GFR records
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Customization Bar */}
        <div className="bg-slate-50 p-3 sm:p-4 border-b border-slate-200/70 grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Applicant Name
            </label>
            <input
              type="text"
              value={applicantName}
              onChange={(e) => setApplicantName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
              placeholder="Your Name"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Correspondence Address
            </label>
            <input
              type="text"
              value={applicantAddress}
              onChange={(e) => setApplicantAddress(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
              placeholder="Address / District"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Phone / Contact (Optional)
            </label>
            <input
              type="text"
              value={contactNumber}
              onChange={(e) => setContactNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white text-xs text-slate-800"
              placeholder="+91 98765 43210"
            />
          </div>
        </div>

        {/* RTI Text Content Preview */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 bg-slate-900 text-slate-100 font-mono text-xs leading-relaxed select-text">
          <pre className="whitespace-pre-wrap font-mono text-xs">{rtiText}</pre>
        </div>

        {/* Modal Footer Controls */}
        <div className="p-3 sm:p-4 border-t border-slate-200 bg-slate-50 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <ShieldAlert className="w-3.5 h-3.5 text-blue-600" />
            <span>Ready to print and submit to District Collectorate / PIO</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 shadow-2xs transition-all cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-600" />
                  <span>Copy Text</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Save .txt</span>
            </button>

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Application</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

