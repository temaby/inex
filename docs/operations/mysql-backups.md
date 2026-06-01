# MySQL Backups

## Current Setup

- Host: production EC2 Ubuntu instance.
- Database: MySQL 8 running in Docker container `inex-mysql`.
- Backup script: `/home/ubuntu/inex/backup.sh`.
- Schedule user: `ubuntu`.
- Log file: `/home/ubuntu/inex/backup.log`.
- S3 bucket: `inex-db-backups-135501091093-eu-central-1-an`.
- S3 prefix: `backups/`.
- Retention: 30 days through an S3 lifecycle rule on the `backups/` prefix.

## Cron

The production backup is scheduled in the `ubuntu` user's crontab:

```cron
CRON_TZ=UTC
0 2 * * * /home/ubuntu/inex/backup.sh >> /home/ubuntu/inex/backup.log 2>&1
```

This runs daily at 02:00 UTC. Keep the log under `/home/ubuntu/inex/`; the `ubuntu` user may not be able to create files under `/var/log`.

To inspect or edit the schedule:

```bash
crontab -l
crontab -e
```

`sudo crontab -l` checks root's crontab and is expected to be empty unless root-specific jobs are added later.

## Backup Script Contract

`/home/ubuntu/inex/backup.sh` must:

- dump the `inex-mysql` database with `mysqldump`;
- compress the dump with `gzip`;
- upload it to `s3://inex-db-backups-135501091093-eu-central-1-an/backups/`;
- emit useful success/failure output for cron logging;
- use UTC timestamped filenames, not date-only filenames.

Use timestamped filenames so same-day manual or test runs do not overwrite the same S3 object:

```bash
DATE=$(date -u +'%Y-%m-%dT%H-%M-%SZ')
BACKUP_FILE="inex_${DATE}.sql.gz"
```

Expected object format:

```text
s3://inex-db-backups-135501091093-eu-central-1-an/backups/inex_2026-06-01T14-35-00Z.sql.gz
```

## Manual Backup

Run the backup as the same user cron uses:

```bash
sudo -u ubuntu /home/ubuntu/inex/backup.sh
echo $?
```

Exit code `0` means the script completed. Confirm the uploaded object:

```bash
aws s3 ls s3://inex-db-backups-135501091093-eu-central-1-an/backups/
```

## Debug Cron

Check whether the job is installed:

```bash
crontab -l
sudo crontab -l
```

Check whether cron is running:

```bash
sudo systemctl status cron
```

Start it if needed:

```bash
sudo systemctl enable --now cron
```

Inspect recent cron activity:

```bash
grep CRON /var/log/syslog | tail -100
```

Inspect backup output:

```bash
tail -100 /home/ubuntu/inex/backup.log
```

To test scheduling, temporarily add an every-minute line:

```cron
* * * * * /home/ubuntu/inex/backup.sh >> /home/ubuntu/inex/backup.log 2>&1
```

Wait one or two minutes, verify the log and S3 object, then remove the every-minute line immediately.

## Restore Test

Test restores against a non-production MySQL instance only.

Download a backup:

```bash
aws s3 cp s3://inex-db-backups-135501091093-eu-central-1-an/backups/<backup-file>.sql.gz .
```

Restore into a local or disposable MySQL container:

```bash
gunzip -c <backup-file>.sql.gz | docker exec -i inex-mysql mysql -u root -p inex
```

Use the correct target database name for the restore environment. Do not pipe a production backup into the production container unless performing an intentional recovery.

## IAM And Retention

The EC2 instance role needs S3 write/list access for the backup bucket:

```json
{
  "Effect": "Allow",
  "Action": ["s3:PutObject", "s3:ListBucket"],
  "Resource": [
    "arn:aws:s3:::inex-db-backups-135501091093-eu-central-1-an",
    "arn:aws:s3:::inex-db-backups-135501091093-eu-central-1-an/*"
  ]
}
```

The S3 bucket should block public access. A lifecycle rule should expire objects under `backups/` after 30 days.

## Future Migration

When RDS replaces EC2-hosted MySQL, this cron-based `mysqldump` mechanism is superseded by RDS automated backups. The RDS setup must document retention and restore testing before this cron job is removed.
