#!/bin/bash
# ==============================================================================
# Rollback skripta za NexGen
# ==============================================================================
# @author MIA BUILD
# @version 1.0.0
# @date 2024-12-24
# @domain Zaledni sistemi
#
# @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
# @meta_atom DEP_005 - Rollback Support
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Konfiguracija
# ==============================================================================

PROJECT_NAME="NexGen"
NAMESPACE="${NAMESPACE:-NexGen}"
DEPLOYMENT_NAME="${DEPLOYMENT_NAME:-NexGen}"
ROLLBACK_TIMEOUT="${ROLLBACK_TIMEOUT:-300}"

# ==============================================================================
# Barve za izpis
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ==============================================================================
# Funkcije
# ==============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

show_usage() {
    cat << EOF
Uporaba: $0 [OPCIJE] [REVISION]

Rollback deployment na prejsnjo verzijo ali specificno revizijo.

OPCIJE:
    -n, --namespace     Kubernetes namespace (privzeto: ${NAMESPACE})
    -d, --deployment    Ime deployment-a (privzeto: ${DEPLOYMENT_NAME})
    -t, --timeout       Timeout v sekundah (privzeto: ${ROLLBACK_TIMEOUT})
    -l, --list          Prikazi zgodovino revizij
    -h, --help          Prikazi to pomoc

PRIMERI:
    $0                  Rollback na prejsnjo verzijo
    $0 3                Rollback na revizijo 3
    $0 -l               Prikazi zgodovino revizij
    $0 -n prod -d app   Rollback v namespace 'prod' za deployment 'app'

EOF
}

list_revisions() {
    log_info "Pridobivam zgodovino revizij za ${DEPLOYMENT_NAME}..."
    kubectl rollout history deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}
}

get_current_revision() {
    kubectl rollout history deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} | \
        tail -n 2 | head -n 1 | awk '{print $1}'
}

verify_deployment() {
    log_info "Preverjam stanje deployment-a..."
    
    local ready=$(kubectl get deployment ${DEPLOYMENT_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
    local desired=$(kubectl get deployment ${DEPLOYMENT_NAME} -n ${NAMESPACE} \
        -o jsonpath='{.spec.replicas}' 2>/dev/null || echo "0")
    
    if [[ "${ready}" == "${desired}" ]] && [[ "${ready}" != "0" ]]; then
        log_info "Deployment je zdrav: ${ready}/${desired} replik pripravljenih"
        return 0
    else
        log_error "Deployment ni zdrav: ${ready}/${desired} replik pripravljenih"
        return 1
    fi
}

perform_rollback() {
    local target_revision="${1:-}"
    local current_revision=$(get_current_revision)
    
    log_info "Trenutna revizija: ${current_revision}"
    
    if [[ -n "${target_revision}" ]]; then
        log_info "Izvajam rollback na revizijo ${target_revision}..."
        kubectl rollout undo deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} \
            --to-revision=${target_revision}
    else
        log_info "Izvajam rollback na prejsnjo verzijo..."
        kubectl rollout undo deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE}
    fi
    
    log_info "Cakam na zakljucek rollback-a (timeout: ${ROLLBACK_TIMEOUT}s)..."
    if kubectl rollout status deployment/${DEPLOYMENT_NAME} -n ${NAMESPACE} \
        --timeout=${ROLLBACK_TIMEOUT}s; then
        log_info "Rollback uspesno zakljucen!"
    else
        log_error "Rollback ni uspel v predvidenem casu!"
        return 1
    fi
}

# ==============================================================================
# Parsanje argumentov
# ==============================================================================

LIST_ONLY=false
TARGET_REVISION=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -n|--namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        -d|--deployment)
            DEPLOYMENT_NAME="$2"
            shift 2
            ;;
        -t|--timeout)
            ROLLBACK_TIMEOUT="$2"
            shift 2
            ;;
        -l|--list)
            LIST_ONLY=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            TARGET_REVISION="$1"
            shift
            ;;
    esac
done

# ==============================================================================
# Glavna logika
# ==============================================================================

log_info "=== Rollback skripta za ${PROJECT_NAME} ==="
log_info "Namespace: ${NAMESPACE}"
log_info "Deployment: ${DEPLOYMENT_NAME}"

# Preveri ali kubectl obstaja
if ! command -v kubectl &> /dev/null; then
    log_error "kubectl ni nameščen!"
    exit 1
fi

# Preveri povezavo s klastrom
if ! kubectl cluster-info &> /dev/null; then
    log_error "Ni mogoče povezati s Kubernetes klastrom!"
    exit 1
fi

# Preveri ali deployment obstaja
if ! kubectl get deployment ${DEPLOYMENT_NAME} -n ${NAMESPACE} &> /dev/null; then
    log_error "Deployment ${DEPLOYMENT_NAME} ne obstaja v namespace ${NAMESPACE}!"
    exit 1
fi

if [[ "${LIST_ONLY}" == "true" ]]; then
    list_revisions
    exit 0
fi

# Izvedi rollback
perform_rollback "${TARGET_REVISION}"

# Verifikacija
log_info "Izvajam verifikacijo..."
sleep 10
if verify_deployment; then
    log_info "=== Rollback uspesno zakljucen ==="
    exit 0
else
    log_error "=== Verifikacija ni uspela ==="
    exit 1
fi
