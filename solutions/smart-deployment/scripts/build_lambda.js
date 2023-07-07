const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');

// expected usage: `node build_lambda.js <path> <path> <pathToFile> <fileName>`
// for use with NodeJsFunction command hooks to add files to Lambda functions,
// so <path> <path> will usually be the inputDir and outputDir variables, respectively
const inputDir = process.argv[2];
const outputDir = process.argv[3];
const fileToMove = process.argv[4];
const isDirectory = process.argv.length > 5 ? true : false;

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  fs.mkdirSync(dirname, { recursive: true });
}

if (isDirectory) {
  fse.copySync(inputDir, outputDir);
} else {
  ensureDirectoryExistence(`${outputDir}/${fileToMove}`);
  fs.copyFileSync(`${inputDir}/${fileToMove}`, `${outputDir}/${fileToMove}`);
}
