# AWS Deployment (Phase 1)

Deploy EnrollEagle on AWS using Docker containers, ECS Fargate, and RDS PostgreSQL.

---

## 0. Quick Reference

| Resource | Value |
|---|---|
| API Docker image | `apps/api/Dockerfile` |
| Web Docker image | `apps/web/Dockerfile` |
| ECS task definition | `infra/aws/ecs-task-def.json` |
| Deploy script | `infra/aws/deploy.sh` |
| Prod env template | `.env.production.example` |
| Local stack | `docker compose -f infra/docker-compose.yml up` |

---

## 1. Prerequisites

- **AWS CLI v2** installed and configured (`aws configure`)
- **Docker** installed and running
- **Domain** managed in Route 53 (recommended) — e.g. `enrolleagle.example.com`
- **ACM certificate** for HTTPS on the ALB
- **Google OAuth** app created in Google Cloud Console

---

## 2. Test Locally with Docker Compose

Before deploying to AWS, verify everything works locally.

```bash
# Copy and fill in your local env values
cp .env.production.example .env
# Edit .env — for local testing keep the defaults from apps/api/.env.example

# Start all services (db, api, web)
docker compose -f infra/docker-compose.yml up --build

# Verify
curl http://localhost:5000/health   # → {"status":"ok"}
open http://localhost:5173           # → React app
```

---

## 3. Create ECR Repositories

```bash
export AWS_ACCOUNT_ID=123456789012   # ← your account ID
export AWS_REGION=us-west-2          # ← your region

# API repo
aws ecr create-repository \
  --repository-name enrolleagle-api \
  --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true

# Web repo (only if hosting frontend on ECS too)
aws ecr create-repository \
  --repository-name enrolleagle-web \
  --region "$AWS_REGION" \
  --image-scanning-configuration scanOnPush=true
```

---

## 4. Build and Push Images

Use the deploy script (recommended):

```bash
export AWS_ACCOUNT_ID=123456789012
export AWS_REGION=us-west-2
export VITE_API_BASE_URL=https://api.enrolleagle.example.com

# API only
./infra/aws/deploy.sh

# API + Web
./infra/aws/deploy.sh --with-web
```

Or manually:

```bash
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"

# Login
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"

# Build and push API
docker build -f apps/api/Dockerfile -t enrolleagle-api .
docker tag enrolleagle-api:latest "$REGISTRY/enrolleagle-api:latest"
docker push "$REGISTRY/enrolleagle-api:latest"
```

---

## 5. Provision RDS PostgreSQL

```bash
# Create a DB subnet group (use your VPC's private subnets)
aws rds create-db-subnet-group \
  --db-subnet-group-name enrolleagle-db-subnet \
  --db-subnet-group-description "EnrollEagle DB subnets" \
  --subnet-ids subnet-aaaa subnet-bbbb

# Create the RDS instance
aws rds create-db-instance \
  --db-instance-identifier enrolleagle-db \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --engine-version 16 \
  --master-username enrolleagle \
  --master-user-password "CHOOSE_A_STRONG_PASSWORD" \
  --allocated-storage 20 \
  --db-name enrolleagle \
  --vpc-security-group-ids sg-xxxxxxxx \
  --db-subnet-group-name enrolleagle-db-subnet \
  --no-publicly-accessible \
  --storage-encrypted \
  --backup-retention-period 7

# Wait for it to become available
aws rds wait db-instance-available --db-instance-identifier enrolleagle-db

# Get the endpoint
aws rds describe-db-instances \
  --db-instance-identifier enrolleagle-db \
  --query 'DBInstances[0].Endpoint.Address' --output text
```

Your `DATABASE_URL` will be:
```
postgresql+psycopg://enrolleagle:CHOOSE_A_STRONG_PASSWORD@<endpoint>:5432/enrolleagle
```

---

## 6. Create ECS Cluster and Log Group

```bash
# CloudWatch log group
aws logs create-log-group --log-group-name /ecs/enrolleagle-api --region "$AWS_REGION"

# ECS cluster
aws ecs create-cluster --cluster-name enrolleagle --region "$AWS_REGION"
```

---

## 7. Register Task Definition

Edit `infra/aws/ecs-task-def.json` — replace all `<ACCOUNT_ID>`, `<REGION>`, and `REPLACE_ME` placeholders with real values, then:

```bash
aws ecs register-task-definition \
  --cli-input-json file://infra/aws/ecs-task-def.json \
  --region "$AWS_REGION"
```

---

## 8. Create ALB + Target Group

```bash
# Create the ALB (use your public subnets)
aws elbv2 create-load-balancer \
  --name enrolleagle-alb \
  --subnets subnet-aaaa subnet-bbbb \
  --security-groups sg-xxxxxxxx \
  --scheme internet-facing \
  --type application \
  --region "$AWS_REGION"

# Note the ALB ARN from the output, then create a target group
aws elbv2 create-target-group \
  --name enrolleagle-api-tg \
  --protocol HTTP \
  --port 5000 \
  --vpc-id vpc-xxxxxxxx \
  --target-type ip \
  --health-check-path /health \
  --health-check-interval-seconds 30 \
  --healthy-threshold-count 2 \
  --region "$AWS_REGION"

# Create HTTPS listener (requires ACM cert ARN)
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTPS \
  --port 443 \
  --certificates CertificateArn=<ACM_CERT_ARN> \
  --default-actions Type=forward,TargetGroupArn=<TARGET_GROUP_ARN> \
  --region "$AWS_REGION"

# Optional: HTTP → HTTPS redirect
aws elbv2 create-listener \
  --load-balancer-arn <ALB_ARN> \
  --protocol HTTP \
  --port 80 \
  --default-actions 'Type=redirect,RedirectConfig={Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
  --region "$AWS_REGION"
```

Point your API domain (e.g. `api.enrolleagle.example.com`) to the ALB via a Route 53 alias record.

---

## 9. Create ECS Service

```bash
aws ecs create-service \
  --cluster enrolleagle \
  --service-name enrolleagle-api \
  --task-definition enrolleagle-api \
  --desired-count 1 \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaaa,subnet-bbbb],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}" \
  --load-balancers "targetGroupArn=<TARGET_GROUP_ARN>,containerName=api,containerPort=5000" \
  --region "$AWS_REGION"
```

---

## 10. Run Database Migrations

Run a one-off ECS task to apply Alembic migrations:

```bash
# Override the command to run alembic instead of gunicorn
aws ecs run-task \
  --cluster enrolleagle \
  --task-definition enrolleagle-api \
  --launch-type FARGATE \
  --network-configuration "awsvpcConfiguration={subnets=[subnet-aaaa],securityGroups=[sg-xxxxxxxx],assignPublicIp=ENABLED}" \
  --overrides '{
    "containerOverrides": [{
      "name": "api",
      "command": ["alembic", "upgrade", "head"]
    }]
  }' \
  --region "$AWS_REGION"

# Check the task status
aws ecs describe-tasks \
  --cluster enrolleagle \
  --tasks <TASK_ARN> \
  --region "$AWS_REGION" \
  --query 'tasks[0].lastStatus'
```

---

## 11. Schedule Cron Polling (EventBridge)

Create an EventBridge rule that hits the `/cron/tick` endpoint every 2 minutes:

```bash
# Create the rule
aws events put-rule \
  --name enrolleagle-tick \
  --schedule-expression "rate(2 minutes)" \
  --state ENABLED \
  --region "$AWS_REGION"

# The target calls the API via HTTPS
# Option A: Use an API Gateway HTTP integration
# Option B: Use a Lambda that makes the GET request

# Simplest: small Lambda function
# Or use EventBridge → API Destinations:
aws events create-connection \
  --name enrolleagle-cron-conn \
  --authorization-type API_KEY \
  --auth-parameters '{"ApiKeyAuthParameters":{"ApiKeyName":"token","ApiKeyValue":"YOUR_CRON_SECRET"}}' \
  --region "$AWS_REGION"

aws events create-api-destination \
  --name enrolleagle-tick \
  --connection-arn <CONNECTION_ARN> \
  --invocation-endpoint "https://api.enrolleagle.example.com/cron/tick" \
  --http-method GET \
  --region "$AWS_REGION"

aws events put-targets \
  --rule enrolleagle-tick \
  --targets '[{
    "Id": "tick",
    "Arn": "<API_DESTINATION_ARN>",
    "RoleArn": "arn:aws:iam::<ACCOUNT_ID>:role/enrolleagle-eventbridge-role",
    "HttpParameters": {
      "QueryStringParameters": {"token": "YOUR_CRON_SECRET"}
    }
  }]' \
  --region "$AWS_REGION"
```

---

## 12. SES Setup

```bash
# Verify your sending domain
aws ses verify-domain-identity --domain enrolleagle.example.com --region "$AWS_REGION"

# Or verify a single email address
aws ses verify-email-identity --email-address alerts@enrolleagle.example.com --region "$AWS_REGION"

# Check verification status
aws ses get-identity-verification-attributes \
  --identities enrolleagle.example.com --region "$AWS_REGION"
```

> **Important**: New SES accounts are in sandbox mode. Request production access
> via the AWS Console → SES → Account dashboard → "Request production access".

---

## 13. Google OAuth Redirect URIs

In the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) OAuth client, add:

- `https://api.enrolleagle.example.com/auth/google/callback`

Keep for local development:
- `http://localhost:5000/auth/google/callback`

---

## 14. Frontend Hosting

**Option A: S3 + CloudFront** (recommended for AWS-only Phase 1)

```bash
# Build locally
cd apps/web
VITE_API_BASE_URL=https://api.enrolleagle.example.com npm run build

# Create S3 bucket
aws s3 mb s3://enrolleagle-web --region "$AWS_REGION"
aws s3 website s3://enrolleagle-web --index-document index.html --error-document index.html

# Upload build output
aws s3 sync dist/ s3://enrolleagle-web --delete

# Create CloudFront distribution (via Console is easier)
# Point it at the S3 bucket, set default root object to index.html,
# add a custom error response that routes 403/404 → /index.html (SPA routing).
# Attach your ACM cert and CNAME enrolleagle.example.com.
```

**Option B: ECS + Nginx** (if you want everything on ECS)

Push the web Docker image and create a second ECS service using the same pattern as the API.

---

## 15. Verify Deployment

```bash
# API health
curl https://api.enrolleagle.example.com/health

# Frontend loads
curl -s -o /dev/null -w "%{http_code}" https://enrolleagle.example.com

# ECS service status
aws ecs describe-services \
  --cluster enrolleagle \
  --services enrolleagle-api \
  --query 'services[0].{status:status,running:runningCount,desired:desiredCount}' \
  --region "$AWS_REGION"
```

---

## 16. Updating the Deployment

After code changes, redeploy with:

```bash
# Rebuild and push
./infra/aws/deploy.sh

# Force ECS to pull the new image
aws ecs update-service \
  --cluster enrolleagle \
  --service enrolleagle-api \
  --force-new-deployment \
  --region "$AWS_REGION"

# If there are new migrations
# Run step 10 again (one-off alembic task)
```
