import {
  AlertTriangle,
  BookOpen,
  Cloud,
  Database,
  HardDriveDownload,
  Plus,
  Settings2,
  WifiOff,
} from "lucide-react";

export const initialForm = {
  topic: "",
  content: "",
  imagePrompt: "",
  imageUrl: "",
};

export const guideSections = [
  {
    title: "🚀 เริ่มต้นใช้งานด่วน (Quick Start)",
    items: [
      "ไปที่เมนู 'ตั้งค่า' เพื่อกรอกข้อมูลธุรกิจและ API Keys (OpenAI หรือ Gemini)",
      "ตั้งค่า Facebook Page ID และ Access Token หากต้องการโพสต์ลงเพจจริง",
      "ตรวจสอบสถานะการเชื่อมต่อ (Chips ด้านบน) ว่าเป็นสีเขียวหรือสีฟ้า",
      "เริ่มสร้างคอนเทนต์ที่เมนู 'สร้าง Draft' โดยใช้ AI ช่วยคิดทั้งข้อความและรูปภาพ",
    ],
  },
  {
    title: "📝 ขั้นตอนการสร้างและโพสต์",
    items: [
      "1. ใส่หัวข้อ (Topic) ที่ต้องการให้ AI เขียนถึง",
      "2. กด 'AI ช่วยสร้างข้อความ' และตรวจแก้ไขในแผงขวา (Draft Preview)",
      "3. กด 'AI ช่วยคิด Prompt' และเลือก 'Generate Real' เพื่อสร้างรูปภาพจริง",
      "4. กด 'บันทึก Draft' เพื่อเก็บข้อมูลลง Supabase",
      "5. ไปที่เมนู 'สถานะงาน' เพื่อกด 'Publish' (หรือ Test Post ในโหมด Mock)",
    ],
  },
  {
    title: "🛡️ ระบบความปลอดภัย (Production Safety)",
    items: [
      "Mock Mode: โหมดทดสอบ ระบบจะจำลองการโพสต์สำเร็จโดยไม่ส่งข้อมูลไป Facebook จริง",
      "Live Mode: โหมดใช้งานจริง ข้อมูลจะถูกส่งไปที่เพจ Facebook ของคุณทันที",
      "Auto Scheduler: เมื่อเปิดใช้งาน ระบบจะตรวจสอบและโพสต์ Draft ที่กำหนดเวลาไว้อัตโนมัติ",
      "CRON_SECRET: ใช้สำหรับการรันคิวโพสต์จากเซิร์ฟเวอร์ภายนอกอย่างปลอดภัย",
    ],
  },
  {
    title: "🔑 การเชื่อมต่อ API",
    items: [
      "OpenAI: ใช้สำหรับ GPT-4o-mini หรือโมเดลอื่นๆ",
      "Gemini: ใช้ Google Gemini 2.5 Flash เป็นทางเลือกที่คุ้มค่า",
      "Facebook: ต้องขอสิทธิ์ pages_manage_posts และ pages_read_engagement",
      "Supabase: ฐานข้อมูลหลักสำหรับเก็บ Draft และการตั้งค่าแบบ Cloud",
    ],
  },
];

export const statusCopy = {
  connected: {
    label: "เชื่อมต่อ Supabase แล้ว",
    detail: "อ่าน/เขียนข้อมูลได้ปกติ",
    icon: Cloud,
    tone: "text-emerald-100 border-emerald-400/30 bg-emerald-500/10",
  },
  "read-only": {
    label: "โหมดอ่านอย่างเดียว",
    detail: "อ่านได้แต่เขียนติดสิทธิ์ RLS",
    icon: HardDriveDownload,
    tone: "text-amber-100 border-amber-400/30 bg-amber-500/10",
  },
  "missing-table": {
    label: "ขาดตารางในฐานข้อมูล",
    detail: "กรุณารันไฟล์ supabase-setup.sql",
    icon: Database,
    tone: "text-sky-100 border-sky-400/30 bg-sky-500/10",
  },
  offline: {
    label: "โหมดออฟไลน์",
    detail: "เก็บข้อมูลไว้ในเครื่องชั่วคราว",
    icon: WifiOff,
    tone: "text-rose-100 border-rose-400/30 bg-rose-500/10",
  },
  error: {
    label: "การเชื่อมต่อมีปัญหา",
    detail: "ตรวจสอบ URL หรือ API Key",
    icon: AlertTriangle,
    tone: "text-rose-100 border-rose-400/30 bg-rose-500/10",
  },
};

export const appTabs = [
  { id: "create", label: "สร้าง Draft", icon: Plus },
  { id: "status", label: "สถานะงาน", icon: Database },
  { id: "settings", label: "ตั้งค่า", icon: Settings2 },
];

export const APP_VERSION = "0.2.0-dashboard";
export const BUILD_TIME = new Date().toISOString();

export const TEXT_PROVIDERS = [
  { id: "mock", label: "Mock Mode", description: "Safe and free for testing", safety: "Safe / Free" },
  { id: "gemini", label: "Gemini API", description: "High performance, cost-effective", safety: "API Cost" },
  { id: "openai", label: "OpenAI API", description: "Standard high-quality generation", safety: "API Cost" },
  { id: "codex", label: "Codex CLI", description: "Local workflow (Planned)", safety: "Local" },
];

export const IMAGE_PROVIDERS = [
  { id: "mock", label: "Mock Mode", description: "Safe and free for testing", safety: "Safe / Free" },
  { id: "gpt-image", label: "GPT Image", description: "DALL-E 3 via GPT-4o", safety: "API Cost" },
  { id: "dalle", label: "DALL·E API", description: "Native OpenAI image generation", safety: "API Cost" },
];

export const WORKSPACE_PAGES = [
  { id: "default", label: "Default Page", description: "Current stable Facebook settings" },
  { id: "demo-mock", label: "Demo / Mock Page", description: "Simulation for workspace testing" },
];

export const CONTENT_TYPES = [
  { id: "general", label: "General Post" },
  { id: "promo", label: "Promo" },
  { id: "story", label: "Storytelling" },
  { id: "engagement", label: "Engagement Question" },
  { id: "announcement", label: "Announcement" },
];

export const CONTENT_TONES = [
  { id: "friendly", label: "Friendly" },
  { id: "professional", label: "Professional" },
  { id: "funny", label: "Funny" },
  { id: "emotional", label: "Emotional" },
  { id: "bold", label: "Bold" },
];

export const CONTENT_LENGTHS = [
  { id: "short", label: "Short" },
  { id: "medium", label: "Medium" },
  { id: "long", label: "Long" },
];

export const CONTENT_CTAS = [
  { id: "none", label: "None" },
  { id: "comment", label: "Comment" },
  { id: "share", label: "Share" },
  { id: "inbox", label: "Inbox" },
  { id: "link", label: "Visit Link" },
];
