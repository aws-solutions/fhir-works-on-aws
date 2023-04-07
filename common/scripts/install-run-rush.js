// THIS FILE WAS GENERATED BY A TOOL. ANY MANUAL MODIFICATIONS WILL GET OVERWRITTEN WHENEVER RUSH IS UPGRADED.
//
// This script is intended for usage in an automated build environment where the Rush command may not have
// been preinstalled, or may have an unpredictable version.  This script will automatically install the version of Rush
// specified in the rush.json configuration file (if not already installed), and then pass a command-line to it.
// An example usage would be:
//
//    node common/scripts/install-run-rush.js install
//
// For more information, see: https://rushjs.io/pages/maintainer/setup_new_repo/

/******/ (() => {
  // webpackBootstrap
  /******/ 'use strict';
  /******/ var __webpack_modules__ = {
    /***/ 657147:
      /*!*********************!*\
  !*** external "fs" ***!
  \*********************/
      /***/ (module) => {
        module.exports = require('fs');

        /***/
      },

    /***/ 371017:
      /*!***********************!*\
  !*** external "path" ***!
  \***********************/
      /***/ (module) => {
        module.exports = require('path');

        /***/
      }

    /******/
  };
  /************************************************************************/
  /******/ // The module cache
  /******/ var __webpack_module_cache__ = {};
  /******/
  /******/ // The require function
  /******/ function __webpack_require__(moduleId) {
    /******/ // Check if module is in cache
    /******/ var cachedModule = __webpack_module_cache__[moduleId];
    /******/ if (cachedModule !== undefined) {
      /******/ return cachedModule.exports;
      /******/
    }
    /******/ // Create a new module (and put it into the cache)
    /******/ var module = (__webpack_module_cache__[moduleId] = {
      /******/ // no module.id needed
      /******/ // no module.loaded needed
      /******/ exports: {}
      /******/
    });
    /******/
    /******/ // Execute the module function
    /******/ __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
    /******/
    /******/ // Return the exports of the module
    /******/ return module.exports;
    /******/
  }
  /******/
  /************************************************************************/
  /******/ /* webpack/runtime/compat get default export */
  /******/ (() => {
    /******/ // getDefaultExport function for compatibility with non-harmony modules
    /******/ __webpack_require__.n = (module) => {
      /******/ var getter =
        module && module.__esModule ? /******/ () => module['default'] : /******/ () => module;
      /******/ __webpack_require__.d(getter, { a: getter });
      /******/ return getter;
      /******/
    };
    /******/
  })();
  /******/
  /******/ /* webpack/runtime/define property getters */
  /******/ (() => {
    /******/ // define getter functions for harmony exports
    /******/ __webpack_require__.d = (exports, definition) => {
      /******/ for (var key in definition) {
        /******/ if (__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
          /******/ Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
          /******/
        }
        /******/
      }
      /******/
    };
    /******/
  })();
  /******/
  /******/ /* webpack/runtime/hasOwnProperty shorthand */
  /******/ (() => {
    /******/ __webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);
    /******/
  })();
  /******/
  /******/ /* webpack/runtime/make namespace object */
  /******/ (() => {
    /******/ // define __esModule on exports
    /******/ __webpack_require__.r = (exports) => {
      /******/ if (typeof Symbol !== 'undefined' && Symbol.toStringTag) {
        /******/ Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
        /******/
      }
      /******/ Object.defineProperty(exports, '__esModule', { value: true });
      /******/
    };
    /******/
  })();
  /******/
  /************************************************************************/
  var __webpack_exports__ = {};
  // This entry need to be wrapped in an IIFE because it need to be isolated against other modules in the chunk.
  (() => {
    /*!************************************************!*\
  !*** ./lib-esnext/scripts/install-run-rush.js ***!
  \************************************************/
    __webpack_require__.r(__webpack_exports__);
    /* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! path */ 371017);
    /* harmony import */ var path__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/ __webpack_require__.n(
      path__WEBPACK_IMPORTED_MODULE_0__
    );
    /* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! fs */ 657147);
    /* harmony import */ var fs__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/ __webpack_require__.n(
      fs__WEBPACK_IMPORTED_MODULE_1__
    );
    // Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
    // See the @microsoft/rush package's LICENSE file for license information.

    const {
      installAndRun,
      findRushJsonFolder,
      RUSH_JSON_FILENAME,
      runWithErrorAndStatusCode
    } = require('./install-run');
    const PACKAGE_NAME = '@microsoft/rush';
    const RUSH_PREVIEW_VERSION = 'RUSH_PREVIEW_VERSION';
    const INSTALL_RUN_RUSH_LOCKFILE_PATH_VARIABLE = 'INSTALL_RUN_RUSH_LOCKFILE_PATH';
    function _getRushVersion(logger) {
      const rushPreviewVersion = process.env[RUSH_PREVIEW_VERSION];
      if (rushPreviewVersion !== undefined) {
        logger.info(
          `Using Rush version from environment variable ${RUSH_PREVIEW_VERSION}=${rushPreviewVersion}`
        );
        return rushPreviewVersion;
      }
      const rushJsonFolder = findRushJsonFolder();
      const rushJsonPath = path__WEBPACK_IMPORTED_MODULE_0__.join(rushJsonFolder, RUSH_JSON_FILENAME);
      try {
        const rushJsonContents = fs__WEBPACK_IMPORTED_MODULE_1__.readFileSync(rushJsonPath, 'utf-8');
        // Use a regular expression to parse out the rushVersion value because rush.json supports comments,
        // but JSON.parse does not and we don't want to pull in more dependencies than we need to in this script.
        const rushJsonMatches = rushJsonContents.match(/\"rushVersion\"\s*\:\s*\"([0-9a-zA-Z.+\-]+)\"/);
        return rushJsonMatches[1];
      } catch (e) {
        throw new Error(
          `Unable to determine the required version of Rush from rush.json (${rushJsonFolder}). ` +
            "The 'rushVersion' field is either not assigned in rush.json or was specified " +
            'using an unexpected syntax.'
        );
      }
    }
    function _getBin(scriptName) {
      switch (scriptName.toLowerCase()) {
        case 'install-run-rush-pnpm.js':
          return 'rush-pnpm';
        case 'install-run-rushx.js':
          return 'rushx';
        default:
          return 'rush';
      }
    }
    function _run() {
      const [
        nodePath /* Ex: /bin/node */,
        scriptPath /* /repo/common/scripts/install-run-rush.js */,
        ...packageBinArgs /* [build, --to, myproject] */
      ] = process.argv;
      // Detect if this script was directly invoked, or if the install-run-rushx script was invokved to select the
      // appropriate binary inside the rush package to run
      const scriptName = path__WEBPACK_IMPORTED_MODULE_0__.basename(scriptPath);
      const bin = _getBin(scriptName);
      if (!nodePath || !scriptPath) {
        throw new Error('Unexpected exception: could not detect node path or script path');
      }
      let commandFound = false;
      let logger = { info: console.log, error: console.error };
      for (const arg of packageBinArgs) {
        if (arg === '-q' || arg === '--quiet') {
          // The -q/--quiet flag is supported by both `rush` and `rushx`, and will suppress
          // any normal informational/diagnostic information printed during startup.
          //
          // To maintain the same user experience, the install-run* scripts pass along this
          // flag but also use it to suppress any diagnostic information normally printed
          // to stdout.
          logger = {
            info: () => {},
            error: console.error
          };
        } else if (!arg.startsWith('-') || arg === '-h' || arg === '--help') {
          // We either found something that looks like a command (i.e. - doesn't start with a "-"),
          // or we found the -h/--help flag, which can be run without a command
          commandFound = true;
        }
      }
      if (!commandFound) {
        console.log(`Usage: ${scriptName} <command> [args...]`);
        if (scriptName === 'install-run-rush-pnpm.js') {
          console.log(`Example: ${scriptName} pnpm-command`);
        } else if (scriptName === 'install-run-rush.js') {
          console.log(`Example: ${scriptName} build --to myproject`);
        } else {
          console.log(`Example: ${scriptName} custom-command`);
        }
        process.exit(1);
      }
      runWithErrorAndStatusCode(logger, () => {
        const version = _getRushVersion(logger);
        logger.info(`The rush.json configuration requests Rush version ${version}`);
        const lockFilePath = process.env[INSTALL_RUN_RUSH_LOCKFILE_PATH_VARIABLE];
        if (lockFilePath) {
          logger.info(
            `Found ${INSTALL_RUN_RUSH_LOCKFILE_PATH_VARIABLE}="${lockFilePath}", installing with lockfile.`
          );
        }
        return installAndRun(logger, PACKAGE_NAME, version, bin, packageBinArgs, lockFilePath);
      });
    }
    _run();
    //# sourceMappingURL=install-run-rush.js.map
  })();

  module.exports = __webpack_exports__;
  /******/
})();
//# sourceMappingURL=install-run-rush.js.map
