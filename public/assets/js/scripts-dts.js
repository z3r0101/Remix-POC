/******/ (function() { // webpackBootstrap
/******/ 	var __webpack_modules__ = ([
/* 0 */,
/* 1 */
/***/ (function() {

// Password visibility toggling
const pwdFields = document.querySelectorAll("input[type='password']");

if (pwdFields.length) {
    for (let i = 0; i < pwdFields.length; i++) {
        if (pwdFields[i].nextElementSibling.matches('.dts-form-component__pwd-toggle')) {

            pwdFields[i].nextElementSibling.addEventListener("click", () => {
                
                if (pwdFields[i].type === "password") {
                    pwdFields[i].type = "text";
                    pwdFields[i].nextElementSibling.querySelector("img").src = "assets/icons/eye-hide-password.svg";
                } else {
                    pwdFields[i].type = "password";
                    pwdFields[i].nextElementSibling.querySelector("img").src = "assets/icons/eye-show-password.svg";
                }
            });
        }
    }
}

// Submit button enabling only when required fields are filled
const forms = document.querySelectorAll("form");
if (forms.length) {
    for (let k = 0; k < forms.length; k++) {
        const requiredFields = [];
        const submitButton = [];
        requiredFields[k] = forms[k].querySelectorAll("input[required]");
        submitButton[k] = forms[k].querySelector("button[type='submit']");

        if (requiredFields[k].length) {
            var requiredFilled;

            for (let i = 0; i < requiredFields[k].length; i++) {
                requiredFields[k][i].addEventListener("input", () => {
                    requiredFilled = true;
                    for (let j = 0; j < requiredFields[k].length; j++) {
                        if (!requiredFields[k][j].validity.valid) {
                            requiredFilled = false;
                        }
                    }
                    if (requiredFilled) {
                        submitButton[k].disabled = false;
                    } else {
                        submitButton[k].disabled = true;
                    }
                });
            }
        }
    }
}


// Radiobutton controlled field visibility
const visibilityTriggers = document.querySelectorAll("input[aria-controls]");
const ariaControls = ["", ""];
const controlledItems = ["", ""];

if (visibilityTriggers.length) {
    for (let i = 0; i < visibilityTriggers.length; i++) {
        ariaControls[i] = visibilityTriggers[i].getAttribute("aria-controls");
        controlledItems[i] = document.getElementById(ariaControls[i]);

        visibilityTriggers[i].addEventListener("click", () => {
            var ariaExpanded = visibilityTriggers[i].getAttribute('aria-expanded');

            if (ariaExpanded == "false") {
                controlledItems[i].style.display = "block";
                visibilityTriggers[i].setAttribute("aria-expanded", "true");
                if (i==0) {
                    controlledItems[i+1].style.display = "none";
                    visibilityTriggers[i+1].setAttribute("aria-expanded", "false");
                } else {
                    controlledItems[i-1].style.display = "none";
                    visibilityTriggers[i-1].setAttribute("aria-expanded", "false");
                }
            }
        });
    }
}

// OTP form single digit length management - NOT USED
// const otpForm = document.querySelector(".dts-dialog__form--otp");

// if (otpForm) {
//     const digitInputs = otpForm.querySelectorAll("input[type='number']");
//     for (let i = 0; i < digitInputs.length; i++) {
//         digitInputs[i].addEventListener("keydown", function (e) {
//             digitInputs[i].select();
//             if (this.value.length == 1) {
//                 return false;
//             };
//         });
//     }
// }


/***/ }),
/* 2 */
/***/ (function() {

"use strict";
/* TABS */
/*
 *   This content is licensed according to the W3C Software License at
 *   https://www.w3.org/Consortium/Legal/2015/copyright-software-and-document
 *
 *   File:   tabs-manual.js
 *
 *   Desc:   Tablist widget that implements ARIA Authoring Practices
 */



class TabsManualHorizontal {
    constructor(groupNode) {
        this.tablistNode = groupNode;

        this.tabs = [];

        this.firstTab = null;
        this.lastTab = null;

        this.tabs = Array.from(
            this.tablistNode.querySelectorAll("[role=tab]")
        );
        this.tabpanels = [];

        for (var i = 0; i < this.tabs.length; i += 1) {
            var tab = this.tabs[i];
            var tabpanel = document.getElementById(
                tab.getAttribute("aria-controls")
            );

            tab.tabIndex = -1;
            tab.setAttribute("aria-selected", "false");
            this.tabpanels.push(tabpanel);

            tab.addEventListener("keydown", this.onKeydown.bind(this));
            tab.addEventListener("click", this.onClick.bind(this));

            if (!this.firstTab) {
                this.firstTab = tab;
            }
            this.lastTab = tab;
        }

        this.setSelectedTab(this.firstTab);
    }

    setSelectedTab(currentTab) {
        for (var i = 0; i < this.tabs.length; i += 1) {
            var tab = this.tabs[i];
            if (currentTab === tab) {
                tab.setAttribute("aria-selected", "true");
                tab.removeAttribute("tabindex");
                this.tabpanels[i].classList.remove("hidden");
            } else {
                tab.setAttribute("aria-selected", "false");
                tab.tabIndex = -1;
                this.tabpanels[i].classList.add("hidden");
            }
        }
    }

    moveFocusToTab(currentTab) {
        currentTab.focus();
    }

    moveFocusToPreviousTab(currentTab) {
        var index;

        if (currentTab === this.firstTab) {
            this.moveFocusToTab(this.lastTab);
        } else {
            index = this.tabs.indexOf(currentTab);
            this.moveFocusToTab(this.tabs[index - 1]);
        }
    }

    moveFocusToNextTab(currentTab) {
        var index;

        if (currentTab === this.lastTab) {
            this.moveFocusToTab(this.firstTab);
        } else {
            index = this.tabs.indexOf(currentTab);
            this.moveFocusToTab(this.tabs[index + 1]);
        }
    }

    /* EVENT HANDLERS */

    onKeydown(event) {
        var tgt = event.currentTarget,
            flag = false;

        switch (event.key) {
            case "ArrowLeft":
                this.moveFocusToPreviousTab(tgt);
                flag = true;
                break;

            case "ArrowUp":
                this.moveFocusToPreviousTab(tgt);
                flag = true;
                break;

            case "ArrowRight":
                this.moveFocusToNextTab(tgt);
                flag = true;
                break;

            case "ArrowDown":
                this.moveFocusToNextTab(tgt);
                flag = true;
                break;

            case "Home":
                this.moveFocusToTab(this.firstTab);
                flag = true;
                break;

            case "End":
                this.moveFocusToTab(this.lastTab);
                flag = true;
                break;

            default:
                break;
        }

        if (flag) {
            event.stopPropagation();
            event.preventDefault();
        }
    }

    // Since this example uses buttons for the tabs, the click onr also is activated
    // with the space and enter keys
    onClick(event) {
        this.setSelectedTab(event.currentTarget);
    }
}

// Initialize tablist
window.addEventListener("load", function () {
    var tablistsHorizontal = document.querySelectorAll(
        "[role=tablist]"
    );
    for (var i = 0; i < tablistsHorizontal.length; i++) {
        new TabsManualHorizontal(tablistsHorizontal[i]);
    }
});


/***/ })
/******/ 	]);
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	!function() {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = function(module) {
/******/ 			var getter = module && module.__esModule ?
/******/ 				function() { return module['default']; } :
/******/ 				function() { return module; };
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	!function() {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = function(exports, definition) {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	!function() {
/******/ 		__webpack_require__.o = function(obj, prop) { return Object.prototype.hasOwnProperty.call(obj, prop); }
/******/ 	}();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	!function() {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = function(exports) {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	}();
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
// This entry need to be wrapped in an IIFE because it need to be in strict mode.
!function() {
"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony import */ var _form_js__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(1);
/* harmony import */ var _form_js__WEBPACK_IMPORTED_MODULE_0___default = /*#__PURE__*/__webpack_require__.n(_form_js__WEBPACK_IMPORTED_MODULE_0__);
/* harmony import */ var _tablist_js__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(2);
/* harmony import */ var _tablist_js__WEBPACK_IMPORTED_MODULE_1___default = /*#__PURE__*/__webpack_require__.n(_tablist_js__WEBPACK_IMPORTED_MODULE_1__);



// import "./modal.js";
// import "./tooltips.js";

}();
/******/ })()
;