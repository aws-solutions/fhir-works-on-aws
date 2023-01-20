const fs = require('fs');
const child_process = require('child_process');
const { exit } = require('process');

const args = process.argv.slice(2)[0];
let verbose = false;
const execSync = child_process.execSync;
const rootdir = execSync('git rev-parse --show-toplevel', { encoding: 'utf-8' }).trimEnd();
let retCode = 0;

if (args === '-h') {
  usage();
  exit(0);
}

if (args === '-v') {
  verbose = true;
}

/**
 * Print usage
 */
function usage() {
  console.log(
    `This script installs the git-hooks from ${rootdir}/common/git-hooks folder to ${rootdir}/.git/hooks folder\n`
  );
  console.log('   -h  print help screen');
  console.log('   -v  verbose mode');
}

/**
 * Update File permissions
 *
 * @param mode
 * @param file
 * @param dst
 */
function permissions(mode, file, dst) {
  try {
    const fd = fs.openSync(dst, 'r');
    fs.fchmodSync(fd, mode);
    if (verbose) {
      console.log(`permissions updated for ${file}`);
    }
  } catch (error) {
    console.log(error);
    retCode = 1;
  }
}

const srcDir = `${rootdir}/common/git-hooks`;
const dstDir = `${rootdir}/.git/hooks`;
const files = fs.readdirSync(srcDir);

/**
 * Create dstDir if it doesnot exist
 * @param destination Directory
 */
if (!fs.existsSync(dstDir)) {
  fs.mkdirSync(dstDir);
}

function installGitHooks() {
  console.log('Installing git-hooks...');
  files.forEach((file) => {
    const src = `${srcDir}/${file}`;
    const dst = `${dstDir}/${file}`;

    // Create dst file if it doesnot exist
    if (!fs.existsSync(dst)) {
      try {
        fs.appendFileSync(dst, '', {
          encoding: 'utf8',
          flag: 'w'
        });
      } catch (err) {
        console.log(err);
        retCode = 1;
      }
    }

    // update write permissions for dst file
    permissions(0o700, file, dst);

    // Copy files from src -> dst
    try {
      fs.copyFileSync(src, dst);
    } catch (err) {
      console.log(err);
      retCode = 1;
    }
    if (verbose) {
      console.log(`${file} copy successful !`);
    }

    // revoke write permissions for dst file
    permissions(0o500, file, dst);
  });
}

installGitHooks();
if (retCode === 0) {
  console.log('git-hooks installed successfully!');
} else {
  console.log('!!!! Something went wrong...please check with the repo maintainers !!!!');
}
