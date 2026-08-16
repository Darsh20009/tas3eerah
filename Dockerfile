FROM php:8.4-cli-alpine

WORKDIR /app

# Install SQLite3 extension (required for the database)
RUN apk add --no-cache sqlite-dev \
    && docker-php-ext-install pdo pdo_sqlite

# Copy project files
COPY . .

# Ensure database directory is writable at runtime
RUN mkdir -p /app/database && chmod 777 /app/database

# Render injects PORT dynamically; default to 10000 for local Docker runs
EXPOSE 10000

# Use shell form so ${PORT} is expanded at runtime
CMD php -S 0.0.0.0:${PORT:-10000} router.php
