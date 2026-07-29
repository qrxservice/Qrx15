import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import {
  useCreatePrescription, useUpdatePrescription, useGetDoctorProfile,
  useGetMyRxSettings, useUpdateMyRxSettings, getPrescription,
  useListQueue, useListAppointments, useListPrescriptions, useGetAppSettings,
  useCallNextPatient, useSkipPatient, useMarkPatientSeen,
  useRecallPatient, useServeQueueEntry, useUpdateDoctorStatus,
} from "@workspace/api-client-react";
import type { DoctorRxSettings, DoctorRxSettingsInput, Prescription } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Stethoscope, Sun, Moon, Languages, LayoutDashboard, Plus, Trash2,
  Printer, Search, ChevronRight, ChevronDown, ChevronUp, Calendar,
  Activity, UserCheck, CheckCircle2, SkipForward, RotateCcw, ClipboardList,
  BookOpen, PlusCircle, Settings2, FileCog, Save, Copy, Star, Pencil, FileDown,
  Coffee, Timer, TrendingUp, Upload, FlaskConical,
  Eye, EyeOff, ArrowUp, ArrowDown, RefreshCw,
} from "lucide-react";
import QRCode from "qrcode";
import { cn } from "@/lib/utils";
import { downloadObject, storageUrl } from "@/lib/storage";

/* ── Constants ─────────────────────────────────────────────────────── */

// DOSE_BTNS, DOSE_OPTIONS: removed — replaced by DB-driven templates["dose"] below.
const DOSE_FORMS = ["Tab","Cap","Syrup","Susp","Drop","Inj","Cream","Ointment","Gel","Inhaler","Sachet","Suppository","Solution","Lotion","Spray","Powder","Eye Drop","Ear Drop","Nasal Spray","Chewable","Lozenge"];

// Local (not UTC) YYYY-MM-DD — matches the <input type="date"> calendar value.
const toLocalDateStr = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
// TIMING_BTNS, DURATION_PRESETS: removed — replaced by DB-driven templates["timing"/"duration"] below.

// BUILTIN_TIMING_TEMPLATES and BUILTIN_DURATION_TEMPLATES removed —
// timing/duration defaults are now seeded as real DB rows per doctor
// (isBuiltin=true) so they can be hidden, reordered, and replaced like
// any other template. See /api/rx-templates backend for SYSTEM_DEFAULTS.
const IX_CHIPS = ["CBC","Urine R/E","Blood Sugar (F)","Blood Sugar (R)","HbA1c","Lipid Profile","LFT","KFT","ECG","CXR","TSH","Stool R/E","USG Abdomen","Creatinine","PT/INR","Blood Culture","Urine Culture","Serum Electrolytes"];
const ADVICE_CHIPS_BN = [
  "প্রচুর পানি পান করুন","বিশ্রাম নিন","হালকা খাবার খান",
  "ধুলো-ধোঁয়া এড়িয়ে চলুন","ঠান্ডা পানি এড়িয়ে চলুন",
  "লবণ কম খান","চিনি কম খান","ধূমপান বর্জন করুন",
  "নিয়মিত BP মাপুন","ওষুধ নিয়মিত খান","ফলো-আপে আসুন",
];
const ADVICE_CHIPS_EN = [
  "Drink plenty of water","Take rest","Eat light meals",
  "Avoid dust and smoke","Avoid cold water",
  "Reduce salt intake","Reduce sugar intake","Quit smoking",
  "Monitor BP regularly","Take medicines regularly","Come for follow-up",
];

/* ── Types ──────────────────────────────────────────────────────────── */

interface MedItem {
  id: string;
  brandName: string; genericName: string;
  strength: string; dosageForm: string;
  dose: string; durationNum: string; durationUnit: "D" | "W" | "M";
  timing: string; instructions: string;
}

interface MedSuggestion {
  id: number; brandName: string; genericName: string | null;
  strength: string | null; dosageForm: string | null;
  manufacturer: string | null;
}

interface RxTemplate { id: number; type: string; title: string; content: string; department?: string | null; isFavorite?: boolean | null; }

interface PatientState {
  name: string; age: string; ageUnit: string; sex: string;
  phone: string; address: string; regNo: string; date: string;
  bp: string; weight: string; height: string; pulse: string; temp: string;
  hb: string; sugar: string; spo2: string;
  cc: string; oe: string; oeMode: "text" | "box";
  ixChips: string[]; ixCustom: string; drugHistory: string;
  labReportUrl: string; prescriptionUploadUrl: string;
  photoUrl?: string;
}

/* ── Empty states ───────────────────────────────────────────────────── */

const emptyPatient = (): PatientState => ({
  name: "", age: "", ageUnit: "Y", sex: "M",
  phone: "", address: "", regNo: "",
  date: new Date().toLocaleDateString("en-GB").split("/").reverse().join("-"),
  bp: "", weight: "", height: "", pulse: "", temp: "",
  hb: "", sugar: "", spo2: "",
  cc: "", oe: "", oeMode: "text",
  ixChips: [], ixCustom: "", drugHistory: "",
  labReportUrl: "", prescriptionUploadUrl: "",
});

const emptyMed = (): MedItem => ({
  id: crypto.randomUUID(), brandName: "", genericName: "",
  strength: "", dosageForm: "",
  dose: "১+০+১", durationNum: "5", durationUnit: "D",
  timing: "ভরা পেটে", instructions: "",
});

/* ── Page label map (en/bn) ─────────────────────────────────────────────
   Universal medical notation (BP, Pulse, C/C, O/E, IX, Dx, Rx, dose/timing
   chips) is intentionally kept identical across languages. */

type RxLabels = ReturnType<typeof rxLabels>;

function rxLabels(isBn: boolean) {
  return isBn
    ? {
        navDashboard: "ড্যাশবোর্ড", navNewRx: "নতুন প্রেসক্রিপশন", navPatients: "রোগীগণ",
        navLogs: "লগ", navAppointments: "অ্যাপয়েন্টমেন্ট", navQueue: "কিউ",
        preview: "প্রিভিউ", savePrint: "সেভ ও প্রিন্ট", saveOnly: "শুধু সেভ", loading: "লোড হচ্ছে...",
        loadPatient: "রোগী লোড করুন", searchPlaceholder: "নাম / ফোন / সিরিয়াল...",
        queueLabel: "কিউ", apptLabel: "অ্যাপয়েন্টমেন্ট", patientsLabel: "রোগী তালিকা", noPatientFound: "কোনো রোগী পাওয়া যায়নি",
        patientName: "রোগীর নাম", typeNamePlaceholder: "নাম টাইপ করুন...",
        age: "বয়স", gender: "লিঙ্গ", male: "পুরুষ", female: "মহিলা", other: "অন্যান্য",
        mobile: "মোবাইল", address: "ঠিকানা", addressPlaceholder: "ঠিকানা...",
        regNo: "রেজি নং", date: "তারিখ", vitals: "ভাইটালস", assistantTag: "অ্যাসিস্ট্যান্ট",
        ccLabel: "C/C — প্রধান অভিযোগ", ccPlaceholder: "জ্বর, মাথাব্যথা, কাশি...",
        box: "বক্স", oePlaceholder: "পরীক্ষায়...",
        ixLabel: "IX — পরীক্ষা-নিরীক্ষা", ixCustomPlaceholder: "অতিরিক্ত টেস্ট লিখুন...",
        drugHistory: "ওষুধের ইতিহাস", drugHistoryPlaceholder: "পূর্বের ওষুধের ইতিহাস...",
        attachments: "সংযুক্তি", labReport: "ল্যাব রিপোর্ট", previousRx: "পূর্বের প্রেসক্রিপশন",
        queueColon: "কিউ:", serving: "চলছে", waitingSuffix: "অপেক্ষমাণ", followUpColon: "ফলো-আপ:",
        next: "পরবর্তী", seen: "দেখা হয়েছে", skip: "বাদ", recall: "রিকল", nextColon: "পরবর্তী:",
        addMedicineHeading: "ঔষুধ যোগ করুন", brandName: "ব্র্যান্ড নাম",
        medNamePlaceholder: "ওষুধের নাম টাইপ করুন...", genericName: "জেনেরিক নাম",
        strengthPlaceholder: "শক্তি (৫০০mg)", formPlaceholder: "ফর্ম (ট্যাবলেট/সিরাপ)",
        dose: "ডোজ", customDose: "কাস্টম ডোজ", duration: "মেয়াদ", dayUnit: "দিন", weekUnit: "সপ্তাহ", monthUnit: "মাস",
        dateLocale: "bn-BD",
        timing: "সময়", customTiming: "কাস্টম সময়", instructionsOptional: "নির্দেশনা (ঐচ্ছিক)",
        instructionsPlaceholder: "যেমন: প্রয়োজনে, সতর্কতার সাথে ব্যবহার করুন...",
        addMedicineBtn: "যোগ করুন — ঔষুধ", addedMedicines: "যোগ করা ওষুধ",
        advice: "পরামর্শ", advicePlaceholder: "পরামর্শ লিখুন...",
        treatmentNote: "চিকিৎসা নোট", treatmentPlaceholder: "চিকিৎসার বিবরণ, পরিকল্পনা...",
        diagnosisDx: "রোগ নির্ণয় (Dx)", diagnosisPlaceholder: "নির্ণয়...", followUpDate: "ফলো-আপ তারিখ",
        templates: "টেমপ্লেট", newBtn: "নতুন", tmplAdvice: "পরামর্শ", tmplCc: "প্রধান অভিযোগ",
        tmplOe: "O/E", tmplIx: "পরীক্ষা", tmplDose: "ডোজ", tmplTiming: "সময় টেমপ্লেট", tmplDuration: "মেয়াদ টেমপ্লেট", tmplProtocol: "প্রোটোকল", tmplTreatment: "চিকিৎসা নোট", tmplFollowup: "ফলো-আপ", tmplManage: "পরিচালনা", tmplRestoreDefaults: "ডিফল্ট পুনরুদ্ধার", tmplHide: "লুকান", tmplShow: "দেখান",
        tmplTitlePlaceholder: "টেমপ্লেট শিরোনাম", tmplContentPlaceholder: "টেমপ্লেট বিষয়বস্তু...",
        save: "সেভ", cancel: "বাতিল", genericToBrand: "জেনেরিক → ব্র্যান্ড",
        genericToBrandHint: "ব্র্যান্ড ফিল্ডে জেনেরিক নাম লিখুন...", treatmentProtocol: "চিকিৎসা প্রোটোকল",
        adviceTemplate: "পরামর্শ টেমপ্লেট", ccTemplate: "C/C টেমপ্লেট", oeTemplate: "O/E টেমপ্লেট",
        ixTemplate: "I/X টেমপ্লেট", genericNamePlaceholder: "জেনেরিক নাম লিখুন...",
        enterMedName: "ওষুধের নাম দিন", loadedNowServing: "লোড হয়েছে — চলছে", loaded: "লোড হয়েছে",
        failed: "ব্যর্থ", templateApplied: "টেমপ্লেট প্রয়োগ হয়েছে", titleContentRequired: "শিরোনাম ও বিষয়বস্তু প্রয়োজন",
        templateSaved: "টেমপ্লেট সেভ হয়েছে", templateSaveFailed: "টেমপ্লেট সেভ ব্যর্থ",
        enterPatientName: "রোগীর নাম দিন", addAtLeastOneMed: "কমপক্ষে একটি ওষুধ যোগ করুন", saveFailed: "সেভ ব্যর্থ",
        prescription: "প্রেসক্রিপশন", savedExcl: "সেভ হয়েছে!", backToEdit: "এডিটে ফিরুন", printPdf: "প্রিন্ট / PDF", printNoHeader: "হেডার ছাড়া প্রিন্ট",
        doctorFallback: "ডাক্তার", nameColon: "নাম: ", phoneColon: "ফোন: ", ageSex: "বয়স/লিঙ্গ: ", wt: "ওজন: ",
        medicines: "ওষুধ", investigations: "IX — পরীক্ষা-নিরীক্ষা", adviceTitle: "পরামর্শ",
        treatmentNoteTitle: "চিকিৎসা নোট", followUpPrint: "ফলো-আপ:", doctorSignature: "ডাক্তারের স্বাক্ষর",
        headerSettings: "হেডার সেটিংস", pageSetup: "পেজ সেটআপ", saveDraft: "ড্রাফট সেভ",
        duplicate: "ডুপ্লিকেট", editingBadge: "এডিট করা হচ্ছে", draftBadge: "ড্রাফট", pendingInvBadge: "অনুসন্ধান বাকি",
        continueRx: "পূর্বের Rx", uploadReport: "রিপোর্ট আপলোড", uploading: "আপলোড হচ্ছে...", reportUploaded: "রিপোর্ট আপলোড হয়েছে",
        settingsSaved: "সেটিংস সেভ হয়েছে", settingsSaveFailed: "সেটিংস সেভ ব্যর্থ",
        headerSettingsDesc: "প্রেসক্রিপশনের শীর্ষে যা দেখানো হবে তা নির্ধারণ করুন।",
        pageSetupDesc: "প্রিন্ট পেজের আকার, মার্জিন ও উপাদান নিয়ন্ত্রণ করুন।",
        hdrName: "ডাক্তারের নাম", hdrDegree: "ডিগ্রি", hdrDesignation: "পদবি", hdrBmdc: "BMDC নং",
        hdrHospital: "হাসপাতাল / চেম্বার", hdrAddress: "ঠিকানা", hdrPhone: "ফোন", hdrEmail: "ইমেইল",
        hdrSignature: "স্বাক্ষরের টেক্সট", hdrPlaceholderHint: "খালি রাখলে প্রোফাইল থেকে নেওয়া হবে",
        hdrSignatureImage: "স্বাক্ষরের ছবি", remove: "সরান",
        psSize: "পেজ সাইজ", psMargins: "মার্জিন (mm)", psTop: "উপরে", psRight: "ডানে", psBottom: "নিচে", psLeft: "বামে",
        psHeaderHeight: "হেডার উচ্চতা (mm)", psFooterHeight: "ফুটার উচ্চতা (mm)",
        psShowHeader: "হেডার দেখান", psShowQr: "QR কোড দেখান", psShowSignature: "স্বাক্ষর দেখান", psShowFooter: "ফুটার দেখান",
        psFooterText: "ফুটার টেক্সট", saveSettings: "সেটিংস সেভ",
        refNoLabel: "রেফ নং", scanToVerify: "যাচাই করতে স্ক্যান করুন", reprint: "পুনঃপ্রিন্ট",
        ageColon: "বয়স: ", sexColon: "লিঙ্গ: ", dateColon: "তারিখ: ", regNoColon: "রেজি নং: ", wtColon: "ওজন: ", mobileColon: "মোবাইল: ", visitNo: "ভিজিট নং:", rxHeading: "Rx.", advicePrint: "পরামর্শ", ixShort: "IX", complianceNote: "নিয়ম মাফিক ঔষধ খাবেন। ডাক্তারের পরামর্শ ব্যতীত ঔষধ পরিবর্তন নিষেধ।",
        tmplDepartment: "বিভাগ", tmplDepartmentPlaceholder: "বিভাগ (ঐচ্ছিক)",
        editLabel: "সম্পাদনা", deleteLabel: "মুছুন", favorites: "প্রিয়", deleteTmplConfirm: "এই টেমপ্লেটটি মুছবেন?",
        templateDeleted: "টেমপ্লেট মুছে ফেলা হয়েছে", templateUpdated: "টেমপ্লেট আপডেট হয়েছে",
        markFavorite: "প্রিয় হিসেবে চিহ্নিত করুন", update: "আপডেট",
        queueSummary: "কিউ সামারি", nowServingShort: "চলছে", nextShort: "পরবর্তী", waitingShort: "অপেক্ষমাণ",
        todaysQueue: "আজকের কিউ", queueEmpty: "কিউ খালি", liveTag: "লাইভ",
        breakActive: "বিরতি চলছে", breakRemaining: "বাকি সময়", expectedResume: "আনুমানিক পুনরায়",
        resumeBreak: "ফিরে আসুন", dayEnded: "দিন শেষ",
        recallPatient: "রিকল রোগী", followUpConsult: "ফলো-আপ পরামর্শ", resumeConsult: "পরামর্শ শুরু করুন",
        queueStillServing: "কিউতে চলছে",
        noMoreAppts: "আজকের জন্য আর অ্যাপয়েন্টমেন্ট নেই", doctorUnavailable: "ডাক্তার আজকে অনুপলব্ধ",
        statusAvailable: "উপলব্ধ", statusOnBreak: "বিরতিতে", statusDayEnded: "দিন শেষ",
        totalAppts: "মোট আজকে", completedCount: "সম্পন্ন", skippedCount: "বাদ দেওয়া",
        avgConsultation: "গড় পরামর্শ", firstPatient: "প্রথম রোগী", lastPatient: "শেষ রোগী",
        daySummaryTitle: "দিনের সারসংক্ষেপ", avgWaitTime: "গড় অপেক্ষা", estWaitNext: "পরবর্তীর অপেক্ষা",
        queuePosition: "কিউ অবস্থান",
      }
    : {
        navDashboard: "Dashboard", navNewRx: "New Rx", navPatients: "Patients",
        navLogs: "Logs", navAppointments: "Appointments", navQueue: "Queue",
        preview: "Preview", savePrint: "Save & Print", saveOnly: "Save Only", loading: "Loading...",
        loadPatient: "Load Patient", searchPlaceholder: "Name / Phone / Serial...",
        queueLabel: "Queue", apptLabel: "Appointment", patientsLabel: "Patient List", noPatientFound: "No patient found",
        patientName: "Patient Name", typeNamePlaceholder: "Type name...",
        age: "Age", gender: "Gender", male: "Male", female: "Female", other: "Other",
        mobile: "Mobile", address: "Address", addressPlaceholder: "Address...",
        regNo: "Reg No", date: "Date", vitals: "VITALS", assistantTag: "assistant",
        ccLabel: "C/C — CHIEF COMPLAINT", ccPlaceholder: "Fever, headache, cough...",
        box: "Box", oePlaceholder: "On examination...",
        ixLabel: "IX — INVESTIGATIONS", ixCustomPlaceholder: "Add extra test...",
        drugHistory: "DRUG HISTORY", drugHistoryPlaceholder: "Previous medication history...",
        attachments: "ATTACHMENTS", labReport: "Lab report", previousRx: "Previous prescription",
        queueColon: "Queue:", serving: "Serving", waitingSuffix: "waiting", followUpColon: "Follow-up:",
        next: "Next", seen: "Seen", skip: "Skip", recall: "Recall", nextColon: "Next:",
        addMedicineHeading: "Add Medicine", brandName: "Brand Name",
        medNamePlaceholder: "Type medicine name...", genericName: "Generic name",
        strengthPlaceholder: "Strength (500mg)", formPlaceholder: "Form (Tablet/Syrup)",
        dose: "Dose", customDose: "Custom dose", duration: "Duration", dayUnit: "দিন", weekUnit: "সপ্তাহ", monthUnit: "মাস",
        dateLocale: "en-GB",
        timing: "Timing", customTiming: "Custom timing", instructionsOptional: "Instructions (optional)",
        instructionsPlaceholder: "e.g. as needed, use with caution...",
        addMedicineBtn: "ADD MEDICINE", addedMedicines: "Added Medicines",
        advice: "ADVICE", advicePlaceholder: "Write advice...",
        treatmentNote: "TREATMENT NOTE", treatmentPlaceholder: "Treatment details, plan...",
        diagnosisDx: "Diagnosis (Dx)", diagnosisPlaceholder: "Diagnosis...", followUpDate: "Follow-up Date",
        templates: "TEMPLATES", newBtn: "New", tmplAdvice: "Advice", tmplCc: "Chief Complaint",
        tmplOe: "O/E", tmplIx: "Investigation", tmplDose: "Dose", tmplTiming: "Timing Template", tmplDuration: "Duration Template", tmplProtocol: "Protocol", tmplTreatment: "Treatment Note", tmplFollowup: "Follow-up", tmplManage: "Manage", tmplRestoreDefaults: "Restore Defaults", tmplHide: "Hide", tmplShow: "Show",
        tmplTitlePlaceholder: "Template title", tmplContentPlaceholder: "Template content...",
        save: "Save", cancel: "Cancel", genericToBrand: "Generic → Brand",
        genericToBrandHint: "Type generic name in brand field...", treatmentProtocol: "Treatment Protocol",
        adviceTemplate: "Advice Template", ccTemplate: "C/C Template", oeTemplate: "O/E Template",
        ixTemplate: "I/X Template", genericNamePlaceholder: "Type generic name...",
        enterMedName: "Enter medicine name", loadedNowServing: "loaded — Now Serving", loaded: "loaded",
        failed: "Failed", templateApplied: "Template applied", titleContentRequired: "Title and content required",
        templateSaved: "Template saved", templateSaveFailed: "Failed to save template",
        enterPatientName: "Enter patient name", addAtLeastOneMed: "Add at least one medicine", saveFailed: "Save failed",
        prescription: "Prescription", savedExcl: "saved!", backToEdit: "Back to Edit", printPdf: "Print / PDF", printNoHeader: "Without Header Print",
        doctorFallback: "Doctor", nameColon: "Name: ", phoneColon: "Phone: ", ageSex: "Age/Sex: ", wt: "Wt: ",
        medicines: "Medicines", investigations: "IX — Investigations", adviceTitle: "Advice",
        treatmentNoteTitle: "Treatment Note", followUpPrint: "Follow-up:", doctorSignature: "Doctor's Signature",
        headerSettings: "Header Settings", pageSetup: "Page Setup", saveDraft: "Save Draft",
        duplicate: "Duplicate", editingBadge: "Editing", draftBadge: "Draft", pendingInvBadge: "Pending Investigation",
        continueRx: "Continue Rx", uploadReport: "Upload Report", uploading: "Uploading...", reportUploaded: "Report uploaded",
        settingsSaved: "Settings saved", settingsSaveFailed: "Failed to save settings",
        headerSettingsDesc: "Configure what appears at the top of your prescriptions.",
        pageSetupDesc: "Control print page size, margins and elements.",
        hdrName: "Doctor Name", hdrDegree: "Degree", hdrDesignation: "Designation", hdrBmdc: "BMDC No",
        hdrHospital: "Hospital / Chamber", hdrAddress: "Address", hdrPhone: "Phone", hdrEmail: "Email",
        hdrSignature: "Signature Text", hdrPlaceholderHint: "Leave blank to use profile data",
        hdrSignatureImage: "Signature Image", remove: "Remove",
        psHeaderHeight: "Header Height (mm)", psFooterHeight: "Footer Height (mm)",
        psSize: "Page Size", psMargins: "Margins (mm)", psTop: "Top", psRight: "Right", psBottom: "Bottom", psLeft: "Left",
        psShowHeader: "Show Header", psShowQr: "Show QR Code", psShowSignature: "Show Signature", psShowFooter: "Show Footer",
        psFooterText: "Footer Text", saveSettings: "Save Settings",
        refNoLabel: "Ref No", scanToVerify: "Scan to verify", reprint: "Re-print",
        ageColon: "Age: ", sexColon: "Sex: ", dateColon: "Date: ", regNoColon: "Reg. No: ", wtColon: "Wt: ", mobileColon: "Mobile: ", visitNo: "Visit No:", rxHeading: "Rx.", advicePrint: "Advice", ixShort: "IX", complianceNote: "Take medicines as directed. Changing medication without the doctor's advice is prohibited.",
        tmplDepartment: "Department", tmplDepartmentPlaceholder: "Department (optional)",
        editLabel: "Edit", deleteLabel: "Delete", favorites: "Favorites", deleteTmplConfirm: "Delete this template?",
        templateDeleted: "Template deleted", templateUpdated: "Template updated",
        markFavorite: "Mark as favorite", update: "Update",
        queueSummary: "Queue Summary", nowServingShort: "Now Serving", nextShort: "Next", waitingShort: "Waiting",
        todaysQueue: "Today's Queue", queueEmpty: "Queue is empty", liveTag: "LIVE",
        breakActive: "Break Active", breakRemaining: "Remaining Time", expectedResume: "Expected Resume",
        resumeBreak: "Resume", dayEnded: "Day Ended",
        recallPatient: "Recall Patient", followUpConsult: "Follow-up Consultation", resumeConsult: "Resume Consultation",
        queueStillServing: "Queue still serving",
        noMoreAppts: "No More Appointments Today", doctorUnavailable: "Doctor Unavailable Today",
        statusAvailable: "Available", statusOnBreak: "On Break", statusDayEnded: "Day Ended",
        totalAppts: "Total Today", completedCount: "Completed", skippedCount: "Skipped",
        avgConsultation: "Avg Consultation", firstPatient: "First Patient", lastPatient: "Last Patient",
        daySummaryTitle: "Day Summary", avgWaitTime: "Avg Wait", estWaitNext: "Est. Wait (Next)",
        queuePosition: "Queue Position",
      };
}

/* ══════════════════════════════════════════════════════════════════════
   PRINT VIEW
══════════════════════════════════════════════════════════════════════ */

function PrintView({ rx, doctor, settings, qrDataUrl, adminQrEnabled = true, nextPatientLabel, onNewRx, onBack, onDuplicate, L }: {
  rx: any; doctor: any; settings?: DoctorRxSettings | null; qrDataUrl?: string | null;
  adminQrEnabled?: boolean; nextPatientLabel?: string | null;
  onNewRx: () => void; onBack: () => void; onDuplicate: () => void; L: RxLabels;
}) {
  const s = settings;
  const [hideHeaderForPrint, setHideHeaderForPrint] = useState(false);
  const showHeader = (s ? s.showHeader : true) && !hideHeaderForPrint;
  // One-click print that omits the letterhead regardless of the saved setting.
  // Wait for the header to actually unmount (two paints) before printing, then
  // restore it once the print dialog closes via the afterprint event.
  useEffect(() => {
    if (!hideHeaderForPrint) return;
    let printed = false;
    const restore = () => setHideHeaderForPrint(false);
    window.addEventListener("afterprint", restore, { once: true });
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => {
      printed = true;
      window.print();
    }));
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("afterprint", restore);
      // Safety net if afterprint never fires (some browsers).
      if (printed) setTimeout(() => setHideHeaderForPrint(false), 0);
    };
  }, [hideHeaderForPrint]);
  const printWithoutHeader = () => setHideHeaderForPrint(true);
  // Effective QR = admin global toggle AND per-doctor toggle.
  const showQr = (s ? s.showQr : true) && adminQrEnabled;
  const showSignature = s ? s.showSignature : true;
  const showFooter = s ? s.showFooter : true;
  const hName = s?.headerName || doctor?.name || L.doctorFallback;
  const hDegree = s?.headerDegree || doctor?.degree;
  const hDesignation = s?.headerDesignation || "";
  const hBmdc = s?.headerBmdc || doctor?.bmdcNumber;
  const hHospital = s?.hospitalName || doctor?.chamberName;
  const hAddress = s?.headerAddress || doctor?.chamberAddress;
  const hPhone = s?.headerPhone || "";
  const hEmail = s?.headerEmail || "";
  const signatureText = s?.signatureText || L.doctorSignature;
  const signatureImage = s?.signatureImage || "";
  const footerText = s?.footerText || "";
  const pageSize = s?.pageSize || "A4";
  const mt = s?.marginTop ?? 15, mr = s?.marginRight ?? 15, mb = s?.marginBottom ?? 15, ml = s?.marginLeft ?? 15;
  const headerHeight = s?.headerHeight ?? 25;
  const footerHeight = s?.footerHeight ?? 15;
  const refNo = rx.referenceNo || `#${rx.id}`;
  const isDraft = rx.status === "draft";
  const rxDate = new Date(rx.createdAt).toLocaleDateString(L.dateLocale, { day: "2-digit", month: "2-digit", year: "numeric" });
  const vitalsLines: string[] = rx.vitals ? String(rx.vitals).split(/[\n,]+/).map((v: string) => v.trim()).filter(Boolean) : [];

  return (
    <div className="min-h-screen bg-gray-100 p-4 print:p-0 print:bg-white">
      <style>{`@media print{@page{size:${pageSize};margin:${mt}mm ${mr}mm ${mb}mm ${ml}mm}body *{visibility:hidden}#rxprint,#rxprint *{visibility:visible}#rxprint{position:fixed;left:0;top:0;width:100%;background:white}.no-print{display:none!important}}`}</style>
      <div className="no-print flex gap-2 mb-4 items-center flex-wrap">
        <CheckCircle2 className="h-5 w-5 text-green-500" />
        <span className="font-semibold text-green-700">{L.prescription} {refNo} {isDraft ? `(${L.draftBadge})` : L.savedExcl}</span>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}><ChevronRight className="h-4 w-4 rotate-180 mr-1" />{L.backToEdit}</Button>
          <Button variant="outline" size="sm" onClick={onDuplicate}><Copy className="h-4 w-4 mr-1.5" />{L.duplicate}</Button>
          <Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4 mr-1.5" />{L.printPdf}</Button>
          <Button variant="outline" size="sm" onClick={printWithoutHeader}><Printer className="h-4 w-4 mr-1.5" />{L.printNoHeader}</Button>
          <Button size="sm" onClick={onNewRx}><Plus className="h-4 w-4 mr-1.5" />{nextPatientLabel ? `${L.nextColon} ${nextPatientLabel}` : L.navNewRx}</Button>
        </div>
      </div>
      <div id="rxprint" className="max-w-3xl mx-auto bg-white rounded-xl border shadow-lg print:shadow-none print:border-none print:rounded-none">
        {/* Letterhead */}
        {showHeader && (
          <div className="bg-teal-700 text-white p-5 print:p-4" style={{ minHeight: `${headerHeight}mm` }}>
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-xl font-bold">{hName}</h1>
                {hDegree && <p className="text-teal-100 text-sm">{hDegree}</p>}
                {(hDesignation || doctor?.specialtyName) && (
                  <p className="text-teal-200 text-xs mt-0.5">{hDesignation || doctor?.specialtyName}{doctor?.departmentName ? ` · ${doctor.departmentName}` : ""}</p>
                )}
                {hBmdc && <p className="text-teal-200 text-xs">BMDC: {hBmdc}</p>}
              </div>
              <div className="text-right text-xs text-teal-100">
                {hHospital && <p className="font-medium">{hHospital}</p>}
                {hAddress && <p className="text-teal-200">{hAddress}</p>}
                {hPhone && <p className="text-teal-200">{hPhone}</p>}
                {hEmail && <p className="text-teal-200">{hEmail}</p>}
                {doctor?.chamberHours && <p className="text-teal-200">{doctor.chamberHours}</p>}
              </div>
            </div>
          </div>
        )}
        <div className="flex justify-between items-center px-5 py-1.5 bg-teal-50 border-b text-xs">
          <span className="font-medium text-teal-700">{L.refNoLabel}: {refNo}</span>
          <span className="text-gray-500">{new Date(rx.createdAt).toLocaleDateString(L.dateLocale, { day:"numeric",month:"long",year:"numeric" })}</span>
        </div>
        <div className="p-5 print:p-4">
          {/* Patient — bordered two-row bar (classic BD format) */}
          <div className="border-y-2 border-gray-800 py-1.5 text-sm space-y-0.5">
            <div className="grid grid-cols-12 gap-x-3">
              <div className="col-span-5"><span className="text-gray-500">{L.nameColon}</span><span className="font-semibold">{rx.patientName}</span></div>
              <div className="col-span-2"><span className="text-gray-500">{L.ageColon}</span>{rx.patientAge ?? "—"}</div>
              <div className="col-span-2"><span className="text-gray-500">{L.sexColon}</span>{rx.patientGender || "—"}</div>
              <div className="col-span-3"><span className="text-gray-500">{L.dateColon}</span>{rxDate}</div>
            </div>
            <div className="grid grid-cols-12 gap-x-3">
              <div className="col-span-5"><span className="text-gray-500">{L.regNoColon}</span><span className="font-mono">{refNo}</span></div>
              <div className="col-span-2"><span className="text-gray-500">{L.wtColon}</span>{rx.patientWeight || "—"}</div>
              <div className="col-span-5"><span className="text-gray-500">{L.mobileColon}</span>{rx.patientPhone || "—"}</div>
            </div>
          </div>

          {/* Body — two columns: clinical findings (left) | Rx medicines (right) */}
          <div className="flex border-b-2 border-gray-800" style={{ minHeight: "120mm" }}>
            <div className="w-1/3 pr-3 py-3 border-r border-gray-300 space-y-3 text-sm">
              <div className="text-xs text-gray-500">{L.visitNo}</div>
              {rx.chiefComplaint && (
                <div>
                  <p className="font-semibold text-gray-700">C/C</p>
                  <p className="whitespace-pre-wrap">{rx.chiefComplaint}</p>
                </div>
              )}
              {(vitalsLines.length > 0 || rx.examination) && (
                <div>
                  <p className="font-semibold text-gray-700">O/E</p>
                  {vitalsLines.map((v, i) => (<p key={i} className="leading-snug">{v}</p>))}
                  {rx.examination && <p className="whitespace-pre-wrap mt-1">{rx.examination}</p>}
                </div>
              )}
              {rx.diagnosis && (
                <div>
                  <p className="font-semibold text-gray-700">Dx</p>
                  <p className="font-medium">{rx.diagnosis}</p>
                </div>
              )}
              {rx.investigations && (
                <div>
                  <p className="font-semibold text-gray-700">{L.ixShort}</p>
                  {rx.investigations.split(",").map((v: string, i: number) => (
                    <p key={i}>{v.trim()}</p>
                  ))}
                </div>
              )}
              {rx.advice && (
                <div>
                  <p className="font-semibold text-gray-700">{L.advicePrint}</p>
                  {rx.advice.split("\n").filter(Boolean).map((a: string, i: number) => (
                    <p key={i} className="whitespace-pre-wrap">{a}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="w-2/3 pl-5 py-3">
              <img src="/rx-symbol.jpg" alt="Rx" className="h-12 w-auto mb-3 object-contain" style={{ imageRendering: "auto" }} />
              <div className="space-y-3">
                {rx.items?.map((item: any, i: number) => (
                  <div key={item.id} className="flex gap-2 items-start">
                    <span className="font-semibold text-sm w-5 shrink-0">{i+1}.</span>
                    <div className="flex-1">
                      <div className="font-bold text-sm">
                        {item.dosageForm ? `${item.dosageForm}. ` : ""}{item.medicineName}{item.strength ? ` ${item.strength}` : ""}
                        {item.genericName && <span className="font-normal text-xs text-gray-500"> ({item.genericName})</span>}
                      </div>
                      <div className="text-sm text-gray-700">
                        {[item.dose, item.mealTiming, item.duration].filter(Boolean).join(" — ")}
                        {item.instruction && <span className="italic text-gray-600"> ({item.instruction})</span>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {rx.notes && (
                <div className="mt-4 text-sm">
                  <p className="font-semibold text-gray-700">{L.treatmentNoteTitle}</p>
                  <p className="text-gray-700 whitespace-pre-wrap">{rx.notes}</p>
                </div>
              )}
              {rx.followUpDate && (
                <p className="mt-3 text-sm font-medium text-gray-800">{L.followUpPrint} {rx.followUpDate}</p>
              )}
            </div>
          </div>

          {/* Compliance note (default, like attached format) */}
          <p className="text-center text-sm text-gray-700 py-2">{L.complianceNote}</p>

          {/* QR + signature */}
          <div className="flex justify-between items-end pt-1">
            {showQr && qrDataUrl ? (
              <div className="flex items-center gap-2">
                <img src={qrDataUrl} alt="QR" className="h-16 w-16" />
                <div className="text-[10px] text-gray-500 max-w-[100px]">
                  <p className="font-medium text-gray-600">{L.scanToVerify}</p>
                  <p className="font-mono">{refNo}</p>
                </div>
              </div>
            ) : (
              <div />
            )}
            {showSignature && (
              <div className="text-center">
                {signatureImage && (
                  <img src={signatureImage} alt="signature" className="h-12 mx-auto object-contain mb-0.5" />
                )}
                <div className="border-t border-gray-400 pt-1 w-40 text-xs text-gray-500">{signatureText}</div>
              </div>
            )}
          </div>
          {showFooter && (
            <div
              className="text-center text-[10px] text-gray-400 border-t pt-2 whitespace-pre-wrap flex flex-col justify-end"
              style={{ minHeight: `${footerHeight}mm` }}
            >
              {footerText && <span>{footerText}</span>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   MAIN PRESCRIPTION PAGE
══════════════════════════════════════════════════════════════════════ */

export default function NewPrescriptionPage() {
  const { user, isLoading } = useAuth();
  const [, setLoc] = useLocation();
  const searchStr = useSearch();
  const { toast } = useToast();
  const { theme, toggleTheme } = useTheme();
  const { lang, setLang } = useLanguage();
  const isBn = lang === "bn";
  const L = rxLabels(isBn);

  const { data: doctor } = useGetDoctorProfile();
  const createRx = useCreatePrescription();
  const updateRx = useUpdatePrescription();
  const { data: rxSettings } = useGetMyRxSettings();
  const updateSettings = useUpdateMyRxSettings();
  const today = new Date().toISOString().split("T")[0];
  const [loaderDate, setLoaderDate] = useState(today);
  // refetchInterval keeps the right-panel Queue Summary widget (and the existing
  // Load Patient queue list) live without the doctor needing to switch tabs.
  const { data: queueData, refetch: refetchQ } = useListQueue({ doctorId: doctor?.id ?? 0, date: today }, { query: { refetchInterval: 10000 } as any });
  const { data: apptData } = useListAppointments({ date: loaderDate, limit: 100 });
  const { data: rxHistory } = useListPrescriptions({ limit: 500 });
  const { data: appSettings } = useGetAppSettings();
  const adminQrEnabled = appSettings?.prescriptionQrEnabled ?? true;
  const callNext = useCallNextPatient();
  const skipMut = useSkipPatient();
  const seenMut = useMarkPatientSeen();
  const recallMut = useRecallPatient();
  const serveMut = useServeQueueEntry();
  const updateStatusRx = useUpdateDoctorStatus();

  // ── Auth redirect
  useEffect(() => {
    if (!isLoading && (!user || user.role !== "doctor")) setLoc("/login");
  }, [user, isLoading]);

  // ── Main state
  const [patient, setPatient] = useState<PatientState>(emptyPatient());
  const [currentMed, setCurrentMed] = useState<MedItem>(emptyMed());
  const [medicines, setMedicines] = useState<MedItem[]>([]);
  const [advice, setAdvice] = useState("");
  const [treatmentNote, setTreatmentNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [mode, setMode] = useState<"write" | "saved">("write");
  const [savedRx, setSavedRx] = useState<any>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadedQueueId, setLoadedQueueId] = useState<number | null>(null);
  const [pendingNext, setPendingNext] = useState<any>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // ── Per-doctor Rx settings (header + page setup)
  const [showHeaderDlg, setShowHeaderDlg] = useState(false);
  const [showPageDlg, setShowPageDlg] = useState(false);
  const [settingsForm, setSettingsForm] = useState<DoctorRxSettings | null>(null);
  useEffect(() => { if (rxSettings) setSettingsForm(rxSettings); }, [rxSettings]);

  // ── Medicine autocomplete
  const [medSug, setMedSug] = useState<MedSuggestion[]>([]);
  const [showSug, setShowSug] = useState(false);
  const medInputRef = useRef<HTMLInputElement>(null);
  const sugRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Templates
  const [templates, setTemplates] = useState<Record<string, RxTemplate[]>>({});

  // Derive duration presets dynamically from DB templates (content format: "N D" or "N M").
  // This replaces the old hardcoded DURATION_PRESETS constant so any add/edit/delete in the
  // Template Manager is instantly reflected here too.
  const durationPresetsDB = useMemo(() =>
    (templates["duration"] ?? []).map(t => {
      const m = t.content.match(/^(\d+(?:\.\d+)?)\s*([DWM])/i);
      return m ? { n: m[1], u: m[2].toUpperCase() as "D" | "W" | "M", title: t.title } : null;
    }).filter((p): p is { n: string; u: "D" | "W" | "M"; title: string } => p !== null),
    [templates]
  );

  // ── UI toggles
  const [showLoadPatient, setShowLoadPatient] = useState(false);
  const [patientSearch, setPatientSearch] = useState("");
  const [showQueue, setShowQueue] = useState(false);
  const [showTemplateForm, setShowTemplateForm] = useState(false);
  const [isManageTemplates, setIsManageTemplates] = useState(false);
  const [allTemplatesGrouped, setAllTemplatesGrouped] = useState<Record<string, any[]>>({});
  const [newTmpl, setNewTmpl] = useState({ type: "advice", title: "", content: "", department: "", isFavorite: false });
  const [editingTmplId, setEditingTmplId] = useState<number | null>(null);
  // C/C, O/E and IX are collapsed by default to keep the left panel short — they
  // only expand on click, or automatically if a loaded/edited patient already has
  // content for that section (so existing data is never hidden).
  const [ccOpen, setCcOpen] = useState(false);
  const [oeOpen, setOeOpen] = useState(false);
  const [ixOpen, setIxOpen] = useState(false);
  const [loadedApptId, setLoadedApptId] = useState<number | null>(null);
  const [reportUploading, setReportUploading] = useState(false);
  // isRecallMode = true when a patient is loaded from prescription history (not from
  // the live queue).  The queue is NOT touched in recall mode — Now Serving stays
  // unchanged.  The doctor sees a distinct "Recall / Follow-up" indicator instead
  // of the queue status, and can optionally "Resume Consultation" to re-link the
  // patient to the queue if they are present in today's waiting list.
  const [isRecallMode, setIsRecallMode] = useState(false);

  const queueServing = queueData?.serving?.[0] ?? null;
  const queueWaiting = queueData?.waiting ?? [];
  const allQueue = [...(queueData?.serving ?? []), ...(queueData?.waiting ?? [])];

  // ── Doctor status from queue data (new fields added to GET /queue)
  const qDoctorStatus = (queueData as any)?.doctorStatus ?? null;
  const qBreakUntil = (queueData as any)?.breakUntil ?? null;
  const isOnBreak = qDoctorStatus === "busy" && !!qBreakUntil;
  const isDayEnded = qDoctorStatus === "offline";
  const qCompleted = (queueData as any)?.completed ?? 0;
  const qSkipped = (queueData as any)?.skipped?.length ?? 0;
  const qTotalToday = (queueData as any)?.totalToday ?? 0;
  const qAvgConsultMs = (queueData as any)?.avgConsultationMs ?? 0;
  const qFirstPatientTime = (queueData as any)?.firstPatientTime ?? null;
  const qLastPatientTime = (queueData as any)?.lastPatientTime ?? null;
  const allAppts = apptData?.appointments ?? [];

  // Patient list = unique patients from this doctor's prescription history,
  // scoped to the selected loader date (only patients seen on that date).
  const patientList = (() => {
    const seen = new Map<string, Prescription>();
    for (const p of rxHistory ?? []) {
      if (toLocalDateStr(new Date(p.createdAt)) !== loaderDate) continue;
      const key = `${(p.patientName ?? "").toLowerCase()}|${p.patientPhone ?? ""}`;
      if (!seen.has(key)) seen.set(key, p);
    }
    return Array.from(seen.values());
  })();

  // Build a phone-number set from ALL prescription history (not date-filtered)
  // so we can show "Continue Rx" next to any queue/appt entry that has a prior Rx.
  const prevRxByPhone = useMemo(() => {
    const s = new Set<string>();
    for (const p of rxHistory ?? []) {
      if (p.patientPhone) s.add(p.patientPhone);
    }
    return s;
  }, [rxHistory]);

  const filteredQ = patientSearch
    ? allQueue.filter(e => (e.patientName ?? "").toLowerCase().includes(patientSearch.toLowerCase()) || (e.patientPhone ?? "").includes(patientSearch) || String(e.serialNo).includes(patientSearch))
    : allQueue;
  const apptNumbered = allAppts.map((a, i) => ({ ...a, _serial: i + 1 }));
  const filteredA = patientSearch
    ? apptNumbered.filter(a => (a.patientName ?? "").toLowerCase().includes(patientSearch.toLowerCase()) || (a.patientPhone ?? "").includes(patientSearch) || String(a._serial).includes(patientSearch))
    : apptNumbered;
  const filteredP = patientSearch
    ? patientList.filter(p => (p.patientName ?? "").toLowerCase().includes(patientSearch.toLowerCase()) || (p.patientPhone ?? "").includes(patientSearch))
    : patientList.slice(0, 10);

  // ── Load templates
  // Returns a promise so callers can `await` it right after a create/edit/delete
  // mutation — guaranteeing the left panel (and the manager list) always reflect
  // the latest saved template database state, never a stale cached copy.
  const reloadTemplates = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch("/api/rx-templates", { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!res.ok) return;
      const data: RxTemplate[] = await res.json();
      const grouped: Record<string, RxTemplate[]> = {};
      data.forEach(t => {
        const arr = grouped[t.type] ? [...grouped[t.type], t] : [t];
        arr.sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));
        grouped[t.type] = arr;
      });
      setTemplates(grouped);
    } catch { /* keep last known-good templates on transient network errors */ }
  }, []);

  const reloadAllTemplates = useCallback(async () => {
    const token = localStorage.getItem("auth_token");
    try {
      const res = await fetch("/api/rx-templates?all=1", { headers: { Authorization: token ? `Bearer ${token}` : "" } });
      if (!res.ok) return;
      const data: any[] = await res.json();
      const grouped: Record<string, any[]> = {};
      data.forEach(t => { grouped[t.type] = grouped[t.type] ? [...grouped[t.type], t] : [t]; });
      setAllTemplatesGrouped(grouped);
    } catch { /* keep last good state */ }
  }, []);

  useEffect(() => { reloadTemplates(); }, [reloadTemplates]);

  // ── Break countdown (real-time HH:MM:SS)
  const breakCdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [breakCdStr, setBreakCdStr] = useState<string | null>(null);
  const [breakExpired, setBreakExpired] = useState(false);
  useEffect(() => {
    if (breakCdRef.current) clearInterval(breakCdRef.current);
    setBreakExpired(false);
    if (!isOnBreak || !qBreakUntil) { setBreakCdStr(null); return; }
    const tick = () => {
      const ms = new Date(qBreakUntil).getTime() - Date.now();
      if (ms <= 0) {
        setBreakCdStr("00:00:00"); setBreakExpired(true);
        if (breakCdRef.current) clearInterval(breakCdRef.current);
        return;
      }
      const h = Math.floor(ms / 3600000);
      const m = Math.floor((ms % 3600000) / 60000);
      const s = Math.floor((ms % 60000) / 1000);
      setBreakCdStr(`${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`);
    };
    tick();
    breakCdRef.current = setInterval(tick, 1000);
    return () => { if (breakCdRef.current) clearInterval(breakCdRef.current); };
  }, [isOnBreak, qBreakUntil]);

  // ── Medicine autocomplete
  // `suppressNextSearchRef` is set right before a programmatic (non-typing) change to
  // currentMed.brandName — e.g. selecting a suggestion — so the effect below skips
  // re-querying and reopening the dropdown for that one change. It resets itself
  // after being consumed once, so the next real keystroke searches normally.
  const suppressNextSearchRef = useRef(false);

  const searchMeds = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q || q.length < 1) { setMedSug([]); setShowSug(false); return; }
    debounceRef.current = setTimeout(() => {
      fetch(`/api/medicines?q=${encodeURIComponent(q)}&limit=10`)
        .then(r => r.json()).then(data => { setMedSug(data); setShowSug(data.length > 0); })
        .catch(() => {});
    }, 250);
  }, []);

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false;
      return;
    }
    searchMeds(currentMed.brandName);
  }, [currentMed.brandName]);

  // Close autocomplete on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (sugRef.current && !sugRef.current.contains(e.target as Node) && !medInputRef.current?.contains(e.target as Node)) {
        setShowSug(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selectMedSug = (s: MedSuggestion) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    suppressNextSearchRef.current = true;
    setCurrentMed(m => ({ ...m, brandName: s.brandName, genericName: s.genericName ?? "", strength: s.strength ?? "", dosageForm: s.dosageForm ?? "" }));
    setShowSug(false);
    setMedSug([]);
  };

  // ── Add medicine to list
  const addMedicine = () => {
    if (!currentMed.brandName.trim() && !currentMed.genericName.trim()) {
      toast({ title: L.enterMedName, variant: "destructive" }); return;
    }
    setMedicines(m => [...m, { ...currentMed, id: crypto.randomUUID() }]);
    setCurrentMed(emptyMed());
    setMedSug([]);
    setShowSug(false);
    medInputRef.current?.focus();
  };

  const removeMed = (id: string) => setMedicines(m => m.filter(x => x.id !== id));

  // ── Apply vitals from an appointment record onto patient state
  const applyApptVitals = (appt: Partial<(typeof allAppts)[0]> | undefined) => {
    if (!appt) return;
    setPatient(p => ({
      ...p,
      age: appt.patientAge != null ? String(appt.patientAge) : p.age,
      sex: appt.patientGender === "Male" ? "M" : appt.patientGender === "Female" ? "F" : appt.patientGender ? "O" : p.sex,
      bp: appt.bp ?? p.bp,
      pulse: appt.pulse ?? p.pulse,
      temp: appt.temp ?? p.temp,
      weight: appt.weight ?? p.weight,
      height: appt.height ?? p.height,
      hb: appt.hb ?? p.hb,
      sugar: appt.sugar ?? p.sugar,
      spo2: appt.spo2 ?? p.spo2,
      cc: appt.complaint ? (p.cc ? p.cc : appt.complaint) : p.cc,
      oe: appt.notes ? (p.oe ? p.oe : appt.notes) : p.oe,
      drugHistory: appt.medicalHistory ? (p.drugHistory ? p.drugHistory : appt.medicalHistory) : p.drugHistory,
      labReportUrl: appt.labReportUrl ?? p.labReportUrl,
      prescriptionUploadUrl: appt.prescriptionUploadUrl ?? p.prescriptionUploadUrl,
    }));
    // Auto-expand sections that now have content from the appointment so the
    // doctor can see (and edit) the pre-filled data immediately.
    if (appt.complaint) setCcOpen(true);
    if (appt.notes) setOeOpen(true);
  };

  // ── Fetch the most-recent prescription saved for a patient phone number.
  //    Used to auto-reload prior clinical data (CC, OE, IX, medicines, advice, etc.)
  //    whenever the same patient is opened again from the queue, appointment list,
  //    or prescription history.  Silent on any error — never blocks the load.
  const fetchLatestRxForPatient = useCallback(async (phone: string | null | undefined): Promise<Prescription | null> => {
    if (!phone) return null;
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/prescriptions?patientPhone=${encodeURIComponent(phone)}&limit=1`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) && data.length > 0 ? (data[0] as Prescription) : null;
    } catch { return null; }
  }, []);

  // ── Fetch patient profile photo by phone (best-effort, silent on failure)
  const fetchPatientPhoto = useCallback(async (phone: string | null | undefined) => {
    if (!phone) return;
    try {
      const token = localStorage.getItem("auth_token") || "";
      const r = await fetch(`/api/doctor/patient-photo?phone=${encodeURIComponent(phone)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) return;
      const data = await r.json();
      if (data.profilePicture) {
        setPatient(p => ({ ...p, photoUrl: data.profilePicture }));
      }
    } catch { /* silent */ }
  }, []);

  // ── Load patient from queue
  const loadFromQueue = async (entry: (typeof allQueue)[0]) => {
    const matchedAppt = allAppts.find(a => a.id === entry.appointmentId);
    setShowLoadPatient(false);
    setLoadedQueueId(entry.id);
    setLoadedApptId(matchedAppt?.id ?? null);
    setIsRecallMode(false);
    if (entry.status === "waiting") {
      try { await serveMut.mutateAsync({ id: entry.id }); refetchQ(); } catch {}
    }
    // Auto-restore the latest saved prescription for this patient so the
    // doctor doesn't have to re-enter prior clinical data (CC/OE/IX/medicines).
    const latestRx = await fetchLatestRxForPatient(entry.patientPhone);
    if (latestRx) {
      populateFromRx(latestRx);
      // Overlay today's fresh appointment vitals on top of historical values,
      // and ensure name/phone reflect the current queue entry.
      applyApptVitals(matchedAppt);
      setPatient(p => ({ ...p, name: entry.patientName ?? p.name, phone: entry.patientPhone ?? p.phone, photoUrl: undefined }));
    } else {
      setPatient(p => ({ ...p, name: entry.patientName ?? p.name, phone: entry.patientPhone ?? p.phone, photoUrl: undefined }));
      applyApptVitals(matchedAppt);
    }
    toast({ title: `${entry.patientName} ${L.loadedNowServing}` });
    fetchPatientPhoto(entry.patientPhone);
  };

  const loadFromAppt = async (appt: (typeof allAppts)[0]) => {
    setLoadedApptId(appt.id);
    setIsRecallMode(false);
    // Auto-restore the latest saved prescription for this patient.
    const latestRx = await fetchLatestRxForPatient(appt.patientPhone);
    if (latestRx) {
      populateFromRx(latestRx);
      // Overlay appointment's fresh vitals and ensure name/phone are current.
      applyApptVitals(appt);
      setPatient(p => ({ ...p, name: appt.patientName ?? p.name, phone: appt.patientPhone ?? p.phone, photoUrl: undefined }));
    } else {
      setPatient(p => ({ ...p, name: appt.patientName ?? p.name, phone: appt.patientPhone ?? p.phone, photoUrl: undefined }));
      applyApptVitals(appt);
    }
    setShowLoadPatient(false);
    toast({ title: `${appt.patientName} ${L.loaded}` });
    fetchPatientPhoto(appt.patientPhone);
  };

  // Load a patient from prescription history — fully restores all saved clinical
  // data (CC, OE, IX, medicines, advice, follow-up, notes) so the doctor can
  // review, edit, and save a new prescription without re-entering everything.
  // This is RECALL mode: the live queue is NOT touched — Now Serving stays as-is.
  const loadFromPatient = (p: Prescription) => {
    populateFromRx(p);
    // Ensure no queue or appointment link is inherited — this patient is recalled
    // from history, not from the live queue.
    setLoadedQueueId(null);
    setLoadedApptId(null);
    setIsRecallMode(true);
    setShowLoadPatient(false);
    toast({ title: `${p.patientName} ${L.loaded}` });
    fetchPatientPhoto(p.patientPhone);
  };

  // ── Resume Consultation: re-link a recalled patient to the live queue.
  // If the patient's phone is found in today's queue (waiting or serving), the
  // doctor is switched to queue mode for that entry so the prescription save will
  // auto-advance the queue.  If not found the recall mode is simply cleared and
  // the prescription is saved without touching the queue.
  const handleResumeConsultation = async () => {
    const matchedEntry = allQueue.find(
      e => e.patientPhone && patient.phone && e.patientPhone === patient.phone,
    );
    if (matchedEntry) {
      try {
        // Bring this entry back to "serving" via the recall API, then re-link.
        await recallMut.mutateAsync({ id: matchedEntry.id } as any);
        await refetchQ();
        setLoadedQueueId(matchedEntry.id);
        setIsRecallMode(false);
        toast({
          title: isBn
            ? `${patient.name} — পরামর্শ শুরু হয়েছে`
            : `${patient.name} — Consultation resumed`,
        });
      } catch {
        toast({ title: L.failed, variant: "destructive" });
      }
    } else {
      // Patient is not in today's queue — exit recall mode, save will proceed
      // without queue advancement.
      setIsRecallMode(false);
      toast({
        title: isBn ? "কিউতে নেই" : "Not in today's queue",
        description: isBn
          ? "প্রেসক্রিপশন স্বাভাবিকভাবে সেভ হবে।"
          : "Prescription will be saved without queue advancement.",
      });
    }
  };

  // ── Queue actions
  const queueAction = async (action: "next"|"skip"|"seen"|"recall", id?: number) => {
    // Guard: do not advance if the doctor is on break or the day has ended.
    if (action === "next" && (isOnBreak || isDayEnded)) {
      toast({
        title: isOnBreak
          ? (isBn ? "বিরতিতে আছেন" : "Doctor is on break")
          : (isBn ? "দিন শেষ হয়েছে" : "Day has ended"),
        variant: "destructive",
      });
      return;
    }
    try {
      if (action === "next") {
        // callNext expects a queue ENTRY id (not the doctor profile id).
        // Use the currently-serving entry's id; fall back to the entry the
        // doctor explicitly loaded so the API can resolve the doctorId.
        const entryId = queueServing?.id ?? loadedQueueId;
        if (!entryId) {
          toast({ title: isBn ? "কোনো সক্রিয় রোগী নেই" : "No active patient in queue" });
          return;
        }
        await callNext.mutateAsync({ id: entryId });
        const fresh = await refetchQ();
        const nextServing = (fresh.data as any)?.serving?.[0] ?? null;
        if (nextServing) {
          resetForm();
          await loadFromQueue(nextServing);
        } else {
          // No more waiting patients — queue is complete for today.
          toast({
            title: isBn ? "আজকের কিউ সম্পন্ন" : "Today's Queue Completed",
            description: isBn ? "আজকের সব রোগী দেখা হয়েছে।" : "All patients for today have been seen.",
          });
        }
      } else if (action === "skip" && id) {
        await skipMut.mutateAsync({ id } as any);
        refetchQ();
      } else if (action === "seen" && id) {
        await seenMut.mutateAsync({ id } as any);
        refetchQ();
      } else if (action === "recall" && id) {
        await recallMut.mutateAsync({ id } as any);
        refetchQ();
      }
    } catch { toast({ title: L.failed, variant: "destructive" }); }
  };

  // ── Apply template
  const applyTemplate = (t: RxTemplate) => {
    if (t.type === "cc") setPatient(p => ({ ...p, cc: p.cc ? `${p.cc}\n${t.content}` : t.content }));
    else if (t.type === "oe") setPatient(p => ({ ...p, oe: p.oe ? `${p.oe}\n${t.content}` : t.content }));
    else if (t.type === "ix") {
      const chips = t.content.split(",").map(s => s.trim()).filter(Boolean);
      setPatient(p => ({ ...p, ixChips: [...new Set([...p.ixChips, ...chips])] }));
    }
    else if (t.type === "advice") setAdvice(a => a ? `${a}\n${t.content}` : t.content);
    else if (t.type === "dose") setCurrentMed(m => ({ ...m, dose: t.content }));
    else if (t.type === "timing") setCurrentMed(m => ({ ...m, timing: t.content }));
    else if (t.type === "duration") {
      const match = t.content.match(/^(\d+)/);
      const num = match ? match[1] : t.content;
      const isMonth = /M|মাস/i.test(t.content);
      const isWeek = /W|সপ্তাহ/i.test(t.content);
      setCurrentMed(m => ({ ...m, durationNum: num, durationUnit: isMonth ? "M" : isWeek ? "W" : "D" }));
    }
    else if (t.type === "treatment" || t.type === "protocol") setTreatmentNote(n => n ? `${n}\n${t.content}` : t.content);
    else if (t.type === "followup") setTreatmentNote(n => n ? `${n}\n${t.content}` : t.content);
    toast({ title: `${L.templateApplied}: ${t.title}`, duration: 1500 });
  };

  // ── Save template (create or edit)
  const saveTemplate = async () => {
    if (!newTmpl.title.trim() || !newTmpl.content.trim()) {
      toast({ title: L.titleContentRequired, variant: "destructive" }); return;
    }
    try {
      const token = localStorage.getItem("auth_token") || "";
      const body = {
        type: newTmpl.type,
        title: newTmpl.title,
        content: newTmpl.content,
        department: newTmpl.department.trim() || null,
        isFavorite: newTmpl.isFavorite,
      };
      // Builtins have negative IDs — always POST to create a new custom copy when editing them.
      const isBuiltinEdit = editingTmplId !== null && editingTmplId < 0;
      const res = await fetch(!isBuiltinEdit && editingTmplId ? `/api/rx-templates/${editingTmplId}` : "/api/rx-templates", {
        method: !isBuiltinEdit && editingTmplId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Save failed"));
      toast({ title: (!isBuiltinEdit && editingTmplId) ? L.templateUpdated : L.templateSaved });
      setShowTemplateForm(false);
      setEditingTmplId(null);
      setNewTmpl({ type: "advice", title: "", content: "", department: "", isFavorite: false });
      await reloadTemplates();
    } catch { toast({ title: L.templateSaveFailed, variant: "destructive" }); }
  };

  const editTemplate = (t: RxTemplate) => {
    setEditingTmplId(t.id);
    setNewTmpl({ type: t.type, title: t.title, content: t.content, department: t.department ?? "", isFavorite: !!t.isFavorite });
    setShowTemplateForm(true);
  };

  const deleteTemplate = async (t: RxTemplate) => {
    if (!window.confirm(L.deleteTmplConfirm)) return;
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/rx-templates/${t.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error(await res.text().catch(() => "Delete failed"));
      toast({ title: L.templateDeleted });
      await reloadTemplates();
    } catch { toast({ title: L.templateSaveFailed, variant: "destructive" }); }
  };

  const toggleFavorite = async (t: RxTemplate) => {
    try {
      const token = localStorage.getItem("auth_token") || "";
      const res = await fetch(`/api/rx-templates/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: t.type, title: t.title, content: t.content, department: t.department ?? null, isFavorite: !t.isFavorite }),
      });
      if (!res.ok) throw new Error(await res.text().catch(() => "Update failed"));
      await reloadTemplates();
    } catch { toast({ title: L.templateSaveFailed, variant: "destructive" }); }
  };

  const hideTemplate = async (t: any, hide: boolean) => {
    const token = localStorage.getItem("auth_token") || "";
    await fetch(`/api/rx-templates/${t.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isHidden: hide }),
    });
    await Promise.all([reloadTemplates(), reloadAllTemplates()]);
  };

  const moveTemplate = async (t: any, dir: -1 | 1) => {
    const list = [...(allTemplatesGrouped[t.type] ?? [])];
    const idx = list.findIndex((x: any) => x.id === t.id);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= list.length) return;
    const swap = list[swapIdx];
    const token = localStorage.getItem("auth_token") || "";
    const tOrder = t.sortOrder ?? idx;
    const sOrder = swap.sortOrder ?? swapIdx;
    await Promise.all([
      fetch(`/api/rx-templates/${t.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ sortOrder: sOrder === tOrder ? tOrder - dir : sOrder }) }),
      fetch(`/api/rx-templates/${swap.id}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ sortOrder: sOrder === tOrder ? sOrder + dir : tOrder }) }),
    ]);
    await Promise.all([reloadTemplates(), reloadAllTemplates()]);
  };

  const restoreDefaultTemplates = async () => {
    if (!window.confirm(isBn ? "সকল ডিফল্ট টেমপ্লেট পুনরুদ্ধার করবেন? লুকানো ও মুছে ফেলা ডিফল্টগুলো ফিরে আসবে।" : "Restore all default templates? Hidden and deleted defaults will be brought back.")) return;
    const token = localStorage.getItem("auth_token") || "";
    const res = await fetch("/api/rx-templates/restore-defaults", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) toast({ title: isBn ? "ডিফল্ট টেমপ্লেট পুনরুদ্ধার হয়েছে" : "Default templates restored" });
    else toast({ title: L.templateSaveFailed, variant: "destructive" });
    await Promise.all([reloadTemplates(), reloadAllTemplates()]);
  };

  // ── Populate form from an existing prescription (edit / duplicate / reprint)
  const populateFromRx = (rx: Prescription) => {
    const v = rx.vitals ?? "";
    const grab = (re: RegExp) => { const m = v.match(re); return m ? m[1].trim() : ""; };
    // Split stored investigations back into chip-selectable items vs free-text.
    const savedIxList = (rx.investigations ?? "").split(",").map(s => s.trim()).filter(Boolean);
    const savedIxChips = savedIxList.filter(s => IX_CHIPS.includes(s));
    const savedIxCustom = savedIxList.filter(s => !IX_CHIPS.includes(s)).join(", ");
    setPatient(() => ({
      ...emptyPatient(),
      name: rx.patientName ?? "",
      age: rx.patientAge != null ? String(rx.patientAge) : "",
      sex: rx.patientGender === "Male" ? "M" : rx.patientGender === "Female" ? "F" : rx.patientGender ? "O" : "M",
      phone: rx.patientPhone ?? "",
      weight: rx.patientWeight ?? "",
      height: rx.patientHeight ?? "",
      bp: grab(/BP:\s*([^|]+)/),
      pulse: grab(/Pulse:\s*([^|]+)/),
      temp: grab(/Temp:\s*([^|]+)/),
      spo2: grab(/SpO2:\s*([^|]+)/),
      hb: grab(/Hb:\s*([^|]+)/),
      sugar: grab(/Sugar:\s*([^|]+)/),
      cc: rx.chiefComplaint ?? "",
      oe: rx.examination ?? "",
      ixChips: savedIxChips,
      ixCustom: savedIxCustom,
    }));
    // Auto-expand any section that already has saved content so loaded data is
    // never hidden behind a collapsed panel; stays collapsed if empty.
    setCcOpen(!!rx.chiefComplaint);
    setOeOpen(!!rx.examination);
    setIxOpen(!!rx.investigations);
    setDiagnosis(rx.diagnosis ?? "");
    setAdvice(rx.advice ?? "");
    setTreatmentNote(rx.notes ?? "");
    setFollowUpDate(rx.followUpDate ?? "");
    setMedicines((rx.items ?? []).map(it => {
      const dur = (it.duration ?? "").trim();
      const dm = dur.match(/(\d+)/);
      const isMonth = /মাস|month/i.test(dur);
      const isWeek = /সপ্তাহ|week/i.test(dur);
      return {
        id: crypto.randomUUID(),
        brandName: it.medicineName ?? "",
        genericName: it.genericName ?? "",
        strength: it.strength ?? "",
        dosageForm: it.dosageForm ?? "",
        dose: it.dose ?? "",
        timing: it.mealTiming ?? "",
        durationNum: dm ? dm[1] : "",
        durationUnit: isMonth ? "M" : isWeek ? "W" : "D",
        instructions: it.instruction ?? "",
      };
    }));
  };

  // ── Generate the verification QR for a reference number
  const genQr = async (referenceNo: string | null | undefined): Promise<string | null> => {
    if (!referenceNo) return null;
    try {
      const verifyUrl = `${window.location.origin}${import.meta.env.BASE_URL}verify/${referenceNo}`;
      return await QRCode.toDataURL(verifyUrl, { margin: 1, width: 200 });
    } catch { return null; }
  };

  // ── Load existing prescription from URL:
  //    ?id= edit, ?duplicate= copy, ?reprint= open immutable print view.
  //    Re-runs when the query string changes so switching IDs in-session is reactive.
  const lastLoadedRef = useRef<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(searchStr);
    const idStr = params.get("id");
    const dupStr = params.get("duplicate");
    const reprintStr = params.get("reprint");
    const loadId = idStr || dupStr || reprintStr;
    if (!loadId) { lastLoadedRef.current = null; return; }
    const loadKey = `${reprintStr ? "r" : idStr ? "e" : "d"}:${loadId}`;
    if (lastLoadedRef.current === loadKey) return;
    lastLoadedRef.current = loadKey;
    getPrescription(Number(loadId)).then(async rx => {
      populateFromRx(rx);
      if (reprintStr) {
        // Reprint: open the existing prescription's print view without mutating it.
        setEditingId(rx.id);
        const qr = await genQr(rx.referenceNo);
        setQrDataUrl(qr);
        setSavedRx(rx);
        setMode("saved");
      } else if (idStr) {
        setEditingId(rx.id);
      }
    }).catch(() => {});
  }, [searchStr]);

  // ── Reset form to blank state (for next patient)
  const resetForm = () => {
    setPatient(emptyPatient());
    setCcOpen(false);
    setOeOpen(false);
    setIxOpen(false);
    setCurrentMed(emptyMed());
    setMedicines([]);
    setAdvice("");
    setTreatmentNote("");
    setFollowUpDate("");
    setDiagnosis("");
    setSavedRx(null);
    setEditingId(null);
    setQrDataUrl(null);
    setLoadedQueueId(null);
    setLoadedApptId(null);
    setIsRecallMode(false);
    setLoc("/doctor/new-prescription");
  };

  // ── Upload an investigation report file (PDF / JPG / PNG)
  const uploadReport = async (file: File) => {
    setReportUploading(true);
    try {
      const token = localStorage.getItem("auth_token") || "";
      const urlRes = await fetch("/api/storage/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type, category: "prescriptions" }),
      });
      if (!urlRes.ok) throw new Error("URL request failed");
      const { uploadURL, objectPath } = await urlRes.json();
      const putRes = await fetch(uploadURL, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
      if (!putRes.ok) throw new Error("Upload failed");
      setPatient(p => ({ ...p, labReportUrl: objectPath }));
      // Also persist to the linked appointment so it appears in patient timeline.
      if (loadedApptId) {
        await fetch(`/api/appointments/${loadedApptId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ labReportUrl: objectPath }),
        });
      }
      toast({ title: L.reportUploaded });
    } catch {
      toast({ title: L.failed, variant: "destructive" });
    } finally {
      setReportUploading(false);
    }
  };

  // ── Submit prescription
  const handleSave = async (printAfter = false, explicitStatus: "final" | "draft" | "pending_investigation" = "final") => {
    if (!patient.name.trim()) {
      toast({ title: L.enterPatientName, variant: "destructive" }); return;
    }
    // Investigations-only prescriptions (lab referrals, pathology orders) are
    // valid prescriptions — do not require at least one medicine.
    const allIx = [...patient.ixChips, ...(patient.ixCustom ? patient.ixCustom.split(",").map(s => s.trim()).filter(Boolean) : [])].join(", ");
    // Auto-promote to "pending_investigation" when there are IX tests but no medicines.
    const status: "final" | "draft" | "pending_investigation" =
      explicitStatus === "final" && allIx.length > 0 && medicines.length === 0
        ? "pending_investigation"
        : explicitStatus;
    const vitalsStr = [
      patient.bp && `BP: ${patient.bp}`,
      patient.pulse && `Pulse: ${patient.pulse}`,
      patient.temp && `Temp: ${patient.temp}`,
      patient.spo2 && `SpO2: ${patient.spo2}`,
      patient.hb && `Hb: ${patient.hb}`,
      patient.sugar && `Sugar: ${patient.sugar}`,
    ].filter(Boolean).join("  |  ");
    const payload = {
      doctorId: doctor?.id ?? 0,
      status,
      patientName: patient.name,
      patientAge: patient.age ? Number(patient.age) : undefined,
      patientGender: patient.sex === "M" ? "Male" : patient.sex === "F" ? "Female" : "Other",
      patientPhone: patient.phone || undefined,
      patientWeight: patient.weight || undefined,
      patientHeight: patient.height || undefined,
      vitals: vitalsStr || undefined,
      chiefComplaint: patient.cc || undefined,
      examination: patient.oe || undefined,
      diagnosis: diagnosis || undefined,
      investigations: allIx || undefined,
      advice: advice || undefined,
      followUpDate: followUpDate || undefined,
      notes: treatmentNote || undefined,
      items: medicines.map(m => ({
        medicineName: m.brandName || m.genericName,
        genericName: m.genericName || undefined,
        strength: m.strength || undefined,
        dosageForm: m.dosageForm || undefined,
        dose: m.dose || undefined,
        mealTiming: m.timing || undefined,
        duration: m.durationNum.trim()
          ? `${m.durationNum.trim()} ${m.durationUnit === "D" ? "দিন" : m.durationUnit === "W" ? "সপ্তাহ" : "মাস"}`
          : undefined,
        instruction: m.instructions || undefined,
      })),
    };
    try {
      const result = editingId
        ? await updateRx.mutateAsync({ id: editingId, data: payload })
        : await createRx.mutateAsync({ data: payload });
      setEditingId(result.id);

      // QR for verification (only final prescriptions get a reference number)
      const qr = await genQr(result.referenceNo);

      // Integrated queue: auto-advance after a finalised prescription.
      const wasInQueue = status === "final" && loadedQueueId != null;
      let nextPatient: any = null;
      if (wasInQueue) {
        try {
          // Mark the current patient as seen first.
          await seenMut.mutateAsync({ id: loadedQueueId! } as any);
          // callNext expects a queue ENTRY id — use loadedQueueId so the API
          // can resolve the doctorId and promote the next waiting patient.
          await callNext.mutateAsync({ id: loadedQueueId! });
          const fresh = await refetchQ();
          nextPatient = (fresh.data as any)?.serving?.[0] ?? null;
        } catch {}
        setLoadedQueueId(null);
      }

      if (printAfter) {
        // Open the print view in a NEW TAB — current tab stays open for next patient.
        window.open(`/doctor/new-prescription?reprint=${result.id}`, "_blank");

        // Auto-advance to next queue patient in the current tab.
        if (nextPatient) {
          resetForm();
          await loadFromQueue(nextPatient);
        } else if (wasInQueue) {
          resetForm();
          toast({ title: isBn ? "আর কোনো রোগী নেই" : "No More Patients in Queue", description: isBn ? "আজকের সব রোগী দেখা হয়েছে।" : "All patients for today have been seen." });
        } else {
          // Not in queue mode — just reset for a fresh prescription
          resetForm();
          toast({ title: isBn ? "সেভ হয়েছে!" : "Prescription saved!", description: result.referenceNo ?? `#${result.id}` });
        }
      } else {
        // Save Only / Save Draft: show preview in same tab as before.
        const rxData = { ...result, patientAgeUnit: patient.ageUnit };
        setSavedRx(rxData);
        setQrDataUrl(qr);
        setMode("saved");
        setPendingNext(nextPatient);
        setIsRecallMode(false);
      }
    } catch {
      toast({ title: L.saveFailed, variant: "destructive" });
    }
  };

  const handleNewRx = () => {
    setMode("write");
    setSavedRx(null);
    setEditingId(null);
    setLoadedQueueId(null);
    setIsRecallMode(false);
    setQrDataUrl(null);
    setPatient(emptyPatient());
    setCurrentMed(emptyMed());
    setMedicines([]);
    setAdvice("");
    setTreatmentNote("");
    setFollowUpDate("");
    setDiagnosis("");
    setLoc("/doctor/new-prescription");
    // Auto-load the next patient that was staged when the queue advanced.
    const next = pendingNext;
    setPendingNext(null);
    if (next) void loadFromQueue(next);
  };

  // ── Duplicate: keep current form data but save as a brand-new prescription
  const handleDuplicate = () => {
    setEditingId(null);
    setSavedRx(null);
    setQrDataUrl(null);
    setLoadedQueueId(null);
    setMode("write");
    setLoc("/doctor/new-prescription");
    toast({ title: L.duplicate });
  };

  // ── Persist per-doctor Rx settings (header + page setup)
  const saveSettings = async () => {
    if (!settingsForm) return;
    const input: DoctorRxSettingsInput = {
      headerName: settingsForm.headerName ?? null,
      headerDegree: settingsForm.headerDegree ?? null,
      headerDesignation: settingsForm.headerDesignation ?? null,
      headerBmdc: settingsForm.headerBmdc ?? null,
      hospitalName: settingsForm.hospitalName ?? null,
      headerAddress: settingsForm.headerAddress ?? null,
      headerPhone: settingsForm.headerPhone ?? null,
      headerEmail: settingsForm.headerEmail ?? null,
      signatureText: settingsForm.signatureText ?? null,
      signatureImage: settingsForm.signatureImage ?? null,
      footerText: settingsForm.footerText ?? null,
      pageSize: settingsForm.pageSize,
      marginTop: settingsForm.marginTop,
      marginRight: settingsForm.marginRight,
      marginBottom: settingsForm.marginBottom,
      marginLeft: settingsForm.marginLeft,
      headerHeight: settingsForm.headerHeight,
      footerHeight: settingsForm.footerHeight,
      showHeader: settingsForm.showHeader,
      showQr: settingsForm.showQr,
      showSignature: settingsForm.showSignature,
      showFooter: settingsForm.showFooter,
    };
    try {
      await updateSettings.mutateAsync({ data: input });
      toast({ title: L.settingsSaved });
      setShowHeaderDlg(false);
      setShowPageDlg(false);
    } catch { toast({ title: L.settingsSaveFailed, variant: "destructive" }); }
  };

  // ── Quick break helpers
  const handleTakeBreak = async (minutes: number) => {
    const end = new Date(Date.now() + minutes * 60 * 1000);
    try {
      await updateStatusRx.mutateAsync({ data: { status: "busy", breakUntil: end.toISOString() } });
      await refetchQ();
      toast({ title: `Break started — ${minutes} min`, description: `Resume by ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` });
    } catch { toast({ title: "Failed to start break", variant: "destructive" }); }
  };
  const handleEndBreak = async () => {
    try {
      await updateStatusRx.mutateAsync({ data: { status: "online" } });
      await refetchQ();
      toast({ title: "Break ended — status set to Available" });
    } catch { toast({ title: "Failed to end break", variant: "destructive" }); }
  };

  // ── Auth guard
  if (isLoading || !user) return <div className="min-h-screen flex items-center justify-center">{L.loading}</div>;

  // ── Print view
  if (mode === "saved" && savedRx) {
    return <PrintView rx={savedRx} doctor={doctor} settings={settingsForm} qrDataUrl={qrDataUrl} adminQrEnabled={adminQrEnabled} nextPatientLabel={pendingNext ? `#${pendingNext.serialNo} ${pendingNext.patientName}` : null} onNewRx={handleNewRx} onBack={() => setMode("write")} onDuplicate={handleDuplicate} L={L} />;
  }

  /* ── RENDER ──────────────────────────────────────────────────────── */
  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ══ TOP NAV BAR ══════════════════════════════════════════════ */}
      <header className="flex items-center justify-between gap-2 border-b bg-background px-3 py-1.5 shrink-0 print:hidden z-20 relative">
        {/* Left: logo + title */}
        <div className="flex items-center gap-2 shrink-0">
          <Stethoscope className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 hidden md:inline">{L.navNewRx}</span>
          {editingId != null && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px] border-amber-400 text-amber-600">{L.editingBadge}</Badge>
          )}
        </div>

        {/* Center nav (minimal) + live queue badge */}
        <nav className="flex items-center gap-1.5 overflow-x-auto">
          <NavBtn href="/doctor/dashboard" icon={<LayoutDashboard className="h-3 w-3" />} label={L.navDashboard} />

          {/* ── Quick break controls ── */}
          {isOnBreak ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 px-2 text-xs gap-1 shrink-0 border-green-400 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
              onClick={handleEndBreak}
              disabled={updateStatusRx.isPending}
            >
              <Coffee className="h-3 w-3" />
              <span className="hidden sm:inline">End Break</span>
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs gap-1 shrink-0 border-amber-400 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                  disabled={updateStatusRx.isPending}
                >
                  <Coffee className="h-3 w-3" />
                  <span className="hidden sm:inline">Take Break</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuLabel className="text-xs">Break Duration</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {[5, 10, 15, 30, 45, 60].map(min => (
                  <DropdownMenuItem key={min} className="text-sm gap-2" onClick={() => handleTakeBreak(min)}>
                    <Timer className="h-3.5 w-3.5 text-muted-foreground" />
                    {min < 60 ? `${min} minutes` : "1 hour"}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* ── Live Queue Status Badge ── always visible, click to expand panel */}
          <button
            type="button"
            onClick={() => setShowQueue(v => !v)}
            className={cn(
              "flex items-center gap-1.5 h-7 px-2 rounded-md border text-xs font-medium transition-colors shrink-0",
              isDayEnded
                ? "border-red-400 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-300 dark:border-red-700"
                : isOnBreak
                  ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700"
                  : queueServing
                    ? "border-green-400 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-300 dark:border-green-700"
                    : queueWaiting.length > 0
                      ? "border-amber-400 bg-amber-50 text-amber-800 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-700"
                      : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
            )}
          >
            {/* Status dot */}
            {isDayEnded ? (
              <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
            ) : isOnBreak ? (
              <Coffee className="h-3 w-3 shrink-0" />
            ) : queueServing ? (
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            ) : queueWaiting.length > 0 ? (
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
            ) : (
              <Activity className="h-3 w-3 shrink-0" />
            )}

            {/* Label */}
            {isDayEnded ? (
              <span className="hidden sm:inline">{L.statusDayEnded}</span>
            ) : isOnBreak ? (
              <span className="hidden sm:inline font-mono">{breakCdStr ?? L.statusOnBreak}</span>
            ) : queueServing ? (
              <span className="hidden sm:inline max-w-[120px] truncate">
                #{queueServing.serialNo} {queueServing.patientName}
              </span>
            ) : (
              <span className="hidden sm:inline">{L.queueColon}</span>
            )}

            {/* Waiting count pill (hide when day ended) */}
            {!isDayEnded && queueWaiting.length > 0 && (
              <span className={cn(
                "flex items-center justify-center h-4 min-w-[1.25rem] px-1 rounded-full text-[10px] font-bold shrink-0",
                "bg-amber-500 text-white"
              )}>
                {queueWaiting.length}
              </span>
            )}

            {/* Chevron */}
            {showQueue ? <ChevronUp className="h-3 w-3 shrink-0" /> : <ChevronDown className="h-3 w-3 shrink-0" />}
          </button>
        </nav>

        {/* Right: actions */}
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setShowHeaderDlg(true)}>
            <Settings2 className="h-3.5 w-3.5" /><span className="hidden lg:inline">{L.headerSettings}</span>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setShowPageDlg(true)}>
            <FileCog className="h-3.5 w-3.5" /><span className="hidden lg:inline">{L.pageSetup}</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setLang(lang === "en" ? "bn" : "en")}>
            <Languages className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleTheme}>
            {theme === "dark" ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => setMode("saved")}>
            {L.preview}
          </Button>
          {/* Pending Investigation indicator — shown when IX tests exist but no medicines */}
          {(patient.ixChips.length > 0 || patient.ixCustom.trim()) && medicines.length === 0 && (
            <Badge variant="outline" className="h-6 px-1.5 text-[10px] border-amber-400 text-amber-700 bg-amber-50 dark:bg-amber-950/20 gap-1 shrink-0 hidden sm:flex">
              <FlaskConical className="h-3 w-3" />{L.pendingInvBadge}
            </Badge>
          )}
          <Button size="sm" className="h-7 px-2 text-xs gap-1 bg-teal-600 hover:bg-teal-700" onClick={() => handleSave(true, "final")} disabled={createRx.isPending || updateRx.isPending}>
            <Printer className="h-3 w-3" />{L.savePrint}
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs gap-1" onClick={() => handleSave(false, "draft")} disabled={createRx.isPending || updateRx.isPending}>
            <Save className="h-3 w-3" />{L.saveDraft}
          </Button>
          <Button variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={() => handleSave(false, "final")} disabled={createRx.isPending || updateRx.isPending}>
            {L.saveOnly}
          </Button>
        </div>
      </header>

      {/* ══ 3-COLUMN BODY ════════════════════════════════════════════ */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── LEFT PANEL — Patient Info ──────────────────────────── */}
        <aside className="w-52 border-r flex flex-col bg-muted/10 shrink-0 overflow-hidden">
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1.5 text-xs">

              {/* Load Patient button */}
              <button
                type="button"
                onClick={() => setShowLoadPatient(v => !v)}
                className="w-full flex items-center justify-between px-2 py-1.5 rounded bg-teal-600 hover:bg-teal-700 text-white text-xs font-medium transition-colors"
              >
                <span className="flex items-center gap-1"><Search className="h-3 w-3" />{L.loadPatient}</span>
                {showLoadPatient ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              </button>

              {/* Patient search panel */}
              {showLoadPatient && (
                <div className="border rounded bg-background p-2 space-y-1.5">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-muted-foreground shrink-0" />
                    <Input
                      type="date"
                      className="h-6 text-xs flex-1"
                      value={loaderDate}
                      onChange={e => setLoaderDate(e.target.value)}
                    />
                  </div>
                  <Input
                    className="h-6 text-xs"
                    placeholder={L.searchPlaceholder}
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                  />
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {filteredQ.length > 0 && <p className="text-[10px] text-muted-foreground font-semibold uppercase">{L.queueLabel}</p>}
                    {filteredQ.map(e => (
                      <div key={e.id} className={cn("flex items-start gap-1 rounded border text-xs", e.status === "serving" ? "border-green-400 bg-green-50 dark:bg-green-950/20" : "border-transparent")}>
                        <button type="button" onClick={() => loadFromQueue(e)}
                          className="flex-1 text-left px-2 py-1 hover:bg-primary/10 rounded min-w-0">
                          <span className="font-medium">#{e.serialNo} {e.patientName}</span>
                          {e.status === "serving" && <span className="text-green-600 ml-1">▶</span>}
                          {e.patientPhone && <p className="text-[10px] text-muted-foreground truncate">{e.patientPhone}</p>}
                        </button>
                        {prevRxByPhone.has(e.patientPhone ?? "") && (
                          <button type="button" onClick={() => loadFromQueue(e)}
                            className="shrink-0 flex items-center gap-0.5 px-1 py-1 text-[9px] text-teal-700 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded hover:bg-teal-100 transition-colors mt-0.5 mr-0.5 whitespace-nowrap">
                            <RotateCcw className="h-2.5 w-2.5" />{L.continueRx}
                          </button>
                        )}
                      </div>
                    ))}
                    {filteredA.length > 0 && <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">{L.apptLabel}</p>}
                    {filteredA.map(a => (
                      <div key={a.id} className="flex items-start gap-1 rounded border border-transparent text-xs">
                        <button type="button" onClick={() => loadFromAppt(a)}
                          className="flex-1 text-left px-2 py-1 hover:bg-primary/10 rounded min-w-0">
                          <span className="font-medium">#{a._serial} {a.patientName}</span>
                          {a.patientPhone && <p className="text-[10px] text-muted-foreground truncate">{a.patientPhone}</p>}
                        </button>
                        {prevRxByPhone.has(a.patientPhone ?? "") && (
                          <button type="button" onClick={() => loadFromAppt(a)}
                            className="shrink-0 flex items-center gap-0.5 px-1 py-1 text-[9px] text-teal-700 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded hover:bg-teal-100 transition-colors mt-0.5 mr-0.5 whitespace-nowrap">
                            <RotateCcw className="h-2.5 w-2.5" />{L.continueRx}
                          </button>
                        )}
                      </div>
                    ))}
                    {filteredP.length > 0 && <p className="text-[10px] text-muted-foreground font-semibold uppercase mt-1">{L.patientsLabel}</p>}
                    {filteredP.slice(0, 8).map(p => (
                      <button key={`p${p.id}`} type="button" onClick={() => { loadFromPatient(p); setShowLoadPatient(false); }}
                        className="w-full text-left px-2 py-1 rounded hover:bg-primary/10 border border-transparent text-xs flex items-start gap-1">
                        <RotateCcw className="h-2.5 w-2.5 text-teal-600 shrink-0 mt-0.5" />
                        <span className="min-w-0">
                          <span className="font-medium">{p.patientName}</span>
                          {p.patientPhone && <p className="text-[10px] text-muted-foreground truncate">{p.patientPhone}</p>}
                        </span>
                      </button>
                    ))}
                    {filteredQ.length === 0 && filteredA.length === 0 && filteredP.length === 0 && (
                      <p className="text-muted-foreground text-[10px] py-2 text-center">{L.noPatientFound}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Patient fields */}
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  {patient.photoUrl ? (
                    <img src={storageUrl(patient.photoUrl) ?? patient.photoUrl} alt={patient.name} className="h-7 w-7 rounded-full object-cover border border-border shrink-0" />
                  ) : patient.name ? (
                    <div className="h-7 w-7 rounded-full bg-muted border border-border flex items-center justify-center shrink-0">
                      <span className="text-[10px] font-semibold text-muted-foreground">{patient.name.charAt(0).toUpperCase()}</span>
                    </div>
                  ) : null}
                  <label className="text-[10px] text-muted-foreground font-semibold">{L.patientName}</label>
                </div>
                <Input className="h-6 text-xs" placeholder={L.typeNamePlaceholder} value={patient.name} onChange={e => setPatient(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{L.age}</label>
                  <div className="flex gap-1 mt-0.5">
                    <Input className="h-6 text-xs flex-1 min-w-0" type="number" placeholder="25" value={patient.age} onChange={e => setPatient(p => ({ ...p, age: e.target.value }))} />
                    <select className="h-6 text-xs border rounded bg-background px-1" value={patient.ageUnit} onChange={e => setPatient(p => ({ ...p, ageUnit: e.target.value }))}>
                      <option value="Y">Y</option><option value="M">M</option><option value="D">D</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{L.gender}</label>
                  <select className="h-6 w-full text-xs border rounded bg-background px-1 mt-0.5" value={patient.sex} onChange={e => setPatient(p => ({ ...p, sex: e.target.value }))}>
                    <option value="M">{L.male}</option><option value="F">{L.female}</option><option value="O">{L.other}</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold">{L.mobile}</label>
                <Input className="h-6 text-xs mt-0.5" placeholder="01XXXXXXXXX" value={patient.phone} onChange={e => setPatient(p => ({ ...p, phone: e.target.value }))} />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground font-semibold">{L.address}</label>
                <Input className="h-6 text-xs mt-0.5" placeholder={L.addressPlaceholder} value={patient.address} onChange={e => setPatient(p => ({ ...p, address: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-1">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{L.regNo}</label>
                  <Input className="h-6 text-xs mt-0.5" placeholder={L.regNo} value={patient.regNo} onChange={e => setPatient(p => ({ ...p, regNo: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold">{L.date}</label>
                  <Input className="h-6 text-xs mt-0.5" type="date" value={patient.date} onChange={e => setPatient(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>

              <Separator className="my-1" />

              {/* Vitals */}
              <div>
                <div className="flex items-center gap-1 mb-0.5">
                  <Activity className="h-3 w-3 text-teal-700 dark:text-teal-400" />
                  <label className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{L.vitals}</label>
                  {(patient.bp || patient.weight || patient.height || patient.pulse || patient.temp) && (
                    <span className="text-[9px] text-green-600">● {L.assistantTag}</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <div>
                    <label className="text-[9px] text-muted-foreground">BP (mmHg)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="120/80" value={patient.bp} onChange={e => setPatient(p => ({ ...p, bp: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Pulse (bpm)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="72" value={patient.pulse} onChange={e => setPatient(p => ({ ...p, pulse: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Temp (°F)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="98.6" value={patient.temp} onChange={e => setPatient(p => ({ ...p, temp: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Weight (kg)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="65" value={patient.weight} onChange={e => setPatient(p => ({ ...p, weight: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Height (cm)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="170" value={patient.height} onChange={e => setPatient(p => ({ ...p, height: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">SpO2 (%)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="98" value={patient.spo2} onChange={e => setPatient(p => ({ ...p, spo2: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Hb (g/dL)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="13.5" value={patient.hb} onChange={e => setPatient(p => ({ ...p, hb: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[9px] text-muted-foreground">Sugar (mmol/L)</label>
                    <Input className="h-6 text-xs mt-0.5" placeholder="5.6" value={patient.sugar} onChange={e => setPatient(p => ({ ...p, sugar: e.target.value }))} />
                  </div>
                </div>
              </div>

              <Separator className="my-1" />
              <div>
                <label className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{L.attachments}</label>
                <div className="flex flex-col gap-1 mt-0.5">
                  {patient.labReportUrl && (
                    <button type="button" className="text-[10px] text-blue-600 dark:text-blue-400 underline flex items-center gap-1 text-left" onClick={() => downloadObject(patient.labReportUrl, "lab-report")}>
                      <FileDown className="h-3 w-3" /> {L.labReport}
                    </button>
                  )}
                  {patient.prescriptionUploadUrl && (
                    <button type="button" className="text-[10px] text-blue-600 dark:text-blue-400 underline flex items-center gap-1 text-left" onClick={() => downloadObject(patient.prescriptionUploadUrl, "previous-prescription")}>
                      <FileDown className="h-3 w-3" /> {L.previousRx}
                    </button>
                  )}
                  {/* Investigation report upload */}
                  <label className={cn(
                    "flex items-center gap-1 text-[10px] cursor-pointer px-1.5 py-1 rounded border transition-colors w-full",
                    reportUploading
                      ? "border-muted text-muted-foreground opacity-60 pointer-events-none"
                      : "border-dashed border-teal-300 text-teal-700 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20",
                  )}>
                    <Upload className="h-3 w-3 shrink-0" />
                    <span>{reportUploading ? L.uploading : L.uploadReport}</span>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                      className="hidden"
                      disabled={reportUploading}
                      onChange={e => {
                        const file = e.target.files?.[0];
                        if (file) { uploadReport(file); e.target.value = ""; }
                      }}
                    />
                  </label>
                </div>
              </div>

              <Separator className="my-1" />

              {/* C/C — collapsible; collapsed by default to keep the left panel short */}
              <div>
                <button type="button" onClick={() => setCcOpen(v => !v)}
                  className="w-full flex items-center justify-between text-[10px] font-bold text-teal-700 dark:text-teal-400">
                  <span className="flex items-center gap-1">
                    {L.ccLabel}
                    {patient.cc && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                  </span>
                  {ccOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {ccOpen && (
                  <>
                    <div className="flex flex-wrap gap-0.5 mt-1 mb-0.5">
                      {(templates["cc"] ?? []).slice(0, 4).map(t => (
                        <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors">
                          {t.title}
                        </button>
                      ))}
                    </div>
                    <Textarea className="text-xs min-h-[56px] resize-none" placeholder={L.ccPlaceholder} value={patient.cc} onChange={e => setPatient(p => ({ ...p, cc: e.target.value }))} />
                  </>
                )}
              </div>

              <Separator className="my-1" />

              {/* O/E — collapsible; collapsed by default to keep the left panel short */}
              <div>
                <div className="flex items-center gap-1">
                  <button type="button" onClick={() => setOeOpen(v => !v)}
                    className="flex-1 flex items-center justify-between text-[10px] font-bold text-teal-700 dark:text-teal-400">
                    <span className="flex items-center gap-1">
                      O/E
                      {patient.oe && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                    </span>
                    {oeOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                  </button>
                  {oeOpen && (
                    <button type="button"
                      onClick={() => setPatient(p => ({ ...p, oeMode: p.oeMode === "text" ? "box" : "text" }))}
                      className={cn("text-[9px] px-1.5 py-0.5 rounded border transition-colors shrink-0", patient.oeMode === "box" ? "bg-primary text-primary-foreground border-primary" : "bg-muted border-border")}>
                      {L.box}
                    </button>
                  )}
                </div>
                {oeOpen && (
                  <>
                    <div className="mt-1">
                      {(templates["oe"] ?? []).slice(0, 2).map(t => (
                        <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-teal-50 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors mr-0.5 mb-0.5">
                          {t.title}
                        </button>
                      ))}
                    </div>
                    <Textarea className="text-xs min-h-[56px] resize-none mt-0.5" placeholder={L.oePlaceholder} value={patient.oe} onChange={e => setPatient(p => ({ ...p, oe: e.target.value }))} />
                  </>
                )}
              </div>

              <Separator className="my-1" />

              {/* IX — collapsible; collapsed by default to keep the left panel short */}
              <div>
                <button type="button" onClick={() => setIxOpen(v => !v)}
                  className="w-full flex items-center justify-between text-[10px] font-bold text-teal-700 dark:text-teal-400">
                  <span className="flex items-center gap-1">
                    {L.ixLabel}
                    {(patient.ixChips.length > 0 || patient.ixCustom) && <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />}
                  </span>
                  {ixOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {ixOpen && (
                  <>
                    <div className="flex flex-wrap gap-0.5 mt-1">
                      {IX_CHIPS.map(chip => (
                        <button key={chip} type="button"
                          onClick={() => setPatient(p => ({ ...p, ixChips: p.ixChips.includes(chip) ? p.ixChips.filter(x => x !== chip) : [...p.ixChips, chip] }))}
                          className={cn("text-[9px] px-1.5 py-0.5 rounded border transition-colors", patient.ixChips.includes(chip) ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                          {chip}
                        </button>
                      ))}
                    </div>
                    {(templates["ix"] ?? []).slice(0, 3).map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                        className="text-[9px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/30 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors mr-0.5 mt-0.5">
                        {t.title}
                      </button>
                    ))}
                    <Input className="h-6 text-xs mt-1" placeholder={L.ixCustomPlaceholder} value={patient.ixCustom} onChange={e => setPatient(p => ({ ...p, ixCustom: e.target.value }))} />
                  </>
                )}
              </div>

              <Separator className="my-1" />

              {/* Drug History */}
              <div>
                <label className="text-[10px] font-bold text-teal-700 dark:text-teal-400">{L.drugHistory}</label>
                <Textarea className="text-xs min-h-[48px] resize-none mt-0.5" placeholder={L.drugHistoryPlaceholder} value={patient.drugHistory} onChange={e => setPatient(p => ({ ...p, drugHistory: e.target.value }))} />
              </div>

            </div>
          </ScrollArea>
        </aside>

        {/* ── CENTER PANEL — Medicine entry + prescription body ─────── */}
        <main className="flex-1 overflow-hidden flex flex-col">
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-3">

              {/* ── Queue mini control / Recall mode indicator ── */}
              <div className="flex items-center justify-between">
                {isRecallMode ? (
                  /* ── Recall / Follow-up mode: queue is NOT serving this patient ── */
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-violet-700 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded px-2 py-0.5">
                      <RotateCcw className="h-3 w-3" />
                      {followUpDate ? L.followUpConsult : L.recallPatient}
                      {patient.name ? ` — ${patient.name}` : ""}
                    </span>
                    {/* Show actual queue state as a secondary note so the doctor knows who is still in the queue */}
                    {queueServing && (
                      <span className="text-[10px] text-muted-foreground">
                        {L.queueStillServing}: #{queueServing.serialNo} {queueServing.patientName}
                      </span>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-[11px] px-2 border-violet-300 text-violet-700 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30"
                      onClick={handleResumeConsultation}
                    >
                      <UserCheck className="h-3 w-3 mr-0.5" />{L.resumeConsult}
                    </Button>
                  </div>
                ) : null}
                {followUpDate === "" && (
                  <div className="flex items-center gap-1">
                    <label className="text-[10px] text-muted-foreground">{L.followUpColon}</label>
                    <Input className="h-6 w-32 text-xs" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                  </div>
                )}
              </div>

              {showQueue && (
                <div className="border rounded p-2 bg-muted/20 space-y-1.5">
                  <div className="flex flex-wrap gap-1.5 items-center">
                    {/* Next: disabled on break, day-end, or when no patients remain */}
                    <Button
                      size="sm"
                      className="h-6 text-xs px-2"
                      onClick={() => queueAction("next")}
                      disabled={isOnBreak || isDayEnded || callNext.isPending || (queueWaiting.length === 0 && !queueServing)}
                      title={
                        isOnBreak ? (isBn ? "বিরতিতে আছেন" : "On break — end break first")
                          : isDayEnded ? (isBn ? "দিন শেষ" : "Day ended")
                          : (queueWaiting.length === 0 && !queueServing) ? (isBn ? "কিউ খালি" : "Queue empty")
                          : undefined
                      }
                    >
                      <ChevronRight className="h-3 w-3 mr-0.5" />{L.next}
                    </Button>
                    {queueServing && <>
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => queueAction("seen", queueServing.id)}>
                        <UserCheck className="h-3 w-3 mr-0.5" />{L.seen}
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => queueAction("skip", queueServing.id)}>
                        <SkipForward className="h-3 w-3 mr-0.5" />{L.skip}
                      </Button>
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => queueAction("recall", queueServing.id)}>
                        <RotateCcw className="h-3 w-3 mr-0.5" />{L.recall}
                      </Button>
                    </>}
                  </div>
                  {/* Next-up label or queue-completed notice */}
                  {queueWaiting[0] ? (
                    <span className="text-xs text-muted-foreground">{L.nextColon} #{queueWaiting[0].serialNo} {queueWaiting[0].patientName}</span>
                  ) : !queueServing && qCompleted > 0 ? (
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">
                      ✓ {isBn ? "আজকের কিউ সম্পন্ন" : "Today's Queue Completed"}
                    </span>
                  ) : null}
                </div>
              )}

              {/* ══ MEDICINE ENTRY CARD ══════════════════════════════ */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                {/* Card header */}
                <div className="bg-teal-700 dark:bg-teal-800 text-white px-3 py-2">
                  <h2 className="text-sm font-bold">{L.addMedicineHeading}</h2>
                </div>
                <div className="p-3 space-y-2.5 bg-background">

                  {/* Brand name autocomplete */}
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{L.brandName}</label>
                    <div className="relative mt-0.5">
                      <Input
                        ref={medInputRef}
                        className="h-8 text-sm"
                        placeholder={L.medNamePlaceholder}
                        value={currentMed.brandName}
                        onChange={e => setCurrentMed(m => ({ ...m, brandName: e.target.value }))}
                        onFocus={() => { if (medSug.length > 0) setShowSug(true); }}
                        autoComplete="off"
                      />
                      {showSug && medSug.length > 0 && (
                        <div ref={sugRef} className="absolute top-full left-0 right-0 z-50 bg-background border rounded-lg shadow-lg max-h-48 overflow-y-auto mt-0.5">
                          {medSug.map(s => (
                            <button key={s.id} type="button" onClick={() => selectMedSug(s)}
                              className="w-full text-left px-3 py-2 hover:bg-muted transition-colors border-b last:border-0 text-xs">
                              <div className="font-semibold">{s.brandName} {s.strength && <span className="text-muted-foreground">{s.strength}</span>}</div>
                              {s.genericName && <div className="text-muted-foreground text-[10px]">{s.genericName} {s.dosageForm && `· ${s.dosageForm}`}</div>}
                              {s.manufacturer && <div className="text-muted-foreground text-[10px] italic">{s.manufacturer}</div>}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-3 gap-1 mt-1">
                      <Input className="h-6 text-xs" placeholder={L.genericName} value={currentMed.genericName} onChange={e => setCurrentMed(m => ({ ...m, genericName: e.target.value }))} />
                      <Input className="h-6 text-xs" placeholder={L.strengthPlaceholder} value={currentMed.strength} onChange={e => setCurrentMed(m => ({ ...m, strength: e.target.value }))} />
                      <Input list="dosage-forms" className="h-6 text-xs" placeholder={L.formPlaceholder} value={currentMed.dosageForm} onChange={e => setCurrentMed(m => ({ ...m, dosageForm: e.target.value }))} />
                      <datalist id="dosage-forms">
                        {DOSE_FORMS.map(f => <option key={f} value={f} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Dose buttons */}
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{L.dose}</label>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(templates["dose"] ?? []).map(t => (
                        <button key={t.id} type="button"
                          onClick={() => setCurrentMed(m => ({ ...m, dose: t.content }))}
                          className={cn("text-xs px-2 py-1 rounded border font-medium transition-colors", currentMed.dose === t.content ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400 hover:text-teal-600")}>
                          {t.title}
                        </button>
                      ))}
                      <Input
                        list="dose-list"
                        className="h-7 w-32 text-xs"
                        placeholder={L.customDose}
                        value={currentMed.dose}
                        onChange={e => setCurrentMed(m => ({ ...m, dose: e.target.value }))}
                      />
                      <datalist id="dose-list">
                        {(templates["dose"] ?? []).map(t => <option key={t.id} value={t.content} />)}
                      </datalist>
                    </div>
                  </div>

                  {/* Duration */}
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{L.duration}</label>
                    <div className="flex flex-wrap items-center gap-1 mt-0.5">
                      <Input
                        type="number" min="1" className="h-7 w-16 text-xs text-center"
                        value={currentMed.durationNum}
                        onChange={e => setCurrentMed(m => ({ ...m, durationNum: e.target.value }))}
                      />
                      <button type="button"
                        onClick={() => setCurrentMed(m => ({ ...m, durationUnit: "D" }))}
                        className={cn("text-xs px-3 py-1 rounded border transition-colors", currentMed.durationUnit === "D" && !durationPresetsDB.some(p => p.n === currentMed.durationNum && p.u === "D") ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                        {L.dayUnit}
                      </button>
                      <button type="button"
                        onClick={() => setCurrentMed(m => ({ ...m, durationUnit: "W" }))}
                        className={cn("text-xs px-3 py-1 rounded border transition-colors", currentMed.durationUnit === "W" && !durationPresetsDB.some(p => p.n === currentMed.durationNum && p.u === "W") ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                        {L.weekUnit}
                      </button>
                      <button type="button"
                        onClick={() => setCurrentMed(m => ({ ...m, durationUnit: "M" }))}
                        className={cn("text-xs px-3 py-1 rounded border transition-colors", currentMed.durationUnit === "M" && !durationPresetsDB.some(p => p.n === currentMed.durationNum && p.u === "M") ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                        {L.monthUnit}
                      </button>
                      <span className="text-muted-foreground text-[10px] px-0.5 select-none">|</span>
                      {durationPresetsDB.map(p => {
                        const active = currentMed.durationNum === p.n && currentMed.durationUnit === p.u;
                        return (
                          <button key={p.title} type="button"
                            onClick={() => setCurrentMed(m => ({ ...m, durationNum: p.n, durationUnit: p.u }))}
                            className={cn("text-xs px-2 py-1 rounded border transition-colors", active ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400 hover:text-teal-600")}>
                            {p.title}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Timing */}
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{L.timing}</label>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {(templates["timing"] ?? []).map(t => (
                        <button key={t.id} type="button"
                          onClick={() => setCurrentMed(m => ({ ...m, timing: t.content }))}
                          className={cn("text-xs px-2 py-1 rounded border transition-colors", currentMed.timing === t.content ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400 hover:text-teal-600")}>
                          {t.title}
                        </button>
                      ))}
                      <Input
                        className="h-7 w-36 text-xs"
                        placeholder={L.customTiming}
                        value={currentMed.timing}
                        onChange={e => setCurrentMed(m => ({ ...m, timing: e.target.value }))}
                      />
                    </div>
                  </div>

                  {/* Instructions */}
                  <div>
                    <label className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{L.instructionsOptional}</label>
                    <Textarea className="text-xs min-h-[40px] resize-none mt-0.5" placeholder={L.instructionsPlaceholder} value={currentMed.instructions} onChange={e => setCurrentMed(m => ({ ...m, instructions: e.target.value }))} />
                  </div>

                  {/* ADD button */}
                  <button type="button" onClick={addMedicine}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition-colors">
                    <Plus className="h-4 w-4" />{L.addMedicineBtn}
                  </button>
                </div>
              </div>

              {/* ── Medicine list ─────────────────────────────────── */}
              {medicines.length > 0 && (
                <div className="border rounded-lg overflow-hidden shadow-sm">
                  <div className="bg-teal-50 dark:bg-teal-950/30 px-3 py-2 border-b">
                    <h3 className="text-xs font-bold text-teal-700 dark:text-teal-300 flex items-center gap-1.5">
                      <ClipboardList className="h-3.5 w-3.5" />{L.addedMedicines} ({medicines.length})
                    </h3>
                  </div>
                  <div className="divide-y">
                    {medicines.map((med, i) => (
                      <div key={med.id} className="flex items-start gap-2 px-3 py-2 hover:bg-muted/30 group">
                        <span className="text-teal-700 font-bold text-sm w-5 shrink-0 mt-0.5">{i + 1}.</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-x-1.5 gap-y-0 items-baseline">
                            <span className="font-semibold text-sm">{med.brandName || med.genericName}</span>
                            {med.genericName && med.brandName && <span className="text-xs text-muted-foreground">({med.genericName})</span>}
                            {med.strength && <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{med.strength}</span>}
                            {med.dosageForm && <span className="text-xs text-muted-foreground">{med.dosageForm}</span>}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {med.dose && <span className="font-medium text-foreground">{med.dose}</span>}
                            {med.timing && <span> · {med.timing}</span>}
                            {med.durationNum && <span> · {med.durationNum} {med.durationUnit === "D" ? "দিন" : med.durationUnit === "W" ? "সপ্তাহ" : "মাস"}</span>}
                            {med.instructions && <span className="italic text-muted-foreground"> — {med.instructions}</span>}
                          </div>
                        </div>
                        <button type="button" onClick={() => removeMed(med.id)}
                          className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive/80 transition-all shrink-0">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── ADVICE ─────────────────────────────────────────── */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-blue-50 dark:bg-blue-950/30 px-3 py-2 border-b">
                  <h3 className="text-xs font-bold text-blue-700 dark:text-blue-300">{L.advice}</h3>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <Textarea className="text-xs min-h-[56px] resize-none" placeholder={L.advicePlaceholder} value={advice} onChange={e => setAdvice(e.target.value)} />
                  <div className="flex flex-wrap gap-1">
                    {(isBn ? ADVICE_CHIPS_BN : ADVICE_CHIPS_EN).map(chip => (
                      <button key={chip} type="button"
                        onClick={() => setAdvice(a => a ? `${a}\n${chip}` : chip)}
                        className="text-[9px] px-1.5 py-0.5 rounded border bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-100 transition-colors">
                        + {chip}
                      </button>
                    ))}
                    {(templates["advice"] ?? []).map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                        className="text-[9px] px-1.5 py-0.5 rounded border bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800 hover:bg-purple-100 transition-colors">
                        📋 {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* ── TREATMENT NOTE ───────────────────────────────────── */}
              <div className="border rounded-lg overflow-hidden shadow-sm">
                <div className="bg-amber-50 dark:bg-amber-950/30 px-3 py-2 border-b">
                  <h3 className="text-xs font-bold text-amber-700 dark:text-amber-300">{L.treatmentNote}</h3>
                </div>
                <div className="p-2.5 space-y-1.5">
                  <Textarea className="text-xs min-h-[56px] resize-none" placeholder={L.treatmentPlaceholder} value={treatmentNote} onChange={e => setTreatmentNote(e.target.value)} />
                  <div className="flex flex-wrap gap-1">
                    {(templates["protocol"] ?? []).map(t => (
                      <button key={t.id} type="button" onClick={() => applyTemplate(t)}
                        className="text-[9px] px-1.5 py-0.5 rounded border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 hover:bg-amber-100 transition-colors">
                        📋 {t.title}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Diagnosis + Follow-up row */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase">{L.diagnosisDx}</label>
                  <Input className="h-7 text-xs mt-0.5" placeholder={L.diagnosisPlaceholder} value={diagnosis} onChange={e => setDiagnosis(e.target.value)} />
                </div>
                <div>
                  <label className="text-[10px] text-muted-foreground font-semibold uppercase">{L.followUpDate}</label>
                  <Input className="h-7 text-xs mt-0.5" type="date" value={followUpDate} onChange={e => setFollowUpDate(e.target.value)} />
                </div>
              </div>

              {/* Save buttons (bottom CTA) */}
              <div className="flex gap-2 pb-4">
                <Button className="flex-1 bg-teal-600 hover:bg-teal-700" onClick={() => handleSave(true, "final")} disabled={createRx.isPending || updateRx.isPending}>
                  <Printer className="h-4 w-4 mr-2" />{L.savePrint}
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => handleSave(false, "final")} disabled={createRx.isPending || updateRx.isPending}>
                  {L.saveOnly}
                </Button>
                <Button variant="outline" onClick={() => handleSave(false, "draft")} disabled={createRx.isPending || updateRx.isPending}>
                  <Save className="h-4 w-4 mr-2" />{L.saveDraft}
                </Button>
              </div>

            </div>
          </ScrollArea>
        </main>

        {/* ── RIGHT PANEL — Templates ───────────────────────────────── */}
        <aside className="w-52 border-l hidden lg:flex flex-col bg-muted/10 shrink-0 overflow-hidden">
          <div className="px-3 py-2 border-b bg-muted/20">
            <div className="flex items-center justify-between gap-1">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground shrink-0">{L.templates}</h3>
              <div className="flex items-center gap-1">
                <button type="button"
                  onClick={() => { const next = !isManageTemplates; setIsManageTemplates(next); if (next) reloadAllTemplates(); }}
                  className={cn("text-[10px] flex items-center gap-0.5 px-1 py-0.5 rounded transition-colors", isManageTemplates ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary")}>
                  <Settings2 className="h-3 w-3" />{L.tmplManage}
                </button>
                <button type="button" onClick={() => setShowTemplateForm(v => !v)}
                  className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-0.5">
                  <PlusCircle className="h-3 w-3" />{L.newBtn}
                </button>
              </div>
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-3 text-xs">

              {/* Queue Summary — enhanced: break/day-end aware, with stats + efficiency */}
              <div className="border rounded bg-background overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-2 py-1 bg-teal-600/10 border-b">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-teal-700 dark:text-teal-400">{L.queueSummary}</span>
                  <div className="flex items-center gap-1.5">
                    <span className={cn("text-[9px] font-medium px-1 rounded-full border",
                      isDayEnded ? "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                        : isOnBreak ? "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/20 dark:border-yellow-800"
                        : "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:border-green-800"
                    )}>
                      {isDayEnded ? L.statusDayEnded : isOnBreak ? L.statusOnBreak : L.statusAvailable}
                    </span>
                    <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-medium">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />{L.liveTag}
                    </span>
                  </div>
                </div>

                {/* Break mode panel */}
                {isOnBreak && (
                  <div className="p-2 bg-yellow-50 dark:bg-yellow-950/20 border-b border-yellow-100 dark:border-yellow-900 space-y-1">
                    <div className="flex items-center gap-1.5 text-yellow-800 dark:text-yellow-300">
                      <Coffee className="h-3 w-3 shrink-0" />
                      <span className="text-[10px] font-semibold">{L.breakActive}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] text-yellow-700 dark:text-yellow-400">
                      <Timer className="h-3 w-3 shrink-0" />
                      <span className="font-mono font-bold text-base leading-none">{breakCdStr ?? "—"}</span>
                    </div>
                    {qBreakUntil && (
                      <div className="text-[9px] text-yellow-600 dark:text-yellow-500">
                        {L.expectedResume}: {new Date(qBreakUntil).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    )}
                    {breakExpired && (
                      <Button size="sm" className="h-5 text-[9px] px-2 mt-0.5 w-full" onClick={async () => {
                        try { await updateStatusRx.mutateAsync({ data: { status: "online" } }); void refetchQ(); } catch {}
                      }}>{L.resumeBreak}</Button>
                    )}
                  </div>
                )}

                {/* Day ended mode */}
                {isDayEnded ? (
                  <div className="p-2 space-y-1">
                    <p className="text-[10px] font-bold text-red-700 dark:text-red-400">🔴 {L.dayEnded}</p>
                    <p className="text-[9px] text-muted-foreground">{L.noMoreAppts}</p>
                    <p className="text-[9px] text-muted-foreground">{L.doctorUnavailable}</p>
                    {qTotalToday > 0 && (
                      <div className="mt-1.5 pt-1.5 border-t space-y-1">
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">{L.daySummaryTitle}</div>
                        <div className="grid grid-cols-2 gap-1">
                          <div className="rounded bg-muted px-1.5 py-1">
                            <div className="text-[8px] text-muted-foreground">{L.totalAppts}</div>
                            <div className="text-xs font-bold">{qTotalToday}</div>
                          </div>
                          <div className="rounded bg-green-600/10 px-1.5 py-1">
                            <div className="text-[8px] text-muted-foreground">{L.completedCount}</div>
                            <div className="text-xs font-bold text-green-700 dark:text-green-400">{qCompleted}</div>
                          </div>
                          <div className="rounded bg-amber-600/10 px-1.5 py-1">
                            <div className="text-[8px] text-muted-foreground">{L.skippedCount}</div>
                            <div className="text-xs font-bold">{qSkipped}</div>
                          </div>
                          {qAvgConsultMs > 0 && (
                            <div className="rounded bg-muted px-1.5 py-1">
                              <div className="text-[8px] text-muted-foreground">{L.avgConsultation}</div>
                              <div className="text-xs font-bold">{Math.round(qAvgConsultMs / 60000)}m</div>
                            </div>
                          )}
                        </div>
                        {qFirstPatientTime && (
                          <div className="text-[9px] text-muted-foreground">{L.firstPatient}: <span className="font-medium">{new Date(qFirstPatientTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                        )}
                        {qLastPatientTime && (
                          <div className="text-[9px] text-muted-foreground">{L.lastPatient}: <span className="font-medium">{new Date(qLastPatientTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span></div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    {/* Normal / break: stats grid */}
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      <div className="rounded bg-teal-600/10 px-1.5 py-1">
                        <div className="text-[9px] text-muted-foreground truncate">{L.nowServingShort}</div>
                        <div className="text-sm font-bold text-teal-700 dark:text-teal-400 truncate">{queueServing ? `#${queueServing.serialNo}` : "—"}</div>
                      </div>
                      <div className="rounded bg-muted px-1.5 py-1">
                        <div className="text-[9px] text-muted-foreground truncate">{L.nextShort}</div>
                        <div className="text-sm font-bold truncate">{queueWaiting[0] ? `#${queueWaiting[0].serialNo}` : "—"}</div>
                      </div>
                      <div className="rounded bg-muted px-1.5 py-1 flex flex-col">
                        <div className="text-[9px] text-muted-foreground">{L.waitingShort}</div>
                        <div className="text-sm font-bold">{queueWaiting.length}</div>
                      </div>
                      <div className="rounded bg-green-600/10 px-1.5 py-1 flex flex-col">
                        <div className="text-[9px] text-muted-foreground">{L.completedCount}</div>
                        <div className="text-sm font-bold text-green-700 dark:text-green-400">{qCompleted}</div>
                      </div>
                      <div className="col-span-2 rounded bg-muted px-1.5 py-1 flex items-center justify-between">
                        <span className="text-[9px] text-muted-foreground">{L.totalAppts}</span>
                        <span className="text-xs font-bold">{qTotalToday}</span>
                      </div>
                      {qAvgConsultMs > 0 && (
                        <div className="col-span-2 rounded bg-muted/60 px-1.5 py-1 flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                            <TrendingUp className="h-2.5 w-2.5" />{L.avgWaitTime}
                          </span>
                          <span className="text-[10px] font-semibold">{Math.round(qAvgConsultMs / 60000)}m</span>
                        </div>
                      )}
                      {qAvgConsultMs > 0 && queueWaiting.length > 0 && (
                        <div className="col-span-2 rounded bg-muted/60 px-1.5 py-1 flex items-center justify-between">
                          <span className="text-[9px] text-muted-foreground">{L.estWaitNext}</span>
                          <span className="text-[10px] font-semibold">~{Math.round((qAvgConsultMs * queueWaiting.length) / 60000)}m</span>
                        </div>
                      )}
                    </div>
                    {/* Queue list */}
                    <div className="border-t">
                      <div className="px-1.5 py-1 text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">{L.todaysQueue}</div>
                      <div className="max-h-28 overflow-y-auto px-1.5 pb-1.5 space-y-0.5">
                        {allQueue.length === 0 ? (
                          <div className="text-[10px] text-muted-foreground py-1">{L.queueEmpty}</div>
                        ) : allQueue.map(e => (
                          <div key={e.id} className={cn("flex items-center gap-1.5 rounded px-1 py-0.5", e.status === "serving" ? "bg-teal-600/10" : "")}>
                            <span className={cn("shrink-0 h-4 min-w-4 px-0.5 rounded-full text-[9px] font-bold flex items-center justify-center", e.status === "serving" ? "bg-teal-600 text-white" : "bg-muted-foreground/20")}>
                              {e.serialNo}
                            </span>
                            <span className="truncate flex-1 text-[10px]">{e.patientName || "—"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* New template form */}
              {showTemplateForm && (
                <div className="border rounded p-2 bg-background space-y-1.5">
                  <select className="w-full h-6 text-xs border rounded bg-background px-1" value={newTmpl.type} onChange={e => setNewTmpl(t => ({ ...t, type: e.target.value }))}>
                    <option value="advice">{L.tmplAdvice}</option>
                    <option value="cc">{L.tmplCc}</option>
                    <option value="oe">{L.tmplOe}</option>
                    <option value="ix">{L.tmplIx}</option>
                    <option value="dose">{L.tmplDose}</option>
                    <option value="timing">{L.tmplTiming}</option>
                    <option value="duration">{L.tmplDuration}</option>
                    <option value="protocol">{L.tmplProtocol}</option>
                    <option value="treatment">{L.tmplTreatment}</option>
                    <option value="followup">{L.tmplFollowup}</option>
                  </select>
                  <Input className="h-6 text-xs" placeholder={L.tmplTitlePlaceholder} value={newTmpl.title} onChange={e => setNewTmpl(t => ({ ...t, title: e.target.value }))} />
                  <Input className="h-6 text-xs" placeholder={L.tmplDepartmentPlaceholder} value={newTmpl.department} onChange={e => setNewTmpl(t => ({ ...t, department: e.target.value }))} />
                  {newTmpl.type === "duration" ? (() => {
                    const _m = newTmpl.content.match(/^(\d+)/);
                    const _num = _m ? _m[1] : "";
                    const _isM = /M|মাস/i.test(newTmpl.content);
                    const _isW = !_isM && /W|সপ্তাহ/i.test(newTmpl.content);
                    const _unit: "D" | "W" | "M" = _isM ? "M" : _isW ? "W" : "D";
                    const setDur = (n: string, u: "D" | "W" | "M") => setNewTmpl(t => ({ ...t, content: `${n} ${u}` }));
                    return (
                      <div className="flex flex-wrap items-center gap-1 py-1">
                        <Input type="number" min="1" className="h-7 w-16 text-xs text-center"
                          value={_num} onChange={e => setDur(e.target.value, _unit)} />
                        <button type="button" onClick={() => setDur(_num, "D")}
                          className={cn("text-xs px-3 py-1 rounded border transition-colors", _unit === "D" && !durationPresetsDB.some(p => p.n === _num && p.u === "D") ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                          {L.dayUnit}
                        </button>
                        <button type="button" onClick={() => setDur(_num, "W")}
                          className={cn("text-xs px-3 py-1 rounded border transition-colors", _unit === "W" && !durationPresetsDB.some(p => p.n === _num && p.u === "W") ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                          {L.weekUnit}
                        </button>
                        <button type="button" onClick={() => setDur(_num, "M")}
                          className={cn("text-xs px-3 py-1 rounded border transition-colors", _unit === "M" && !durationPresetsDB.some(p => p.n === _num && p.u === "M") ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400")}>
                          {L.monthUnit}
                        </button>
                        <span className="text-muted-foreground text-[10px] px-0.5 select-none">|</span>
                        {durationPresetsDB.map(p => {
                          const act = _num === p.n && _unit === p.u;
                          return (
                            <button key={p.title} type="button" onClick={() => setDur(p.n, p.u)}
                              className={cn("text-xs px-2 py-1 rounded border transition-colors", act ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400 hover:text-teal-600")}>
                              {p.title}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })() : newTmpl.type === "timing" ? (
                    <div className="flex flex-wrap gap-1 py-1">
                      {(templates["timing"] ?? []).map(t => (
                        <button key={t.id} type="button" onClick={() => setNewTmpl(n => ({ ...n, content: t.content }))}
                          className={cn("text-xs px-2 py-1 rounded border transition-colors", newTmpl.content === t.content ? "bg-teal-600 text-white border-teal-600" : "bg-background border-border hover:border-teal-400 hover:text-teal-600")}>
                          {t.title}
                        </button>
                      ))}
                      <Input className="h-7 w-36 text-xs" placeholder={L.customTiming}
                        value={newTmpl.content}
                        onChange={e => setNewTmpl(n => ({ ...n, content: e.target.value }))} />
                    </div>
                  ) : (
                    <Textarea className="text-xs min-h-[48px] resize-none" placeholder={L.tmplContentPlaceholder} value={newTmpl.content} onChange={e => setNewTmpl(t => ({ ...t, content: e.target.value }))} />
                  )}
                  <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                    <input type="checkbox" checked={newTmpl.isFavorite} onChange={e => setNewTmpl(t => ({ ...t, isFavorite: e.target.checked }))} />
                    {L.markFavorite}
                  </label>
                  <div className="flex gap-1">
                    <Button size="sm" className="h-6 text-xs flex-1 bg-teal-600 hover:bg-teal-700" onClick={saveTemplate}>{editingTmplId ? L.update : L.save}</Button>
                    <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => { setShowTemplateForm(false); setEditingTmplId(null); setNewTmpl({ type: "advice", title: "", content: "", department: "", isFavorite: false }); }}>{L.cancel}</Button>
                  </div>
                </div>
              )}

              {/* Template manager — shows all templates including hidden, with reorder + hide controls */}
              {isManageTemplates && (
                <div className="border rounded bg-background p-2 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{L.tmplManage}</span>
                    <button type="button" onClick={restoreDefaultTemplates}
                      className="text-[9px] text-primary hover:underline flex items-center gap-0.5">
                      <RefreshCw className="h-2.5 w-2.5" />{L.tmplRestoreDefaults}
                    </button>
                  </div>
                  {(["advice","cc","oe","ix","dose","timing","duration","protocol","treatment","followup"] as const).map(typeKey => {
                    const items: any[] = allTemplatesGrouped[typeKey] ?? [];
                    if (items.length === 0) return null;
                    const typeLabel = typeKey === "advice" ? L.tmplAdvice : typeKey === "cc" ? L.tmplCc
                      : typeKey === "oe" ? L.tmplOe : typeKey === "ix" ? L.tmplIx
                      : typeKey === "dose" ? L.tmplDose : typeKey === "timing" ? L.tmplTiming
                      : typeKey === "duration" ? L.tmplDuration : typeKey === "protocol" ? L.tmplProtocol
                      : typeKey === "followup" ? L.tmplFollowup : L.tmplTreatment;
                    return (
                      <div key={typeKey}>
                        <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5 border-b pb-0.5">{typeLabel}</div>
                        <div className="space-y-0.5">
                          {items.map((t: any, i: number) => (
                            <div key={t.id} className={cn("flex items-center gap-0.5 rounded px-1 py-0.5 text-[10px] hover:bg-muted/40", t.isHidden && "opacity-40")}>
                              <span className="flex-1 truncate">{t.title}</span>
                              {t.isHidden && <span className="text-[8px] border rounded px-0.5 text-muted-foreground shrink-0">hidden</span>}
                              <div className="flex items-center gap-0.5 shrink-0">
                                <button type="button" title={t.isHidden ? L.tmplShow : L.tmplHide}
                                  onClick={() => hideTemplate(t, !t.isHidden)}
                                  className="p-0.5 hover:text-primary">
                                  {t.isHidden ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
                                </button>
                                <button type="button" title="Move up" onClick={() => moveTemplate(t, -1)} disabled={i === 0}
                                  className="p-0.5 hover:text-primary disabled:opacity-25">
                                  <ArrowUp className="h-2.5 w-2.5" />
                                </button>
                                <button type="button" title="Move down" onClick={() => moveTemplate(t, 1)} disabled={i === items.length - 1}
                                  className="p-0.5 hover:text-primary disabled:opacity-25">
                                  <ArrowDown className="h-2.5 w-2.5" />
                                </button>
                                <button type="button" title={L.editLabel}
                                  onClick={() => { editTemplate(t); setIsManageTemplates(false); }}
                                  className="p-0.5 hover:text-teal-600">
                                  <Pencil className="h-2.5 w-2.5" />
                                </button>
                                <button type="button" title={L.deleteLabel}
                                  onClick={() => deleteTemplate(t)}
                                  className="p-0.5 hover:text-red-500">
                                  <Trash2 className="h-2.5 w-2.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Generic → Brand */}
              <TemplateSection title={L.genericToBrand} items={[]} onApply={applyTemplate} emptyHint={L.genericToBrandHint} searchPlaceholder={L.genericNamePlaceholder} isSearch onSelectMed={selectMedSug} />

              {/* Protocol */}
              <TemplateSection title={L.treatmentProtocol} icon="🏥" items={templates["protocol"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* Advice */}
              <TemplateSection title={L.adviceTemplate} icon="💊" items={templates["advice"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* C/C */}
              <TemplateSection title={L.ccTemplate} icon="📋" items={templates["cc"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* Dose */}
              <TemplateSection title={L.tmplDose} icon="⚖️" items={templates["dose"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* Timing */}
              <TemplateSection title={L.tmplTiming} icon="⏱️" items={templates["timing"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* Duration */}
              <TemplateSection title={L.tmplDuration} icon="📅" items={templates["duration"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* O/E */}
              <TemplateSection title={L.oeTemplate} icon="🩺" items={templates["oe"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* I/X */}
              <TemplateSection title={L.ixTemplate} icon="🧪" items={templates["ix"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

              {/* Follow-up */}
              <TemplateSection title={L.tmplFollowup} icon="🗓️" items={templates["followup"] ?? []} onApply={applyTemplate} onEdit={editTemplate} onDelete={deleteTemplate} onFavorite={toggleFavorite} favLabel={L.favorites} editLabel={L.editLabel} deleteLabel={L.deleteLabel} />

            </div>
          </ScrollArea>
        </aside>

      </div>

      {/* ══ HEADER SETTINGS DIALOG ═══════════════════════════════════ */}
      <Dialog open={showHeaderDlg} onOpenChange={setShowHeaderDlg}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Settings2 className="h-4 w-4" />{L.headerSettings}</DialogTitle>
            <DialogDescription>{L.headerSettingsDesc}</DialogDescription>
          </DialogHeader>
          {settingsForm && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="space-y-1">
                <Label className="text-xs">{L.hdrName}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerName ?? ""} placeholder={L.hdrPlaceholderHint} onChange={e => setSettingsForm(s => s ? { ...s, headerName: e.target.value } : s)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.hdrDegree}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerDegree ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, headerDegree: e.target.value } : s)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.hdrDesignation}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerDesignation ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, headerDesignation: e.target.value } : s)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.hdrBmdc}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerBmdc ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, headerBmdc: e.target.value } : s)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">{L.hdrHospital}</Label>
                <Input className="h-8 text-sm" value={settingsForm.hospitalName ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, hospitalName: e.target.value } : s)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">{L.hdrAddress}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerAddress ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, headerAddress: e.target.value } : s)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.hdrPhone}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerPhone ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, headerPhone: e.target.value } : s)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.hdrEmail}</Label>
                <Input className="h-8 text-sm" value={settingsForm.headerEmail ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, headerEmail: e.target.value } : s)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">{L.hdrSignature}</Label>
                <Input className="h-8 text-sm" value={settingsForm.signatureText ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, signatureText: e.target.value } : s)} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs">{L.hdrSignatureImage}</Label>
                <div className="flex items-center gap-3">
                  {settingsForm.signatureImage ? (
                    <div className="flex items-center gap-2">
                      <img src={settingsForm.signatureImage} alt="signature" className="h-10 object-contain border rounded bg-white p-1" />
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSettingsForm(s => s ? { ...s, signatureImage: null } : s)}>{L.remove}</Button>
                    </div>
                  ) : null}
                  <Input
                    type="file"
                    accept="image/*"
                    className="h-8 text-xs file:text-xs"
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => setSettingsForm(s => s ? { ...s, signatureImage: String(reader.result) } : s);
                      reader.readAsDataURL(file);
                    }}
                  />
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHeaderDlg(false)}>{L.cancel}</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveSettings} disabled={updateSettings.isPending}>{L.saveSettings}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══ PAGE SETUP DIALOG ════════════════════════════════════════ */}
      <Dialog open={showPageDlg} onOpenChange={setShowPageDlg}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileCog className="h-4 w-4" />{L.pageSetup}</DialogTitle>
            <DialogDescription>{L.pageSetupDesc}</DialogDescription>
          </DialogHeader>
          {settingsForm && (
            <div className="space-y-4 py-2">
              <div className="space-y-1">
                <Label className="text-xs">{L.psSize}</Label>
                <select className="w-full h-8 text-sm border rounded bg-background px-2"
                  value={settingsForm.pageSize ?? "A4"}
                  onChange={e => setSettingsForm(s => s ? { ...s, pageSize: e.target.value } : s)}>
                  <option value="A4">A4</option>
                  <option value="A5">A5</option>
                  <option value="Letter">Letter</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.psMargins}</Label>
                <div className="grid grid-cols-4 gap-2">
                  <div><span className="text-[10px] text-muted-foreground">{L.psTop}</span><Input className="h-8 text-sm" type="number" value={settingsForm.marginTop ?? 0} onChange={e => setSettingsForm(s => s ? { ...s, marginTop: Number(e.target.value) } : s)} /></div>
                  <div><span className="text-[10px] text-muted-foreground">{L.psRight}</span><Input className="h-8 text-sm" type="number" value={settingsForm.marginRight ?? 0} onChange={e => setSettingsForm(s => s ? { ...s, marginRight: Number(e.target.value) } : s)} /></div>
                  <div><span className="text-[10px] text-muted-foreground">{L.psBottom}</span><Input className="h-8 text-sm" type="number" value={settingsForm.marginBottom ?? 0} onChange={e => setSettingsForm(s => s ? { ...s, marginBottom: Number(e.target.value) } : s)} /></div>
                  <div><span className="text-[10px] text-muted-foreground">{L.psLeft}</span><Input className="h-8 text-sm" type="number" value={settingsForm.marginLeft ?? 0} onChange={e => setSettingsForm(s => s ? { ...s, marginLeft: Number(e.target.value) } : s)} /></div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">{L.psHeaderHeight}</Label>
                  <Input className="h-8 text-sm" type="number" value={settingsForm.headerHeight ?? 0} onChange={e => setSettingsForm(s => s ? { ...s, headerHeight: Number(e.target.value) } : s)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">{L.psFooterHeight}</Label>
                  <Input className="h-8 text-sm" type="number" value={settingsForm.footerHeight ?? 0} onChange={e => setSettingsForm(s => s ? { ...s, footerHeight: Number(e.target.value) } : s)} />
                </div>
              </div>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between"><Label className="text-xs">{L.psShowHeader}</Label><Switch checked={!!settingsForm.showHeader} onCheckedChange={v => setSettingsForm(s => s ? { ...s, showHeader: v } : s)} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">{L.psShowQr}</Label><Switch checked={!!settingsForm.showQr} onCheckedChange={v => setSettingsForm(s => s ? { ...s, showQr: v } : s)} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">{L.psShowSignature}</Label><Switch checked={!!settingsForm.showSignature} onCheckedChange={v => setSettingsForm(s => s ? { ...s, showSignature: v } : s)} /></div>
                <div className="flex items-center justify-between"><Label className="text-xs">{L.psShowFooter}</Label><Switch checked={!!settingsForm.showFooter} onCheckedChange={v => setSettingsForm(s => s ? { ...s, showFooter: v } : s)} /></div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">{L.psFooterText}</Label>
                <Input className="h-8 text-sm" value={settingsForm.footerText ?? ""} onChange={e => setSettingsForm(s => s ? { ...s, footerText: e.target.value } : s)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPageDlg(false)}>{L.cancel}</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={saveSettings} disabled={updateSettings.isPending}>{L.saveSettings}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

/* ── Small helper components ────────────────────────────────────────── */

function NavBtn({ href, icon, label, active }: { href: string; icon: React.ReactNode; label: string; active?: boolean }) {
  return (
    <Link href={href}>
      <span className={cn(
        "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors cursor-pointer",
        active ? "bg-teal-600 text-white" : "text-muted-foreground hover:text-foreground hover:bg-muted",
      )}>
        {icon}{label}
      </span>
    </Link>
  );
}

function TemplateSection({ title, icon, items, onApply, emptyHint, isSearch, searchPlaceholder, onEdit, onDelete, onFavorite, favLabel, editLabel, deleteLabel, onSelectMed }: {
  title: string; icon?: string; items: RxTemplate[];
  onApply: (t: RxTemplate) => void; emptyHint?: string; isSearch?: boolean; searchPlaceholder?: string;
  onEdit?: (t: RxTemplate) => void; onDelete?: (t: RxTemplate) => void; onFavorite?: (t: RxTemplate) => void;
  favLabel?: string; editLabel?: string; deleteLabel?: string;
  onSelectMed?: (s: MedSuggestion) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [medRes, setMedRes] = useState<MedSuggestion[]>([]);

  const searchMedGeneric = (query: string) => {
    setQ(query);
    if (!isSearch || query.length < 2) { setMedRes([]); return; }
    fetch(`/api/medicines?q=${encodeURIComponent(query)}&limit=8`)
      .then(r => r.json()).then(setMedRes).catch(() => {});
  };

  return (
    <div>
      <button type="button" onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wide text-muted-foreground hover:text-foreground mb-1">
        <span>{icon && `${icon} `}{title}</span>
        {open ? <ChevronUp className="h-2.5 w-2.5" /> : <ChevronDown className="h-2.5 w-2.5" />}
      </button>
      {open && (
        <div className="space-y-0.5">
          {isSearch && (
            <div className="space-y-0.5">
              <Input className="h-6 text-[10px]" placeholder={searchPlaceholder ?? "Generic name..."} value={q} onChange={e => searchMedGeneric(e.target.value)} />
              {medRes.map(s => (
                <button key={s.id} type="button"
                  onClick={() => { if (onSelectMed) onSelectMed(s); setMedRes([]); setQ(""); }}
                  className="w-full text-left px-1.5 py-0.5 rounded hover:bg-muted text-[10px] transition-colors">
                  <div className="font-medium">{s.brandName} {s.strength}</div>
                  <div className="text-muted-foreground">{s.genericName}{s.dosageForm ? ` · ${s.dosageForm}` : ""}</div>
                  {s.manufacturer && <div className="text-muted-foreground text-[10px] italic">{s.manufacturer}</div>}
                </button>
              ))}
            </div>
          )}
          {!isSearch && items.length === 0 && emptyHint && (
            <p className="text-[10px] text-muted-foreground italic">{emptyHint}</p>
          )}
          {items.map(t => {
            const isCustom = t.id > 0;
            // Show controls: edit is available for ALL templates (incl. builtins); delete/favorite only for custom.
            const hasControls = !!onEdit || (isCustom && !!(onDelete || onFavorite));
            return (
              <div key={t.id} className="group flex items-center gap-1 rounded border border-transparent hover:border-teal-200 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors">
                <button type="button" onClick={() => onApply(t)}
                  className="flex-1 min-w-0 text-left px-2 py-1.5 text-[10px] hover:text-teal-700 transition-colors flex items-center gap-1">
                  {t.isFavorite
                    ? <Star className="h-2.5 w-2.5 shrink-0 fill-amber-400 text-amber-400" />
                    : <BookOpen className="h-2.5 w-2.5 shrink-0 opacity-60" />}
                  <span className="truncate">{t.title}</span>
                  {t.department && <span className="ml-auto text-[9px] text-muted-foreground shrink-0">{t.department}</span>}
                </button>
                {hasControls && (
                  <div className="flex items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {onFavorite && isCustom && (
                      <button type="button" title={favLabel} onClick={() => onFavorite(t)} className="p-0.5 hover:text-amber-500">
                        <Star className={cn("h-3 w-3", t.isFavorite && "fill-amber-400 text-amber-400")} />
                      </button>
                    )}
                    {onEdit && (
                      <button type="button" title={editLabel} onClick={() => onEdit(t)} className="p-0.5 hover:text-teal-600">
                        <Pencil className="h-3 w-3" />
                      </button>
                    )}
                    {onDelete && isCustom && (
                      <button type="button" title={deleteLabel} onClick={() => onDelete(t)} className="p-0.5 hover:text-red-500">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
