"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

export type Lang = "zh" | "en"

type Dict = Record<string, { zh: string; en: string }>

// Central bilingual dictionary. Keys are grouped by prefix for readability.
export const dict: Dict = {
  // Brand / global
  "brand.name": { zh: "Agu 舞蹈工作室", en: "Agu Dance Studio" },
  "brand.tagline": { zh: "全流程管理及预约平台", en: "Studio management & booking" },
  "app.selectRole": { zh: "选择你的身份", en: "Choose your role" },
  "app.selectRoleDesc": {
    zh: "一个平台，服务学员、教师与教务管理。",
    en: "One platform for students, teachers, and administrators.",
  },
  "app.enter": { zh: "进入", en: "Enter" },
  "app.backHome": { zh: "退出登录", en: "Log out" },

  // Auth
  "auth.username": { zh: "用户名", en: "Username" },
  "auth.password": { zh: "密码", en: "Password" },
  "auth.login": { zh: "登录", en: "Log in" },
  "auth.invalidCredentials": { zh: "用户名或密码错误", en: "Invalid username or password" },
  "auth.newPassword": { zh: "新密码", en: "New password" },
  "auth.confirmPassword": { zh: "确认新密码", en: "Confirm new password" },
  "auth.passwordMismatch": { zh: "两次输入的密码不一致", en: "Passwords don't match" },
  "auth.passwordTooShort": { zh: "密码至少需要 8 位", en: "Password must be at least 8 characters" },
  "auth.mustChangePassword": { zh: "请设置新密码", en: "Set a new password" },
  "auth.mustChangePasswordDesc": {
    zh: "管理员已重置您的密码，请设置一个新密码后继续",
    en: "An admin reset your password — set a new one to continue",
  },
  "auth.register": { zh: "注册", en: "Register" },
  "auth.noAccount": { zh: "还没有账号？立即注册", en: "Don't have an account? Register" },
  "auth.wechat": { zh: "微信号", en: "WeChat ID" },
  "auth.email": { zh: "邮箱", en: "Email" },
  "auth.currentPassword": { zh: "当前密码", en: "Current password" },
  "auth.currentPasswordWrong": { zh: "当前密码不正确", en: "Current password is incorrect" },
  "auth.passwordChanged": { zh: "密码已修改", en: "Password changed" },
  "auth.register.err.name": { zh: "请填写姓名", en: "Please enter your name" },
  "auth.register.err.phone": { zh: "请填写手机号", en: "Please enter your phone number" },
  "auth.register.err.phoneTaken": { zh: "该手机号已注册", en: "This phone number is already registered" },

  // Roles
  "role.student": { zh: "学员", en: "Student" },
  "role.student.desc": { zh: "查课 · 预约 · 课时卡 · 签到码", en: "Browse, book, class cards & check-in" },
  "role.teacher": { zh: "教师", en: "Teacher" },
  "role.teacher.desc": { zh: "个人课表 · 一键点名签到", en: "Your schedule & one-tap roll call" },
  "role.admin": { zh: "教务管理", en: "Administrator" },
  "role.admin.desc": { zh: "排课 · 卡项 · 财务 · 报表", en: "Scheduling, cards, finance & reports" },

  // Common
  "common.today": { zh: "今天", en: "Today" },
  "common.book": { zh: "预约", en: "Book" },
  "common.booked": { zh: "已预约", en: "Booked" },
  "common.cancel": { zh: "取消预约", en: "Cancel" },
  "common.waitlist": { zh: "候补", en: "Waitlist" },
  "common.onWaitlist": { zh: "候补中", en: "On waitlist" },
  "common.full": { zh: "已满", en: "Full" },
  "common.spots": { zh: "名额", en: "spots" },
  "common.remaining": { zh: "剩余", en: "left" },
  "common.min": { zh: "分钟", en: "min" },
  "common.close": { zh: "关闭", en: "Close" },
  "common.loading": { zh: "加载中", en: "Loading" },
  "common.confirm": { zh: "确认", en: "Confirm" },
  "common.save": { zh: "保存", en: "Save" },
  "common.all": { zh: "全部", en: "All" },
  "common.search": { zh: "搜索", en: "Search" },
  "common.notes": { zh: "备注", en: "Notes" },
  "common.status": { zh: "状态", en: "Status" },
  "common.actions": { zh: "操作", en: "Actions" },
  "common.edit": { zh: "编辑", en: "Edit" },
  "common.delete": { zh: "删除", en: "Delete" },
  "common.name": { zh: "姓名", en: "Name" },
  "common.phone": { zh: "手机号", en: "Phone" },
  "common.date": { zh: "日期", en: "Date" },
  "common.time": { zh: "时间", en: "Time" },
  "common.type": { zh: "类型", en: "Type" },

  // Weekdays
  "day.mon": { zh: "周一", en: "Mon" },
  "day.tue": { zh: "周二", en: "Tue" },
  "day.wed": { zh: "周三", en: "Wed" },
  "day.thu": { zh: "周四", en: "Thu" },
  "day.fri": { zh: "周五", en: "Fri" },
  "day.sat": { zh: "周六", en: "Sat" },
  "day.sun": { zh: "周日", en: "Sun" },

  // Dance styles
  "style.jazz": { zh: "爵士舞", en: "Jazz" },
  "style.hiphop": { zh: "嘻哈街舞", en: "Hip-Hop" },
  "style.ballet": { zh: "芭蕾形体", en: "Ballet" },
  "style.kpop": { zh: "韩舞", en: "K-Pop" },
  "style.contemporary": { zh: "现代舞", en: "Contemporary" },
  "style.latin": { zh: "拉丁舞", en: "Latin" },

  // Student nav
  "stu.nav.schedule": { zh: "课表", en: "Schedule" },
  "stu.nav.bookings": { zh: "我的预约", en: "Bookings" },
  "stu.nav.cards": { zh: "卡包", en: "Cards" },
  "stu.nav.me": { zh: "我的", en: "Me" },
  "stu.schedule.title": { zh: "课程预约", en: "Book a class" },
  "stu.filter.style": { zh: "舞种", en: "Style" },
  "stu.filter.teacher": { zh: "老师", en: "Teacher" },
  "stu.filter.room": { zh: "教室", en: "Room" },
  "stu.bookings.upcoming": { zh: "即将上课", en: "Upcoming" },
  "stu.bookings.history": { zh: "历史记录", en: "History" },
  "stu.bookings.empty": { zh: "还没有预约，去课表看看吧", en: "No bookings yet — browse the schedule" },
  "stu.cards.title": { zh: "我的卡包", en: "My cards" },
  "stu.cards.balance": { zh: "剩余课时", en: "Classes left" },
  "stu.cards.expiry": { zh: "有效期至", en: "Valid until" },
  "stu.cards.unlimited": { zh: "不限次数", en: "Unlimited" },
  "stu.cards.ledger": { zh: "消课 / 充值明细", en: "Transaction history" },
  "stu.card.times": { zh: "次卡", en: "Punch card" },
  "stu.card.period": { zh: "期限卡", en: "Period pass" },
  "stu.card.trial": { zh: "体验卡", en: "Trial card" },
  "stu.qr.title": { zh: "我的签到码", en: "My check-in code" },
  "stu.qr.desc": { zh: "上课时向老师出示此码完成签到", en: "Show this to your teacher to check in" },
  "stu.qr.show": { zh: "出示签到码", en: "Show check-in code" },
  "stu.me.member": { zh: "会员", en: "Member" },
  "stu.profile.edit": { zh: "编辑资料", en: "Edit profile" },
  "stu.profile.changePassword": { zh: "修改密码", en: "Change password" },
  "stu.cancelRule": { zh: "开课前 4 小时可免费取消", en: "Free cancellation up to 4h before class" },
  "ledger.consume": { zh: "消课", en: "Class" },
  "ledger.recharge": { zh: "充值", en: "Top-up" },
  "ledger.gift": { zh: "赠课", en: "Gift" },
  "ledger.refund": { zh: "退费", en: "Refund" },

  // Teacher
  "tea.title": { zh: "教师工作台", en: "Teacher console" },
  "tea.mySchedule": { zh: "我的课表", en: "My schedule" },
  "tea.rollcall": { zh: "课堂点名", en: "Roll call" },
  "tea.students": { zh: "学员", en: "students" },
  "tea.checkedIn": { zh: "已签到", en: "Checked in" },
  "tea.notCheckedIn": { zh: "未签到", en: "Not in" },
  "tea.checkIn": { zh: "签到", en: "Check in" },
  "tea.proxyCheckIn": { zh: "代签", en: "Proxy" },
  "tea.startClass": { zh: "开始点名", en: "Start roll call" },
  "tea.finishClass": { zh: "完成点名", en: "Finish" },
  "tea.attendance": { zh: "出勤", en: "Attendance" },
  "tea.thisWeek": { zh: "本周课时", en: "Classes this week" },
  "tea.thisMonthHeads": { zh: "本月上课人次", en: "Students this month" },

  // Admin
  "adm.title": { zh: "教务管理后台", en: "Admin console" },
  "adm.nav.overview": { zh: "运营总览", en: "Overview" },
  "adm.nav.schedule": { zh: "排课管理", en: "Scheduling" },
  "adm.nav.students": { zh: "学员管理", en: "Students" },
  "adm.nav.cards": { zh: "卡项 / 收银", en: "Cards & cashier" },
  "adm.nav.finance": { zh: "财务统计", en: "Finance" },
  "adm.nav.notifications": { zh: "通知中心", en: "Notifications" },
  "adm.nav.users": { zh: "账号管理", en: "User accounts" },
  "adm.users.add": { zh: "新建账号", en: "Add account" },
  "adm.users.role": { zh: "角色", en: "Role" },
  "adm.users.linkedTo": { zh: "关联", en: "Linked to" },
  "adm.users.created": { zh: "创建时间", en: "Created" },
  "adm.users.resetPassword": { zh: "重置密码", en: "Reset password" },
  "adm.users.resetPasswordDesc": {
    zh: "该账号的所有登录状态将失效，需要用新密码重新登录",
    en: "All of this account's active sessions will be signed out — they'll need to log in again with the new password",
  },
  "adm.users.deleteDesc": {
    zh: "仅删除登录账号，学员/教师的业务数据（课时卡、预约记录等）将保留",
    en: "Only removes login access — the linked student/teacher's business data (cards, bookings, history) is kept",
  },
  "adm.users.linkMode": { zh: "关联方式", en: "Link to" },
  "adm.users.linkExisting": { zh: "已有档案", en: "Existing record" },
  "adm.users.linkNew": { zh: "新建档案", en: "New record" },
  "adm.users.noneUnlinked": { zh: "没有可关联的档案", en: "No unlinked records available" },
  "adm.users.pickStudent": { zh: "选择学员档案", en: "Select a student record" },
  "adm.users.pickTeacher": { zh: "选择教师档案", en: "Select a teacher record" },
  "adm.users.err.invalidUsername": { zh: "用户名至少需要 3 位", en: "Username must be at least 3 characters" },
  "adm.users.err.invalidPassword": { zh: "密码至少需要 8 位", en: "Password must be at least 8 characters" },
  "adm.users.err.missingLink": { zh: "请选择或填写关联档案", en: "Please select or fill in a record to link" },
  "adm.users.err.missingStudentFields": { zh: "请填写学员姓名和手机号", en: "Please fill in the student's name and phone" },
  "adm.users.err.missingTeacherFields": { zh: "请填写教师中英文姓名", en: "Please fill in the teacher's name (zh & en)" },
  "adm.users.err.lastAdmin": { zh: "无法删除最后一个管理员账号", en: "Can't delete the last remaining admin account" },
  "adm.users.err.generic": { zh: "操作失败，请重试", en: "Something went wrong — please try again" },
  "adm.kpi.revenue": { zh: "本月现金流", en: "Monthly cash flow" },
  "adm.kpi.consumed": { zh: "本月课耗", en: "Classes consumed" },
  "adm.kpi.headcount": { zh: "上课人次", en: "Attendance" },
  "adm.kpi.activeStudents": { zh: "活跃学员", en: "Active students" },
  "adm.chart.cashflow": { zh: "近 6 个月现金流", en: "Cash flow · last 6 months" },
  "adm.chart.byStyle": { zh: "各舞种课耗占比", en: "Consumption by style" },
  "adm.chart.teacherHeads": { zh: "教师上课人次 / 提成", en: "Teacher attendance & commission" },
  "adm.schedule.weekly": { zh: "每周循环课表", en: "Weekly recurring schedule" },
  "adm.schedule.add": { zh: "新增排课", en: "Add class" },
  "adm.schedule.editSingle": { zh: "单次调整", en: "Edit single session" },
  "adm.schedule.cancelClass": { zh: "停课", en: "Cancel class" },
  "adm.schedule.swapTeacher": { zh: "换老师", en: "Swap teacher" },
  "adm.schedule.swapRoom": { zh: "换教室", en: "Change room" },
  "adm.schedule.day": { zh: "上课日", en: "Day" },
  "adm.schedule.startTime": { zh: "开始时间", en: "Start time" },
  "adm.schedule.endTime": { zh: "结束时间", en: "End time" },
  "adm.schedule.capacity": { zh: "容量", en: "Capacity" },
  "adm.schedule.level": { zh: "难度级别", en: "Level" },
  "adm.students.total": { zh: "学员总数", en: "Total students" },
  "adm.students.addCard": { zh: "购卡 / 续费", en: "Buy / renew" },
  "adm.students.gift": { zh: "赠课", en: "Gift classes" },
  "adm.students.adjust": { zh: "调整课时", en: "Adjust" },
  "adm.students.refund": { zh: "退费", en: "Refund" },
  "adm.students.noCard": { zh: "该学员没有可用卡项", en: "This student has no card to target" },
  "adm.cards.sold": { zh: "在售卡种", en: "Card products" },
  "adm.cards.price": { zh: "价格", en: "Price" },
  "adm.cards.validity": { zh: "有效期", en: "Validity" },
  "adm.cards.sessions": { zh: "课时", en: "Sessions" },
  "adm.reason": { zh: "原因（必填）", en: "Reason (required)" },
  "adm.notif.title": { zh: "自动通知与提醒", en: "Automated notifications" },
  "notif.bookSuccess": { zh: "预约成功通知", en: "Booking confirmed" },
  "notif.waitlistSuccess": { zh: "候补成功通知", en: "Waitlist promoted" },
  "notif.classReminder": { zh: "开课前提醒", en: "Class reminder" },
  "notif.lowBalance": { zh: "课时不足提醒", en: "Low balance alert" },
  "notif.expiring": { zh: "卡片即将到期提醒", en: "Expiry reminder" },

  // Units
  "unit.rmb": { zh: "¥", en: "¥" },
  "unit.classesUnit": { zh: "节", en: "" },
  "unit.people": { zh: "人", en: "" },
  "unit.days": { zh: "天", en: "days" },
}

type Ctx = {
  lang: Lang
  setLang: (l: Lang) => void
  t: (key: string) => string
}

const LanguageContext = createContext<Ctx | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>("zh")
  const t = (key: string) => {
    const entry = dict[key]
    if (!entry) return key
    return entry[lang]
  }
  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider")
  return ctx
}
