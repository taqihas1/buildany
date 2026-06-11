#!/usr/bin/env bash
#
# BuildAny Quality Check Script
# Usage: ./scripts/quality-check.sh [--strict|--report-only]
#
# --strict      : Exit with error code if any check fails (CI mode)
# --report-only : Always exit 0, just print report (default - allows progress)
#

set -euo pipefail

MODE="${1:-report-only}"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Results storage
declare -A RESULTS
declare -A TIMINGS
declare -A MESSAGES

TOTAL_ERRORS=0
TOTAL_WARNINGS=0
CRITICAL_ERRORS=0

SEPARATOR="━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# ───────────────────────────────────────────────────────────────────────────
# Helper functions
# ───────────────────────────────────────────────────────────────────────────

print_header() {
    echo ""
    echo -e "${BOLD}${BLUE}$SEPARATOR${NC}"
    echo -e "${BOLD}${BLUE}  🔍 BUILDANY QUALITY CHECK${NC}"
    echo -e "${BOLD}${BLUE}$SEPARATOR${NC}"
    echo -e "  ${YELLOW}Mode:${NC} $MODE"
    echo -e "  ${YELLOW}Project:${NC} $PROJECT_DIR"
    echo -e "  ${YELLOW}Time:${NC} $(date '+%Y-%m-%d %H:%M:%S')"
    echo -e "${BLUE}$SEPARATOR${NC}"
    echo ""
}

print_section() {
    echo -e "\n${BOLD}${BLUE}▶ $1${NC}"
    echo -e "${BLUE}─────────────────────────────────────────────────────────────────────────${NC}"
}

record_result() {
    local name="$1"
    local status="$2"  # PASS, FAIL, WARN, SKIP
    local time_ms="$3"
    local message="${4:-}"
    
    RESULTS["$name"]="$status"
    TIMINGS["$name"]="$time_ms"
    MESSAGES["$name"]="$message"
}

run_check() {
    local name="$1"
    local cmd="$2"
    local start_time end_time duration_ms
    
    print_section "$name"
    
    start_time=$(date +%s%N)
    
    if eval "$cmd" 2>&1; then
        end_time=$(date +%s%N)
        duration_ms=$(( (end_time - start_time) / 1000000 ))
        record_result "$name" "PASS" "$duration_ms"
        echo -e "${GREEN}✅ PASS${NC} (${duration_ms}ms)"
        return 0
    else
        end_time=$(date +%s%N)
        duration_ms=$(( (end_time - start_time) / 1000000 ))
        record_result "$name" "FAIL" "$duration_ms" "Check failed"
        echo -e "${RED}❌ FAIL${NC} (${duration_ms}ms)"
        return 1
    fi
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 1: ESLint (with error/warning count)
# ───────────────────────────────────────────────────────────────────────────

check_eslint() {
    local output exit_code
    
    print_section "1. ESLint Check"
    
    if ! command -v npx &> /dev/null; then
        record_result "ESLint" "SKIP" "0" "npx not available"
        echo -e "${YELLOW}⏭ SKIP${NC} — npx not available"
        return 0
    fi
    
    # Capture output for parsing
    set +e
    output=$(npx next lint --max-warnings=9999 2>&1)
    exit_code=$?
    set -e
    
    # Parse error/warning counts from output
    local errors=0 warnings=0
    
    if echo "$output" | grep -q "error"; then
        errors=$(echo "$output" | grep -oP '\d+(?=\s+error)' | tail -1 || echo "0")
    fi
    if echo "$output" | grep -q "warning"; then
        warnings=$(echo "$output" | grep -oP '\d+(?=\s+warning)' | tail -1 || echo "0")
    fi
    
    # Handle "No ESLint warnings" case
    if echo "$output" | grep -q "No ESLint warnings"; then
        errors=0
        warnings=0
    fi
    
    # If output contains X problems (Y errors, Z warnings)
    if [[ "$output" =~ ([0-9]+)\s+problems\s*\(([0-9]+)\s+errors,\s*([0-9]+)\s+warnings\) ]]; then
        errors="${BASH_REMATCH[2]}"
        warnings="${BASH_REMATCH[3]}"
    fi
    
    TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
    TOTAL_WARNINGS=$((TOTAL_WARNINGS + warnings))
    
    if [ "$errors" -eq 0 ] && [ "$warnings" -eq 0 ]; then
        record_result "ESLint" "PASS" "0" "Clean! No errors or warnings"
        echo -e "${GREEN}✅ PASS${NC} — No errors or warnings"
    elif [ "$errors" -eq 0 ]; then
        record_result "ESLint" "WARN" "0" "$warnings warnings"
        echo -e "${YELLOW}⚠️ WARN${NC} — $warnings warnings, 0 errors"
    else
        record_result "ESLint" "FAIL" "0" "$errors errors, $warnings warnings"
        echo -e "${RED}❌ FAIL${NC} — $errors errors, $warnings warnings"
        echo ""
        echo "$output" | tail -20
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 2: TypeScript Type Check
# ───────────────────────────────────────────────────────────────────────────

check_typescript() {
    local output exit_code errors=0
    
    print_section "2. TypeScript Type Check"
    
    set +e
    output=$(npx tsc --noEmit 2>&1)
    exit_code=$?
    set -e
    
    if [ $exit_code -eq 0 ]; then
        record_result "TypeScript" "PASS" "0" "No type errors"
        echo -e "${GREEN}✅ PASS${NC} — No type errors"
    else
        # Count error lines (lines starting with "src/" or containing "error TS")
        errors=$(echo "$output" | grep -c "error TS" || echo "0")
        TOTAL_ERRORS=$((TOTAL_ERRORS + errors))
        
        record_result "TypeScript" "FAIL" "0" "$errors type errors"
        echo -e "${RED}❌ FAIL${NC} — $errors type errors"
        echo ""
        echo "$output" | tail -30
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 3: Build Check
# ───────────────────────────────────────────────────────────────────────────

check_build() {
    local output exit_code
    
    print_section "3. Production Build"
    
    # Check if next.config has bypass flags
    if grep -q "ignoreBuildErrors.*true" next.config.ts 2>/dev/null || \
       grep -q "ignoreDuringBuilds.*true" next.config.ts 2>/dev/null; then
        echo -e "${YELLOW}⚠️  NOTE: Build bypass flags detected in next.config.ts${NC}"
        echo -e "   TypeScript errors may be ignored during build."
        echo ""
    fi
    
    set +e
    output=$(npx next build 2>&1)
    exit_code=$?
    set -e
    
    if [ $exit_code -eq 0 ]; then
        record_result "Build" "PASS" "0" "Build succeeded"
        echo -e "${GREEN}✅ PASS${NC} — Build succeeded"
    else
        record_result "Build" "FAIL" "0" "Build failed"
        echo -e "${RED}❌ FAIL${NC} — Build failed"
        echo ""
        echo "$output" | tail -30
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 4: Database Schema Check
# ───────────────────────────────────────────────────────────────────────────

check_database() {
    local output exit_code
    
    print_section "4. Database Schema"
    
    if [ ! -f "sqlite.db" ] && [ ! -f "buildany.db" ]; then
        record_result "Database" "SKIP" "0" "No local database found"
        echo -e "${YELLOW}⏭ SKIP${NC} — No local database file"
        return 0
    fi
    
    # Check if db is valid SQLite
    if command -v sqlite3 &> /dev/null; then
        set +e
        output=$(sqlite3 sqlite.db ".tables" 2>&1)
        exit_code=$?
        set -e
        
        if [ $exit_code -eq 0 ]; then
            local table_count=$(echo "$output" | wc -w)
            record_result "Database" "PASS" "0" "$table_count tables"
            echo -e "${GREEN}✅ PASS${NC} — Database OK ($table_count tables)"
        else
            record_result "Database" "FAIL" "0" "Database check failed"
            echo -e "${RED}❌ FAIL${NC} — Database check failed"
        fi
    else
        record_result "Database" "SKIP" "0" "sqlite3 not installed"
        echo -e "${YELLOW}⏭ SKIP${NC} — sqlite3 not available"
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 5: Security Audit
# ───────────────────────────────────────────────────────────────────────────

check_security() {
    local output exit_code
    
    print_section "5. Security Audit"
    
    set +e
    output=$(npm audit --audit-level=moderate 2>&1)
    exit_code=$?
    set -e
    
    if [ $exit_code -eq 0 ]; then
        record_result "Security" "PASS" "0" "No vulnerabilities"
        echo -e "${GREEN}✅ PASS${NC} — No moderate+ vulnerabilities"
    else
        # npm audit returns non-zero if vulnerabilities found
        local vuln_count=$(echo "$output" | grep -oP '\d+(?=\s+(moderate|high|critical))' | awk '{s+=$1} END {print s}' || echo "0")
        
        if [ "$vuln_count" = "0" ] || [ -z "$vuln_count" ]; then
            record_result "Security" "PASS" "0" "Audit clean"
            echo -e "${GREEN}✅ PASS${NC} — Audit clean"
        else
            record_result "Security" "WARN" "0" "$vuln_count vulnerabilities"
            echo -e "${YELLOW}⚠️ WARN${NC} — $vuln_count vulnerabilities found"
            echo ""
            echo "$output" | grep -A 5 "found.*vulnerabilities" || true
        fi
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 6: Environment Variables
# ───────────────────────────────────────────────────────────────────────────

check_env() {
    local missing=()
    
    print_section "6. Environment Variables"
    
    # Required env vars
    local required=(
        "DATABASE_URL"
        "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
        "CLERK_SECRET_KEY"
        "DEEPSEEK_API_KEY"
    )
    
    if [ ! -f ".env.local" ]; then
        record_result "Environment" "WARN" "0" ".env.local not found"
        echo -e "${YELLOW}⚠️ WARN${NC} — .env.local not found"
        return 0
    fi
    
    for var in "${required[@]}"; do
        if ! grep -q "^$var=" .env.local 2>/dev/null; then
            missing+=("$var")
        fi
    done
    
    if [ ${#missing[@]} -eq 0 ]; then
        record_result "Environment" "PASS" "0" "All required vars present"
        echo -e "${GREEN}✅ PASS${NC} — All required env vars present"
    else
        record_result "Environment" "WARN" "0" "Missing: ${missing[*]}"
        echo -e "${YELLOW}⚠️ WARN${NC} — Missing vars: ${missing[*]}"
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# CHECK 7: Critical File Checks
# ───────────────────────────────────────────────────────────────────────────

check_critical_files() {
    local missing=()
    
    print_section "7. Critical Files"
    
    local files=(
        "src/middleware.ts"
        "src/lib/db/schema.ts"
        "src/lib/orchestrator.ts"
        "src/app/layout.tsx"
        "next.config.ts"
    )
    
    for file in "${files[@]}"; do
        if [ ! -f "$file" ]; then
            missing+=("$file")
        fi
    done
    
    # Check for git conflict markers
    local conflict_files=()
    for file in "${files[@]}"; do
        if [ -f "$file" ] && grep -q "<<<<<<<" "$file" 2>/dev/null; then
            conflict_files+=("$file")
            CRITICAL_ERRORS=$((CRITICAL_ERRORS + 1))
        fi
    done
    
    if [ ${#missing[@]} -eq 0 ] && [ ${#conflict_files[@]} -eq 0 ]; then
        record_result "Critical Files" "PASS" "0" "All present, no conflicts"
        echo -e "${GREEN}✅ PASS${NC} — All critical files present, no git conflicts"
    elif [ ${#conflict_files[@]} -gt 0 ]; then
        record_result "Critical Files" "FAIL" "0" "Git conflicts: ${conflict_files[*]}"
        echo -e "${RED}❌ FAIL${NC} — Git conflict markers in: ${conflict_files[*]}"
    else
        record_result "Critical Files" "WARN" "0" "Missing: ${missing[*]}"
        echo -e "${YELLOW}⚠️ WARN${NC} — Missing files: ${missing[*]}"
    fi
    
    return 0
}

# ───────────────────────────────────────────────────────────────────────────
# SUMMARY REPORT
# ───────────────────────────────────────────────────────────────────────────

print_summary() {
    local pass_count=0 fail_count=0 warn_count=0 skip_count=0
    
    echo ""
    echo -e "${BOLD}${BLUE}$SEPARATOR${NC}"
    echo -e "${BOLD}${BLUE}  📊 QUALITY CHECK SUMMARY${NC}"
    echo -e "${BOLD}${BLUE}$SEPARATOR${NC}"
    echo ""
    
    printf "  %-20s %-10s %-10s %s\n" "CHECK" "STATUS" "TIME" "DETAILS"
    echo -e "  ${BLUE}──────────────────────────────────────────────────────────────${NC}"
    
    for name in "ESLint" "TypeScript" "Build" "Database" "Security" "Environment" "Critical Files"; do
        local status="${RESULTS[$name]:-SKIP}"
        local time_ms="${TIMINGS[$name]:-0}"
        local msg="${MESSAGES[$name]:-}"
        
        case "$status" in
            PASS)
                printf "  %-20s ${GREEN}%-10s${NC} %-10s %s\n" "$name" "✅ PASS" "${time_ms}ms" "$msg"
                pass_count=$((pass_count + 1))
                ;;
            FAIL)
                printf "  %-20s ${RED}%-10s${NC} %-10s %s\n" "$name" "❌ FAIL" "${time_ms}ms" "$msg"
                fail_count=$((fail_count + 1))
                ;;
            WARN)
                printf "  %-20s ${YELLOW}%-10s${NC} %-10s %s\n" "$name" "⚠️ WARN" "${time_ms}ms" "$msg"
                warn_count=$((warn_count + 1))
                ;;
            *)
                printf "  %-20s ${YELLOW}%-10s${NC} %-10s %s\n" "$name" "⏭ SKIP" "${time_ms}ms" "$msg"
                skip_count=$((skip_count + 1))
                ;;
        esac
    done
    
    echo ""
    echo -e "${BLUE}$SEPARATOR${NC}"
    
    # Overall score
    local total_checks=$((pass_count + fail_count + warn_count + skip_count))
    local score=0
    if [ "$total_checks" -gt 0 ]; then
        score=$(( (pass_count * 100 + warn_count * 50) / total_checks ))
    fi
    
    echo -e "  ${BOLD}Score:${NC} ${score}/100"
    echo -e "  ${BOLD}Checks:${NC} $pass_count passed, $fail_count failed, $warn_count warnings, $skip_count skipped"
    echo -e "  ${BOLD}Code Quality:${NC} $TOTAL_ERRORS errors, $TOTAL_WARNINGS warnings"
    
    if [ "$CRITICAL_ERRORS" -gt 0 ]; then
        echo -e "  ${BOLD}${RED}CRITICAL:${NC} $CRITICAL_ERRORS critical issues (git conflicts, missing files)"
    fi
    
    # Recommendation
    echo ""
    echo -e "  ${BOLD}Recommendation:${NC}"
    if [ "$fail_count" -eq 0 ] && [ "$TOTAL_ERRORS" -eq 0 ]; then
        echo -e "  ${GREEN}🚀 Quality gates passed! Safe to deploy.${NC}"
    elif [ "$CRITICAL_ERRORS" -gt 0 ]; then
        echo -e "  ${RED}🛑 STOP — Fix critical errors before deploying.${NC}"
        echo -e "     → Git conflicts must be resolved immediately"
    elif [ "$TOTAL_ERRORS" -gt 0 ]; then
        echo -e "  ${YELLOW}⚠️  CAUTION — Fix errors before pushing to production.${NC}"
        echo -e "     → Run: npx next lint --fix (auto-fixes some issues)"
        echo -e "     → Fix TypeScript errors incrementally"
        echo -e "     → Build bypass is active (errors ignored during build)"
    else
        echo -e "  ${YELLOW}⚠️  OK for staging — Fix warnings before production.${NC}"
    fi
    
    echo -e "${BLUE}$SEPARATOR${NC}"
    echo ""
    
    # Exit code
    if [ "$MODE" = "strict" ]; then
        if [ "$fail_count" -gt 0 ] || [ "$CRITICAL_ERRORS" -gt 0 ]; then
            exit 1
        fi
    fi
    
    exit 0
}

# ───────────────────────────────────────────────────────────────────────────
# MAIN
# ───────────────────────────────────────────────────────────────────────────

print_header

# Run all checks (never fail early, collect all results)
check_eslint || true
check_typescript || true
check_build || true
check_database || true
check_security || true
check_env || true
check_critical_files || true

print_summary
