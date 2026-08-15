CREATE DATABASE IF NOT EXISTS `blog_service`      CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE IF NOT EXISTS `test_blog_service` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `blog_service`.*      TO 'blog_service'@'%';
GRANT ALL PRIVILEGES ON `test_blog_service`.* TO 'blog_service'@'%';

FLUSH PRIVILEGES;
