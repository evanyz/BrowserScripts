// ==UserScript==
// @name         adRemover-yinghuadm
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  remove ads from yinghuadm
// @author       You
// @match        http://www.yinghuacd.com/*
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        none
// ==/UserScript==

(async function() {
  'use strict';
  const LOOP_INTERVAL = 100 // ms
  const MAX_TRY = 50
  const ids = ['HMcoupletDivright', 'HMcoupletDivleft', 'HMRichBox']

  // Your code here...
  const removeAd = () => {
      let success = true
      ids.forEach(id => {
          const target = document.getElementById(id)
          if (target) {
              target.remove()
          } else {
              success = false
          }
      })
      console.log("removeAd success!");
      return success;
  }

  function sleep(ms) {
      return new Promise(resolve => setTimeout(resolve, ms));
  }

  let success = false
  let tryCount = MAX_TRY
  while (!success && MAX_TRY > 0) {
      success = removeAd()
      await sleep(LOOP_INTERVAL)
      tryCount--
  }
})();
