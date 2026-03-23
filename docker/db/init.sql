CREATE DATABASE IF NOT EXISTS `real_world`      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `test_real_world` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `real_world`.*      TO 'real_world'@'%';
GRANT ALL PRIVILEGES ON `test_real_world`.* TO 'real_world'@'%';

FLUSH PRIVILEGES;
