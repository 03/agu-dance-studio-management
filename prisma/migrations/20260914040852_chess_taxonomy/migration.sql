/*
  Warnings:

  - You are about to drop the column `style` on the `class_sessions` table. All the data in the column will be lost.
  - You are about to drop the column `styles` on the `teachers` table. All the data in the column will be lost.
  - Added the required column `category` to the `class_sessions` table without a default value. This is not possible if the table is not empty.
  - Added the required column `categories` to the `teachers` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `class_sessions` DROP COLUMN `style`,
    ADD COLUMN `category` ENUM('BULLET', 'BLITZ', 'RAPID', 'CLASSICAL', 'OPENINGS', 'ENDGAME') NOT NULL,
    ADD COLUMN `kind` ENUM('REGULAR', 'TOURNAMENT') NOT NULL DEFAULT 'REGULAR';

-- AlterTable
ALTER TABLE `students` ADD COLUMN `rating` INTEGER NULL;

-- AlterTable
ALTER TABLE `teachers` DROP COLUMN `styles`,
    ADD COLUMN `categories` JSON NOT NULL,
    ADD COLUMN `rating` INTEGER NULL;
