#!/bin/bash
#
# This assumes all of the OS-level configuration has been completed and git repo has already been cloned
#
# This script should be run from the repo's deployment directory
# cd deployment
# ./run-unit-tests.sh
#

# Get reference for all important folders
template_dir="$PWD"
source_dir="$template_dir/../fwoa-core/interface"

echo "------------------------------------------------------------------------------"
echo "Install packages"
echo "------------------------------------------------------------------------------"
npm install -g @microsoft/rush
npm install -g pnpm
npm install -g aws-cdk@2.46.0
git submodule update --init --recursive --remote
echo "------------------------------------------------------------------------------"
echo "Install Run Unit Tests"
echo "------------------------------------------------------------------------------"
cd $source_dir
rush purge
rush update
rush build-test
echo "Test Complete"