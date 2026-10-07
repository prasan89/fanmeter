#!/bin/bash
# FanClash GCP Secret Setup
# Run these commands manually to set up secrets and complete deployment

set -e
PROJECT_ID=fanclash-prod
DB_INSTANCE=fanclash-db
REGION=us-central1

echo "=== Step 1: Generate and store database password ==="
DB_PASS=$(openssl rand -base64 32 | tr -d '/+=')

echo -n "$DB_PASS" | gcloud secrets create fanclash-db-password \
  --data-file=- --project=$PROJECT_ID

echo "=== Step 2: Create database user ==="
gcloud sql users create fanclash \
  --instance=$DB_INSTANCE \
  --password="$DB_PASS" \
  --project=$PROJECT_ID

echo "=== Step 3: Get Cloud SQL connection name ==="
CONNECTION_NAME=$(gcloud sql instances describe $DB_INSTANCE \
  --project=$PROJECT_ID \
  --format='value(connectionName)')
echo "Connection name: $CONNECTION_NAME"

echo "=== Step 4: Store database URL secret ==="
DB_URL="jdbc:postgresql:///${DB_INSTANCE}?cloudSqlInstance=${CONNECTION_NAME}&socketFactory=com.google.cloud.sql.postgres.SocketFactory"
echo -n "$DB_URL" | gcloud secrets create fanclash-db-url \
  --data-file=- --project=$PROJECT_ID

echo "=== Step 5: Store database user secret ==="
echo -n "fanclash" | gcloud secrets create fanclash-db-user \
  --data-file=- --project=$PROJECT_ID

echo "=== Step 6: Get Cloud Run service account and grant Secret Manager access ==="
PROJECT_NUMBER=$(gcloud projects describe $PROJECT_ID --format='value(projectNumber)')
SA="$PROJECT_NUMBER-compute@developer.gserviceaccount.com"
echo "Service account: $SA"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/secretmanager.secretAccessor"

gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:$SA" \
  --role="roles/cloudsql.client"

echo "=== Step 7: Deploy backend ==="
gcloud run deploy fanclash-api \
  --image=us-central1-docker.pkg.dev/fanclash-prod/fanclash-docker/fanclash-api:m1 \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --add-cloudsql-instances=$CONNECTION_NAME \
  --set-secrets=DATABASE_PASSWORD=fanclash-db-password:latest \
  --set-secrets=DATABASE_URL=fanclash-db-url:latest \
  --set-secrets=DATABASE_USER=fanclash-db-user:latest \
  --set-env-vars=CORS_ALLOWED_ORIGINS=https://fanclash-web-placeholder.run.app

echo "=== Step 8: Get backend URL ==="
BACKEND_URL=$(gcloud run services describe fanclash-api \
  --region=$REGION --project=$PROJECT_ID \
  --format='value(status.url)')
echo "Backend URL: $BACKEND_URL"

echo "=== Step 9: Deploy frontend ==="
gcloud run deploy fanclash-web \
  --image=us-central1-docker.pkg.dev/fanclash-prod/fanclash-docker/fanclash-web:m1 \
  --platform=managed \
  --region=$REGION \
  --project=$PROJECT_ID \
  --allow-unauthenticated \
  --port=3000 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=5 \
  --set-env-vars=NEXT_PUBLIC_API_URL=$BACKEND_URL

echo "=== Step 10: Get frontend URL ==="
FRONTEND_URL=$(gcloud run services describe fanclash-web \
  --region=$REGION --project=$PROJECT_ID \
  --format='value(status.url)')
echo "Frontend URL: $FRONTEND_URL"

echo "=== Step 11: Update backend CORS with real frontend URL ==="
gcloud run services update fanclash-api \
  --region=$REGION \
  --project=$PROJECT_ID \
  --update-env-vars=CORS_ALLOWED_ORIGINS=$FRONTEND_URL

echo "=== DONE ==="
echo "Frontend: $FRONTEND_URL"
echo "Backend:  $BACKEND_URL"
echo "Health:   $BACKEND_URL/api/health"
echo "Shows:    $BACKEND_URL/api/shows"
