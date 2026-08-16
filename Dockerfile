FROM php:8.4-cli-alpine

WORKDIR /app

# Build tools + MongoDB PHP extension
RUN apk add --no-cache autoconf gcc g++ make openssl-dev \
    && pecl install mongodb \
    && docker-php-ext-enable mongodb \
    && apk del autoconf gcc g++ make

# Composer
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

# Install PHP dependencies (before copying app code for layer caching)
COPY composer.json ./
RUN composer install --no-dev --no-interaction --optimize-autoloader --no-scripts

# Copy application (vendor/ preserved from previous layer via .dockerignore)
COPY . .

EXPOSE 10000
CMD php -S 0.0.0.0:${PORT:-10000} router.php
