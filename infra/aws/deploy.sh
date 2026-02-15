#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# EnrollEagle — build Docker images and push to AWS ECR
#
# Usage:
#   ./infra/aws/deploy.sh                 # deploy API only
#   ./infra/aws/deploy.sh --with-web      # deploy API + Web images
#
# Required env vars (or export before running):
#   AWS_ACCOUNT_ID   — your 12-digit AWS account ID
#   AWS_REGION       — e.g. us-west-2
#
# Optional:
#   VITE_API_BASE_URL — frontend API base URL (default: https://api.enrolleagle.example.com)
# ---------------------------------------------------------------------------
set -euo pipefail

# ---- configuration --------------------------------------------------------
AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:?Set AWS_ACCOUNT_ID}"
AWS_REGION="${AWS_REGION:?Set AWS_REGION}"
REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com"
API_REPO="enrolleagle-api"
WEB_REPO="enrolleagle-web"
VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://api.enrolleagle.example.com}"
TAG="${TAG:-latest}"
DEPLOY_WEB=false

for arg in "$@"; do
  case "$arg" in
    --with-web) DEPLOY_WEB=true ;;
  esac
done

REPO_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO_ROOT"

# ---- helpers --------------------------------------------------------------
info()  { printf '\033[1;34m>>> %s\033[0m\n' "$*"; }
error() { printf '\033[1;31mERR %s\033[0m\n' "$*" >&2; exit 1; }

ensure_ecr_repo() {
  local repo_name="$1"
  if ! aws ecr describe-repositories --repository-names "$repo_name" --region "$AWS_REGION" >/dev/null 2>&1; then
    info "Creating ECR repository: $repo_name"
    aws ecr create-repository --repository-name "$repo_name" --region "$AWS_REGION" --image-scanning-configuration scanOnPush=true
  fi
}

# ---- authenticate to ECR --------------------------------------------------
info "Logging in to ECR ($REGISTRY)"
aws ecr get-login-password --region "$AWS_REGION" | \
  docker login --username AWS --password-stdin "$REGISTRY"

# ---- API image ------------------------------------------------------------
ensure_ecr_repo "$API_REPO"

info "Building API image"
docker build \
  -f apps/api/Dockerfile \
  -t "${API_REPO}:${TAG}" \
  .

docker tag "${API_REPO}:${TAG}" "${REGISTRY}/${API_REPO}:${TAG}"

info "Pushing API image → ${REGISTRY}/${API_REPO}:${TAG}"
docker push "${REGISTRY}/${API_REPO}:${TAG}"

# ---- Web image (optional) -------------------------------------------------
if [ "$DEPLOY_WEB" = true ]; then
  ensure_ecr_repo "$WEB_REPO"

  info "Building Web image (VITE_API_BASE_URL=${VITE_API_BASE_URL})"
  docker build \
    -f apps/web/Dockerfile \
    --build-arg "VITE_API_BASE_URL=${VITE_API_BASE_URL}" \
    -t "${WEB_REPO}:${TAG}" \
    .

  docker tag "${WEB_REPO}:${TAG}" "${REGISTRY}/${WEB_REPO}:${TAG}"

  info "Pushing Web image → ${REGISTRY}/${WEB_REPO}:${TAG}"
  docker push "${REGISTRY}/${WEB_REPO}:${TAG}"
fi

# ---- done ------------------------------------------------------------------
info "Done! Images pushed to ECR."
echo ""
echo "Next steps:"
echo "  1. Register/update ECS task definition:  aws ecs register-task-definition --cli-input-json file://infra/aws/ecs-task-def.json"
echo "  2. Update ECS service:                   aws ecs update-service --cluster enrolleagle --service enrolleagle-api --force-new-deployment"
echo "  3. Run migrations (one-off):             see DEPLOY_AWS.md section 7"
