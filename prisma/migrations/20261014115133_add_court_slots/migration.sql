-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_court_id_fkey`;

-- DropIndex
DROP INDEX `bookings_court_id_start_time_key` ON `bookings`;

-- CreateTable
CREATE TABLE `court_slots` (
    `court_id` INTEGER NOT NULL,
    `slot_start` DATETIME(3) NOT NULL,
    `booking_id` INTEGER NOT NULL,

    PRIMARY KEY (`court_id`, `slot_start`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_court_id_fkey` FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `court_slots` ADD CONSTRAINT `court_slots_court_id_fkey` FOREIGN KEY (`court_id`) REFERENCES `courts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `court_slots` ADD CONSTRAINT `court_slots_booking_id_fkey` FOREIGN KEY (`booking_id`) REFERENCES `bookings`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: a booking that is confirmed, or pending with a hold that has not
-- expired yet, currently holds its slot even though this table did not
-- exist to say so. Every other status (cancelled, expired) holds nothing and
-- gets no rows, matching how cancelling and hold expiry behave from here on.
-- `units` is a plain number generator, 0 to 47, covering any booking up to
-- 24 hours long in 30 minute steps, comfortably more than any real booking.
INSERT INTO `court_slots` (`court_id`, `slot_start`, `booking_id`)
SELECT b.`court_id`, DATE_ADD(b.`start_time`, INTERVAL (units.n * 30) MINUTE), b.`id`
FROM `bookings` b
JOIN (
    SELECT n0.n + n1.n * 8 AS n
    FROM (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2 UNION SELECT 3
          UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7) n0
    CROSS JOIN (SELECT 0 AS n UNION SELECT 1 UNION SELECT 2
                UNION SELECT 3 UNION SELECT 4 UNION SELECT 5) n1
) units
WHERE DATE_ADD(b.`start_time`, INTERVAL (units.n * 30) MINUTE) < b.`end_time`
  AND (
    b.`status` = 'confirmed'
    OR (b.`status` = 'pending' AND b.`hold_expires_at` > UTC_TIMESTAMP(3))
  );
