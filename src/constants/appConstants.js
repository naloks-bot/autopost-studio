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
    title: "เริ่มต้นใช้งานแอปนี้",
    items: [
      "เปิดแท็บ ตั้งค่า แล้วกรอกข้อมูลธุรกิจ โทนการสื่อสาร และ API ที่ต้องใช้ให้ครบก่อน",
      "กดบันทึกการตั้งค่า ระบบจะเก็บลงในเว็บแอปทันที และจะพยายาม sync ไปที่ Supabase ถ้าสิทธิ์ฐานข้อมูลพร้อม",
      "กลับมาที่แท็บ สร้าง Draft ใส่หัวข้อโพสต์ สร้างข้อความตัวอย่าง ตรวจแก้ และกดบันทึก",
      "แท็บ สถานะงาน จะรวมทั้ง draft ที่อยู่ใน Supabase และ draft ชั่วคราวที่ถูกเก็บไว้ในเครื่อง",
    ],
  },
  {
    title: "หา OpenAI API Key",
    items: [
      "เข้า https://platform.openai.com/ แล้วล็อกอิน",
      "ไปที่เมนู API keys",
      "กด Create new secret key",
      "คัดลอกคีย์มาใส่ในช่อง OpenAI API Key บนแท็บ ตั้งค่า",
      "เก็บคีย์นี้ไว้ให้ปลอดภัย เพราะจะเห็นเต็มครั้งเดียวตอนสร้าง",
    ],
  },
  {
    title: "หา xAI หรือ Grok API Key",
    items: [
      "เข้าแดชบอร์ดนักพัฒนาของ xAI ด้วยบัญชีที่คุณใช้งานอยู่",
      "สร้าง API key ใหม่จากเมนูสำหรับ developers หรือ API access",
      "คัดลอกคีย์มาใส่ในช่อง xAI API Key",
      "ใช้คีย์นี้เมื่อคุณต้องการเชื่อมระบบสร้างรูปหรือข้อความจาก Grok จริง",
    ],
  },
  {
    title: "หา Facebook App และ Page Access Token",
    items: [
      "เข้า https://developers.facebook.com/ แล้วสร้าง App",
      "เพิ่มผลิตภัณฑ์ Facebook Login และ Pages API ตามงานที่ต้องใช้",
      "ดู App ID และ App Secret จากหน้า Settings ของแอป",
      "ไปที่ Graph API Explorer หรือระบบของ Meta เพื่อขอ User Access Token ที่มีสิทธิ์ pages_manage_posts และ pages_read_engagement",
      "แลกเป็น Page Access Token ของเพจที่ต้องการใช้ แล้วนำมาใส่ในช่องที่เกี่ยวข้อง",
      "ตรวจว่า Page ID ตรงกับเพจจริงก่อนกดบันทึก",
    ],
  },
  {
    title: "ตั้งค่า Supabase ให้เขียนข้อมูลได้จริง",
    items: [
      "เปิด Supabase Dashboard ของโปรเจกต์นี้",
      "ไปที่ SQL Editor",
      "รันไฟล์ supabase-setup.sql ที่อยู่ในโฟลเดอร์โปรเจกต์นี้",
      "ไฟล์นี้จะสร้างตาราง app_settings ถ้ายังไม่มี และเปิด policy สำหรับ anon ให้ตรงกับแอปนี้",
      "หลังรันเสร็จ ให้กดปุ่ม รีเฟรชสถานะ ในเว็บแอปอีกครั้ง",
      "ถ้ายังขึ้น read-only แปลว่ายังมี policy หรือ permission ฝั่ง Supabase ที่ยังไม่ถูกแก้",
    ],
  },
];

export const statusCopy = {
  connected: {
    label: "เชื่อมต่อ Supabase ได้และพร้อมทำงาน",
    detail: "อ่านข้อมูลจากฐานจริงได้ และจุดที่ตารางรองรับก็พร้อม sync",
    icon: Cloud,
    tone: "text-emerald-100 border-emerald-400/30 bg-emerald-500/10",
  },
  "read-only": {
    label: "Supabase ยังเป็นโหมดอ่านอย่างเดียว",
    detail: "ตอนนี้ anon key อ่านได้ แต่ insert หรือ upsert ยังติด RLS จึงยังใช้งานจริงได้ไม่เต็มรูปแบบ",
    icon: HardDriveDownload,
    tone: "text-amber-100 border-amber-400/30 bg-amber-500/10",
  },
  "missing-table": {
    label: "ตารางที่แอปต้องใช้ยังไม่ครบ",
    detail: "โครงสร้างใน Supabase ยังไม่ครบตามแอปนี้ ให้รันไฟล์ supabase-setup.sql",
    icon: Database,
    tone: "text-sky-100 border-sky-400/30 bg-sky-500/10",
  },
  offline: {
    label: "ยังไม่พร้อมเชื่อม Supabase",
    detail: "ตรวจไม่พบค่าที่จำเป็นใน .env จึงทำงานแบบ local only",
    icon: WifiOff,
    tone: "text-rose-100 border-rose-400/30 bg-rose-500/10",
  },
  error: {
    label: "การเชื่อมต่อมีปัญหา",
    detail: "แอปยังเปิดใช้งานได้ แต่ต้องตรวจ connection, policy หรือ schema เพิ่ม",
    icon: AlertTriangle,
    tone: "text-rose-100 border-rose-400/30 bg-rose-500/10",
  },
  empty: {
    label: "เชื่อมต่อสำเร็จ แต่ยังไม่มีข้อมูล",
    detail: "เชื่อมต่อฐานได้แล้ว เพียงแต่ตารางนี้ยังไม่มีแถวข้อมูล",
    icon: Cloud,
    tone: "text-emerald-100 border-emerald-400/30 bg-emerald-500/10",
  },
};

export const appTabs = [
  { id: "create", label: "สร้าง Draft", icon: Plus },
  { id: "settings", label: "ตั้งค่า", icon: Settings2 },
  { id: "status", label: "สถานะงาน", icon: Database },
  { id: "guide", label: "คู่มือ", icon: BookOpen },
];
