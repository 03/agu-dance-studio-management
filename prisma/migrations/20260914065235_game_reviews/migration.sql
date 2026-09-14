-- CreateTable
CREATE TABLE `game_reviews` (
    `id` VARCHAR(191) NOT NULL,
    `studentId` VARCHAR(191) NOT NULL,
    `teacherId` VARCHAR(191) NULL,
    `title` VARCHAR(191) NOT NULL,
    `pgn` TEXT NOT NULL,
    `result` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `game_comments` (
    `id` VARCHAR(191) NOT NULL,
    `reviewId` VARCHAR(191) NOT NULL,
    `ply` INTEGER NOT NULL,
    `teacherId` VARCHAR(191) NOT NULL,
    `text` TEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `game_comments_reviewId_idx`(`reviewId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `game_reviews` ADD CONSTRAINT `game_reviews_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_reviews` ADD CONSTRAINT `game_reviews_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_comments` ADD CONSTRAINT `game_comments_reviewId_fkey` FOREIGN KEY (`reviewId`) REFERENCES `game_reviews`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `game_comments` ADD CONSTRAINT `game_comments_teacherId_fkey` FOREIGN KEY (`teacherId`) REFERENCES `teachers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
