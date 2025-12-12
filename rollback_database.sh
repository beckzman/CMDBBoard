#!/bin/bash
# Database Rollback Script
# This script restores the database to the state before the test import

echo "🔄 Rolling back database to pre-test state..."

# Restore the database backup
docker exec -i cmdb_postgres psql -U cmdb_user -d cmdb_database < /tmp/cmdb_backup_before_test.sql

if [ $? -eq 0 ]; then
    echo "✅ Database successfully restored!"
    echo "All test import data has been removed."
else
    echo "❌ Database restore failed!"
    exit 1
fi
