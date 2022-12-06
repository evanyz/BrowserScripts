// ==UserScript==
// @name         adAutoSkipper-youtube.com
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  skip ads automatically when skip button available for youtube.com
// @author       Evan
// @match        http://www.youtube.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(async function () {
  'use strict';
  const LOOP_INTERVAL = 100 // ms
  const SKIP_BTN_CLASS = 'ytp-ad-skip-button'

  // Your code here...
  const detectAndSkip = () => {
    const targets = document.getElementsByClassName(SKIP_BTN_CLASS)
    if (targets) {
      for (let i = 0; i < targets.length; i++) {
        const target = targets[i]
        target.click()
      }
    }
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  while (true) {
    detectAndSkip()
    await sleep(LOOP_INTERVAL)
  }
})();
