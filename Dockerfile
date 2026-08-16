FROM php:8.4-cli-alpine

WORKDIR /app

# Build tools + MongoDB PHP extension (pinned to 1.x to match mongodb/mongodb ^1.19)
RUN apk add --no-cache autoconf gcc g++ make openssl-dev \
    && pecl install mongodb-1.21.0 \
    && docker-php-ext-enable mongodb \
    && apk del autoconf gcc g++ make

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install PHP dependencies
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --optimize-autoloader --no-scripts

# Copy application
COPY . .

EXPOSE 10000
CMD php -S 0.0.0.0:${PORT:-10000} router.php
