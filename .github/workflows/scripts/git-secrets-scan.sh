#!/usr/bin/env bash

# set -euo pipefail
return_code=0

echo 'Cloning git-secrets scan in ./.tools'
mkdir -p ./.tools && {
    if [[ ! -d ./.tools/git-secrets ]] ; then
        echo "======================================================================"
        echo "Downloading git-secrets"
        git clone https://github.com/awslabs/git-secrets.git ./.tools/git-secrets && sleep 2
    fi
}

export GIT_SECRETS_DIR=./.tools/git-secrets
export PATH=$PATH:${GIT_SECRETS_DIR}

${GIT_SECRETS_DIR}/git-secrets --register-aws --global
# Prevent leakage of internal tools
${GIT_SECRETS_DIR}/git-secrets  --add '[aA]pollo|[bB]razil|[cC]oral|[oO]din' --global
${GIT_SECRETS_DIR}/git-secrets  --add 'tt\.amazon\.com|issues\.amazon\.com|cr\.amazon\.com' --global
# Prevent leakage of aws-iso
${GIT_SECRETS_DIR}/git-secrets  --add 'ic\.gov|sgov\.gov' --global
${GIT_SECRETS_DIR}/git-secrets  --add 'us-iso|aws-iso' --global
${GIT_SECRETS_DIR}/git-secrets  --add 'smil\.mil' --global

# Run git-secrets only on staged files
${GIT_SECRETS_DIR}/git-secrets --scan
return_code=$?
echo "RETURN_CODE = $return_code"

if [ -d .tools/git-secrets ]; then
    rm -rf .tools && echo ".tools/git-secrets deleted !"
fi

if [[ $return_code -ne 0 ]]; then
    echo "git secrets scan detected secrets"
    exit 1
else
    echo "git secrets scan ok !"
fi