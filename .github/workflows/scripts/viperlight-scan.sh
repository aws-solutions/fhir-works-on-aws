#!/usr/bin/env bash

set -euo pipefail

function installViperlight() {
    echo "======================================================================"
    echo "Downloading viperlight"
    (wget -v "https://s3.amazonaws.com/viperlight-scanner/latest/.viperlightrc" &&
    cd .tools && wget -v "https://s3.amazonaws.com/viperlight-scanner/latest/viperlight.zip" &&
    unzip -q viperlight.zip -d ./viperlight &&
    rm -r ./viperlight.zip
    echo "Content scanning utility installation complete `date`"
    )
}

function deleteViperlightDir() {
    echo "Deleting .tools/viperlight directory"
    if [[ -d .tools/viperlight ]]; then
        rm -rf .tools/viperlight && echo ".tools/viperlight deleted !" || (echo "ERROR: .tools/viperlight directory not deleted, please delete it manually or retry" && exit 1)
    fi
    echo "Deleting .viperlightrc file"
    if [[ -f .viperlightrc ]]; then
        rm .viperlightrc && echo ".viperlightrc deleted !" || (echo "ERROR: .viperlightrc file not deleted, please delete it manually or retry" && exit 1)
    fi
}

trap ctrl_c INT

function ctrl_c() {
    echo "Ctrl + C happened !"
    deleteViperlightDir
}

mkdir -p .tools && {
    if [[ ! -d tools/viperlight ]] ; then
        (
            installViperlight
        )
    else
        (
            echo "Content scanning utility already installed, Auto cleanup and re-install"
            deleteViperlightDir && installViperlight
        )
    fi
}

echo "Starting content scanning `date` in `pwd`"
.tools/viperlight/bin/viperlight scan -m files-contents -m files-aws -m files-binary -m files-entropy -m files-secrets && (echo "Completed content scanning `date`" && deleteViperlightDir) || (echo "Viperlight scanning failed" && deleteViperlightDir && exit 1)