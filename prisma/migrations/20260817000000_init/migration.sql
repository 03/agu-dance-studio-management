Loaded Prisma config from prisma.config.ts.

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "DanceStyle" AS ENUM ('JAZZ', 'HIPHOP', 'BALLET', 'KPOP', 'CONTEMPORARY', 'LATIN');

-- CreateEnum
CREATE TYPE "CardType" AS ENUM ('TIMES', 'PERIOD', 'TRIAL');

-- CreateEnum
CREATE TYPE "SessionStatus" AS ENUM ('NORMAL', 'CANCELED');

-- CreateEnum
CREATE TYPE "BookingState" AS ENUM ('BOOKED', 'WAITLIST', 'CANCELED');

-- CreateEnum
CREATE TYPE "LedgerKind" AS ENUM ('CONSUME', 'RECHARGE', 'GIFT', 'REFUND', 'ADJUST');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'INACTIVE');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'ADMIN');

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "avatar" TEXT NOT NULL,
    "styles" "DanceStyle"[],

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT,
    "name" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "address" TEXT,
    "postalCode" TEXT,
    "notes" TEXT,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "class_sessions" (
    "id" TEXT NOT NULL,
    "style" "DanceStyle" NOT NULL,
    "teacherId" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "date" TEXT NOT NULL,
    "start" TEXT NOT NULL,
    "end" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "levelZh" TEXT NOT NULL,
    "levelEn" TEXT NOT NULL,
    "status" "SessionStatus" NOT NULL DEFAULT 'NORMAL',

    CONSTRAINT "class_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "wechat" TEXT,
    "email" TEXT,
    "code" TEXT,
    "joined" TEXT NOT NULL,
    "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bookings" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "state" "BookingState" NOT NULL DEFAULT 'BOOKED',
    "checkedIn" BOOLEAN NOT NULL DEFAULT false,
    "proxy" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bookings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_products" (
    "id" TEXT NOT NULL,
    "type" "CardType" NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "sessions" INTEGER,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "validityDays" INTEGER NOT NULL,

    CONSTRAINT "card_products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_cards" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "productId" TEXT,
    "type" "CardType" NOT NULL,
    "nameZh" TEXT NOT NULL,
    "nameEn" TEXT NOT NULL,
    "balance" INTEGER,
    "isUnlimited" BOOLEAN NOT NULL DEFAULT false,
    "total" INTEGER,
    "expiry" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ledger_entries" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cardId" TEXT,
    "bookingId" TEXT,
    "kind" "LedgerKind" NOT NULL,
    "titleZh" TEXT NOT NULL,
    "titleEn" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "delta" INTEGER NOT NULL,
    "noteZh" TEXT,
    "noteEn" TEXT,

    CONSTRAINT "ledger_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_rules" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "channelZh" TEXT NOT NULL,
    "channelEn" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sampleZh" TEXT NOT NULL,
    "sampleEn" TEXT NOT NULL,

    CONSTRAINT "notification_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teacher_stats" (
    "id" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "heads" INTEGER NOT NULL,
    "commission" INTEGER NOT NULL,

    CONSTRAINT "teacher_stats_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "cardId" TEXT,
    "amount" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "mustChangePassword" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "studentId" TEXT,
    "teacherId" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bookings_studentId_sessionId_key" ON "bookings"("studentId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "ledger_entries_bookingId_key" ON "ledger_entries"("bookingId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_rules_key_key" ON "notification_rules"("key");

-- CreateIndex
CREATE UNIQUE INDEX "teacher_stats_teacherId_key" ON "teacher_stats"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_studentId_key" ON "users"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "users_teacherId_key" ON "users"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "class_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_cards" ADD CONSTRAINT "student_cards_productId_fkey" FOREIGN KEY ("productId") REFERENCES "card_products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "student_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ledger_entries" ADD CONSTRAINT "ledger_entries_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teacher_stats" ADD CONSTRAINT "teacher_stats_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "student_cards"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE SET NU