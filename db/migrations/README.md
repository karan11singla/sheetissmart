# Flyway Migrations

This directory contains SQL migration scripts for the SheetIsSmart database.

## Naming Convention

Migration files must follow this format:
- `V{version}__{description}.sql` for versioned migrations
- Example: `V001__initial_schema.sql`

## Usage

Migrations will be automatically run during deployment via the Flyway service in docker-compose.

## Current State

The database has been baselined at V0. Future schema changes should be added as new versioned migrations.

For now, Prisma `db push` is used in the deployment workflow for quick schema updates.
Flyway is available for more controlled migrations when needed.
