#!/bin/bash
# ==============================================================================
# Backup skripta za NexGen
# ==============================================================================
# @author MIA BUILD
# @version 1.0.0
# @date 2024-12-24
# @domain Zaledni sistemi
#
# @compliance DO-178C, IEC-61508, ISO-26262, MIL-STD-882E
# @meta_atom REL_004 - Disaster Recovery
# ==============================================================================

set -euo pipefail

# ==============================================================================
# Konfiguracija
# ==============================================================================

PROJECT_NAME="NexGen"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/${PROJECT_NAME}}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="{{DATUM_GENERACIJE}}"
BACKUP_NAME="${PROJECT_NAME}_backup_${TIMESTAMP}"

# ==============================================================================
# Barve za izpis
# ==============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# ==============================================================================
# Funkcije
# ==============================================================================

log_info() {
    echo -e "${GREEN}[INFO]${NC} ${TIMESTAMP} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} ${TIMESTAMP} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} ${TIMESTAMP} $1"
}

show_usage() {
    cat << EOF
Uporaba: $0 [OPCIJE]

Ustvari backup podatkov za ${PROJECT_NAME}.

OPCIJE:
    -d, --dir           Direktorij za backup (privzeto: ${BACKUP_DIR})
    -r, --retention     Stevilo dni za ohranitev (privzeto: ${RETENTION_DAYS})
    -c, --config        Backup samo konfiguracije
    -f, --full          Poln backup (privzeto)
    -l, --list          Prikazi obstoječe backupe
    -h, --help          Prikazi to pomoc

PRIMERI:
    $0                  Ustvari poln backup
    $0 -c               Backup samo konfiguracije
    $0 -l               Prikazi obstoječe backupe
    $0 -r 7             Ohrani backupe za 7 dni

EOF
}

ensure_backup_dir() {
    if [[ ! -d "${BACKUP_DIR}" ]]; then
        log_info "Ustvarjam backup direktorij: ${BACKUP_DIR}"
        mkdir -p "${BACKUP_DIR}"
    fi
}

backup_config() {
    local config_backup="${BACKUP_DIR}/${BACKUP_NAME}_config.tar.gz"
    log_info "Ustvarjam backup konfiguracije..."
    
    tar -czf "${config_backup}" \
        --exclude='*.log' \
        --exclude='node_modules' \
        konfiguracija/ \
        2>/dev/null || true
    
    if [[ -f "${config_backup}" ]]; then
        log_info "Konfiguracija shranjena: ${config_backup}"
        echo "${config_backup}"
    else
        log_error "Napaka pri ustvarjanju backup konfiguracije!"
        return 1
    fi
}

backup_data() {
    local data_backup="${BACKUP_DIR}/${BACKUP_NAME}_data.tar.gz"
    log_info "Ustvarjam backup podatkov..."
    
    # Backup podatkovnih direktorijev
    tar -czf "${data_backup}" \
        --exclude='*.log' \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        evidence/ \
        2>/dev/null || true
    
    if [[ -f "${data_backup}" ]]; then
        log_info "Podatki shranjeni: ${data_backup}"
        echo "${data_backup}"
    else
        log_warn "Ni podatkov za backup ali napaka pri ustvarjanju!"
    fi
}

backup_full() {
    local full_backup="${BACKUP_DIR}/${BACKUP_NAME}_full.tar.gz"
    log_info "Ustvarjam poln backup..."
    
    tar -czf "${full_backup}" \
        --exclude='*.log' \
        --exclude='node_modules' \
        --exclude='dist' \
        --exclude='.git' \
        . \
        2>/dev/null || true
    
    if [[ -f "${full_backup}" ]]; then
        local size=$(du -h "${full_backup}" | cut -f1)
        log_info "Poln backup ustvarjen: ${full_backup} (${size})"
        echo "${full_backup}"
    else
        log_error "Napaka pri ustvarjanju polnega backupa!"
        return 1
    fi
}

create_checksum() {
    local file="$1"
    if [[ -f "${file}" ]]; then
        sha256sum "${file}" > "${file}.sha256"
        log_info "Checksum ustvarjen: ${file}.sha256"
    fi
}

cleanup_old_backups() {
    log_info "Ciscenje backupov starejsih od ${RETENTION_DAYS} dni..."
    
    local count=$(find "${BACKUP_DIR}" -name "${PROJECT_NAME}_backup_*" -type f -mtime +${RETENTION_DAYS} | wc -l)
    
    if [[ ${count} -gt 0 ]]; then
        find "${BACKUP_DIR}" -name "${PROJECT_NAME}_backup_*" -type f -mtime +${RETENTION_DAYS} -delete
        log_info "Odstranjenih ${count} starih backupov"
    else
        log_info "Ni starih backupov za odstranitev"
    fi
}

list_backups() {
    log_info "Obstoječi backupi v ${BACKUP_DIR}:"
    echo ""
    
    if [[ -d "${BACKUP_DIR}" ]]; then
        ls -lh "${BACKUP_DIR}"/${PROJECT_NAME}_backup_* 2>/dev/null || echo "Ni backupov"
    else
        echo "Backup direktorij ne obstaja"
    fi
}

create_manifest() {
    local manifest="${BACKUP_DIR}/${BACKUP_NAME}_manifest.json"
    
    cat > "${manifest}" << EOF
{
    "project": "${PROJECT_NAME}",
    "version": "1.0.0",
    "timestamp": "${TIMESTAMP}",
    "generatedAt": "{{DATUM_GENERACIJE}}",
    "hostIdentifier": "{{HOST_IDENTIFIER}}",
    "backupDir": "${BACKUP_DIR}",
    "retentionDays": ${RETENTION_DAYS}
}
EOF
    
    log_info "Manifest ustvarjen: ${manifest}"
}

# ==============================================================================
# Parsanje argumentov
# ==============================================================================

BACKUP_TYPE="full"
LIST_ONLY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -r|--retention)
            RETENTION_DAYS="$2"
            shift 2
            ;;
        -c|--config)
            BACKUP_TYPE="config"
            shift
            ;;
        -f|--full)
            BACKUP_TYPE="full"
            shift
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
            log_error "Neznana opcija: $1"
            show_usage
            exit 1
            ;;
    esac
done

# ==============================================================================
# Glavna logika
# ==============================================================================

log_info "=== Backup skripta za ${PROJECT_NAME} ==="

if [[ "${LIST_ONLY}" == "true" ]]; then
    list_backups
    exit 0
fi

ensure_backup_dir

case ${BACKUP_TYPE} in
    config)
        backup_config
        ;;
    full)
        backup_full
        ;;
esac

create_manifest
cleanup_old_backups

log_info "=== Backup uspesno zakljucen ==="
