#!/bin/bash
# ==============================================================================
# Restore skripta za NexGen
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
RESTORE_DIR="${RESTORE_DIR:-.}"

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
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

show_usage() {
    cat << EOF
Uporaba: $0 [OPCIJE] <BACKUP_FILE>

Obnovi podatke iz backupa za ${PROJECT_NAME}.

OPCIJE:
    -d, --dir           Direktorij za obnovo (privzeto: ${RESTORE_DIR})
    -b, --backup-dir    Direktorij z backupi (privzeto: ${BACKUP_DIR})
    -l, --list          Prikazi razpolozljive backupe
    -v, --verify        Samo preveri backup (ne obnovi)
    -f, --force         Prisili obnovo brez potrditve
    -h, --help          Prikazi to pomoc

PRIMERI:
    $0 backup_20240115.tar.gz       Obnovi iz specificnega backupa
    $0 -l                           Prikazi razpolozljive backupe
    $0 -v backup.tar.gz             Preveri integriteto backupa
    $0 -f backup.tar.gz             Obnovi brez potrditve

EOF
}

list_backups() {
    log_info "Razpolozljivi backupi v ${BACKUP_DIR}:"
    echo ""
    
    if [[ -d "${BACKUP_DIR}" ]]; then
        ls -lht "${BACKUP_DIR}"/${PROJECT_NAME}_backup_*.tar.gz 2>/dev/null || echo "Ni backupov"
    else
        echo "Backup direktorij ne obstaja"
    fi
}

verify_backup() {
    local backup_file="$1"
    
    log_info "Preverjam integriteto backupa: ${backup_file}"
    
    # Preveri ali datoteka obstaja
    if [[ ! -f "${backup_file}" ]]; then
        log_error "Backup datoteka ne obstaja: ${backup_file}"
        return 1
    fi
    
    # Preveri checksum ce obstaja
    if [[ -f "${backup_file}.sha256" ]]; then
        log_info "Preverjam SHA256 checksum..."
        if sha256sum -c "${backup_file}.sha256" &>/dev/null; then
            log_info "Checksum ustreza!"
        else
            log_error "Checksum ne ustreza!"
            return 1
        fi
    else
        log_warn "Checksum datoteka ne obstaja, preskakujem preverjanje"
    fi
    
    # Preveri ali je veljaven tar arhiv
    log_info "Preverjam tar arhiv..."
    if tar -tzf "${backup_file}" &>/dev/null; then
        log_info "Tar arhiv je veljaven"
        
        # Prikazi vsebino
        log_info "Vsebina backupa:"
        tar -tzf "${backup_file}" | head -20
        echo "..."
        
        local file_count=$(tar -tzf "${backup_file}" | wc -l)
        log_info "Skupno stevilo datotek: ${file_count}"
    else
        log_error "Tar arhiv ni veljaven!"
        return 1
    fi
    
    return 0
}

restore_backup() {
    local backup_file="$1"
    local force="${2:-false}"
    
    log_info "Pripravljam obnovo iz: ${backup_file}"
    
    # Preveri backup
    if ! verify_backup "${backup_file}"; then
        log_error "Verifikacija backupa ni uspela!"
        return 1
    fi
    
    # Potrditev
    if [[ "${force}" != "true" ]]; then
        echo ""
        log_warn "OPOZORILO: Ta operacija bo prepisala obstoječe datoteke!"
        read -p "Ali zelite nadaljevati? (da/ne): " confirm
        
        if [[ "${confirm}" != "da" ]]; then
            log_info "Obnova preklicana"
            return 0
        fi
    fi
    
    # Ustvari restore direktorij ce ne obstaja
    if [[ ! -d "${RESTORE_DIR}" ]]; then
        log_info "Ustvarjam restore direktorij: ${RESTORE_DIR}"
        mkdir -p "${RESTORE_DIR}"
    fi
    
    # Izvedi obnovo
    log_info "Izvajam obnovo..."
    
    cd "${RESTORE_DIR}"
    tar -xzf "${backup_file}"
    
    log_info "Obnova uspesno zakljucena!"
    
    # Prikazi obnovljene datoteke
    log_info "Obnovljene datoteke:"
    ls -la
    
    return 0
}

find_latest_backup() {
    local latest=$(ls -t "${BACKUP_DIR}"/${PROJECT_NAME}_backup_*_full.tar.gz 2>/dev/null | head -1)
    
    if [[ -n "${latest}" ]]; then
        echo "${latest}"
    else
        return 1
    fi
}

# ==============================================================================
# Parsanje argumentov
# ==============================================================================

LIST_ONLY=false
VERIFY_ONLY=false
FORCE=false
BACKUP_FILE=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--dir)
            RESTORE_DIR="$2"
            shift 2
            ;;
        -b|--backup-dir)
            BACKUP_DIR="$2"
            shift 2
            ;;
        -l|--list)
            LIST_ONLY=true
            shift
            ;;
        -v|--verify)
            VERIFY_ONLY=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            BACKUP_FILE="$1"
            shift
            ;;
    esac
done

# ==============================================================================
# Glavna logika
# ==============================================================================

log_info "=== Restore skripta za ${PROJECT_NAME} ==="

if [[ "${LIST_ONLY}" == "true" ]]; then
    list_backups
    exit 0
fi

# Doloci backup datoteko
if [[ -z "${BACKUP_FILE}" ]]; then
    log_info "Backup datoteka ni podana, ischem najnovejsi backup..."
    BACKUP_FILE=$(find_latest_backup) || {
        log_error "Ni razpolozljivih backupov!"
        exit 1
    }
    log_info "Najden najnovejsi backup: ${BACKUP_FILE}"
fi

# Preveri ali je podana relativna pot
if [[ ! -f "${BACKUP_FILE}" ]] && [[ -f "${BACKUP_DIR}/${BACKUP_FILE}" ]]; then
    BACKUP_FILE="${BACKUP_DIR}/${BACKUP_FILE}"
fi

if [[ "${VERIFY_ONLY}" == "true" ]]; then
    if verify_backup "${BACKUP_FILE}"; then
        log_info "=== Verifikacija uspesna ==="
        exit 0
    else
        log_error "=== Verifikacija ni uspela ==="
        exit 1
    fi
fi

if restore_backup "${BACKUP_FILE}" "${FORCE}"; then
    log_info "=== Restore uspesno zakljucen ==="
    exit 0
else
    log_error "=== Restore ni uspel ==="
    exit 1
fi
