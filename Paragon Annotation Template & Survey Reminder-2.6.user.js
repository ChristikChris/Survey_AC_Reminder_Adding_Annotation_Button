
// ==UserScript==
// @name         Paragon Annotation Template & Survey Reminder
// @namespace    http://tampermonkey.net/
// @version      2.6
// @description  Adds annotation template button, survey reminder, and Pull AC button
// @author       christik@ & Sandhya Tammireddy
// @match        https://paragon*.amazon.com/*
// @match        https://*.paragon*.amazon.com/*
// @match        https://paragon-eu.amazon.com/*
// @match        https://dirc5mvg14a3m.cloudfront.net/*
// @match        https://*.cloudfront.net/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-end
// ==/UserScript==

(function() {
    'use strict';

    console.log('=== Paragon Merged Script v2.6 loaded ===');
    console.log('Current URL:', window.location.href);

    // ========== ANNOTATION TEMPLATE SECTION ==========
    const annotationTemplate = `Batch ID:

Seller intent:

Seller provided identifiers or documents:

Skill:

Research done:

    Change Integration Management (CIM) announcement:
    Paragon workflow (PWF):
    Help page link:
    SOP link:
    Tool link:
    Ticket or SIM reference:

Question to advisor:

Case status:`;

    function addTemplateButton() {
        if (document.getElementById('annotation-template-btn')) {
            return true;
        }

        const textarea = document.querySelector('kat-textarea[data-testid="kat-textarea-resolution"]');
        if (!textarea) {
            console.log('Template button: Textarea not found');
            return false;
        }

        console.log('Template button: Found textarea');

        let buttonContainer = null;
        const actionContainers = document.querySelectorAll('[class*="action"]');
        for (const container of actionContainers) {
            const dropdown = container.querySelector('kat-dropdown-button');
            const button = container.querySelector('kat-button');
            if (dropdown && button) {
                buttonContainer = container;
                console.log('Template button: Found button container via action class');
                break;
            }
        }

        if (!buttonContainer) {
            let currentElement = textarea;
            for (let i = 0; i < 15; i++) {
                currentElement = currentElement.parentElement;
                if (!currentElement) break;

                const allDivs = currentElement.querySelectorAll('div');
                for (const div of allDivs) {
                    const hasDropdown = div.querySelector(':scope > kat-dropdown-button');
                    const hasButton = div.querySelector(':scope > kat-button');
                    if (hasDropdown && hasButton) {
                        buttonContainer = div;
                        console.log('Template button: Found button container via traversal');
                        break;
                    }
                }
                if (buttonContainer) break;
            }
        }

        if (!buttonContainer) {
            console.log('Template button: Button container not found');
            return false;
        }

        console.log('Template button: All elements found, adding button');

        const templateButton = document.createElement('button');
        templateButton.id = 'annotation-template-btn';
        templateButton.textContent = 'AC Template';
        templateButton.type = 'button';
        templateButton.style.cssText = `
            padding: 8px 16px;
            margin-left: 4px;
            background-color: #5c6f82;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            font-family: "Amazon Ember", Arial, sans-serif;
            height: 32px;
            display: inline-flex;
            align-items: center;
            vertical-align: middle;
        `;

        templateButton.addEventListener('mouseenter', () => {
            templateButton.style.backgroundColor = '#6b7f94';
        });
        templateButton.addEventListener('mouseleave', () => {
            templateButton.style.backgroundColor = '#5c6f82';
        });

        templateButton.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Template button clicked');

            const shadowRoot = textarea.shadowRoot;
            if (shadowRoot) {
                const actualTextarea = shadowRoot.querySelector('textarea');
                if (actualTextarea) {
                    actualTextarea.value = annotationTemplate;
                    actualTextarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                    actualTextarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
                    actualTextarea.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, composed: true }));
                    actualTextarea.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, composed: true }));

                    textarea.value = annotationTemplate;
                    textarea.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
                    textarea.dispatchEvent(new Event('change', { bubbles: true, composed: true }));

                    actualTextarea.focus();
                    console.log('Template inserted successfully');
                } else {
                    console.error('Could not find textarea inside shadow root');
                }
            } else {
                console.error('Could not access shadow root');
            }
        });

        buttonContainer.appendChild(templateButton);
        console.log('=== Template button added successfully ===');

        return true;
    }

    const templateObserver = new MutationObserver((mutations) => {
        if (!document.getElementById('annotation-template-btn')) {
            addTemplateButton();
        }
    });

    templateObserver.observe(document.body, {
        childList: true,
        subtree: true
    });

    setTimeout(() => addTemplateButton(), 1000);
    setTimeout(() => addTemplateButton(), 2000);
    setTimeout(() => addTemplateButton(), 3000);
    setTimeout(() => addTemplateButton(), 5000);
    setTimeout(() => addTemplateButton(), 7000);

    console.log('Template button: Initialization complete');

    // ========== SURVEY REMINDER SECTION ==========
    let notificationActive = false;
    let autoCloseTimer = null;
    let widgetCheckTimer = null;
    let buttonWasClicked = false;
    const TWO_HOURS = 2 * 60 * 60 * 1000;

    const style = document.createElement('style');
    style.textContent = `
        @keyframes buttonPulseGlow {
            0%, 100% {
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            50% {
                box-shadow: 0 2px 8px rgba(0,123,255,0.3);
            }
        }
        @keyframes fadeInText {
            0% {
                opacity: 0;
                transform: translateX(-10px);
            }
            100% {
                opacity: 1;
                transform: translateX(0);
            }
        }
        .survey-button-pending {
            animation: buttonPulseGlow 2s ease-in-out infinite;
        }
        .check-icon {
            display: inline-block;
            animation: fadeInText 0.3s ease-out forwards;
        }
        .completed-text {
            display: inline-block;
            animation: fadeInText 0.5s ease-out 0.2s forwards;
            opacity: 0;
        }
        .pull-ac-button {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 16px 32px;
            background-color: #fff3cd;
            color: #333333;
            border: 1px solid #ffc107;
            border-radius: 4px;
            cursor: pointer;
            font-size: 15px;
            font-weight: 500;
            font-family: "Amazon Ember", Arial, sans-serif;
            box-shadow: 0 2px 8px rgba(0,0,0,0.15);
            z-index: 10000;
            transition: all 0.2s ease;
            max-width: 650px;
            text-align: center;
            line-height: 1.5;
        }
        .pull-ac-button:hover {
            background-color: #ffe69c;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .pull-ac-button-urgent {
            background-color: #f8d7da;
            border-color: #dc3545;
            color: #721c24;
            font-weight: 600;
        }
        .pull-ac-button-urgent:hover {
            background-color: #f5c6cb;
        }
    `;
    document.head.appendChild(style);

    function findAndonIframe() {
        const iframes = document.querySelectorAll('iframe');
        for (let iframe of iframes) {
            const src = iframe.src || '';
            if (src.includes('andon-cord.selling-partner-support.amazon.dev')) {
                return iframe;
            }
        }
        return null;
    }

    function createNotification() {
        if (!buttonWasClicked) return;
        if (document.getElementById('andon-survey-reminder')) return;

        const notification = document.createElement('div');
        notification.id = 'andon-survey-reminder';
        notification.innerHTML = `
            <div style="padding: 12px 20px; display: flex; align-items: center; gap: 16px;">
                <div style="flex: 1;">
                    <div style="font-size: 14px; font-weight: 600; color: #1a1a1a;">
                        Andon Survey Reminder
                    </div>
                    <div style="font-size: 13px; line-height: 1.4; color: #333333; margin-top: 2px;">
                        Please complete the andon survey to share your experience.
                    </div>
                </div>
                <button id="survey-completed-btn" class="survey-button-pending" style="
                    background-color: #007bff;
                    color: #FFFFFF;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    font-family: 'Amazon Ember', Arial, sans-serif;
                    white-space: nowrap;
                    flex-shrink: 0;
                    transition: background-color 0.2s;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                ">Confirm Completion</button>
            </div>
        `;

        // Use fixed positioning at the top of the viewport
        Object.assign(notification.style, {
            position: 'fixed',
            top: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '90%',
            maxWidth: '1200px',
            backgroundColor: '#fff3cd',
            color: '#000000',
            padding: '0',
            borderRadius: '4px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            zIndex: '10001',
            fontFamily: '"Amazon Ember", Arial, sans-serif',
            border: '1px solid #ffc107',
            boxSizing: 'border-box'
        });

        document.body.appendChild(notification);
        notificationActive = true;

        const button = document.getElementById('survey-completed-btn');
        if (button) {
            button.addEventListener('mouseenter', function() {
                if (this.style.backgroundColor === 'rgb(0, 123, 255)') {
                    this.style.backgroundColor = '#0056b3';
                }
            });
            button.addEventListener('mouseleave', function() {
                if (this.style.backgroundColor === 'rgb(0, 86, 179)') {
                    this.style.backgroundColor = '#007bff';
                }
            });
            button.addEventListener('click', function() {
                this.className = '';
                this.style.backgroundColor = '#28a745';
                this.style.cursor = 'default';
                this.disabled = true;

                this.innerHTML = '<span class="check-icon">✓</span> <span class="completed-text">Thank you</span>';

                GM_setValue('andon_survey_acknowledged', true);

                setTimeout(function() {
                    removeNotification();
                }, 2000);
            });
        }

        autoCloseTimer = setTimeout(function() {
            removeNotification();
        }, TWO_HOURS);
    }

    function removeNotification() {
        const notification = document.getElementById('andon-survey-reminder');
        if (notification) {
            notification.remove();
        }

        if (autoCloseTimer) {
            clearTimeout(autoCloseTimer);
            autoCloseTimer = null;
        }
        if (widgetCheckTimer) {
            clearInterval(widgetCheckTimer);
            widgetCheckTimer = null;
        }

        notificationActive = false;
        buttonWasClicked = false;
    }

    function isAndonIframeVisible() {
        const iframe = findAndonIframe();
        if (!iframe) return false;

        const rect = iframe.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && iframe.offsetParent !== null;
    }

    function monitorIframeClosure() {
        setTimeout(function() {
            widgetCheckTimer = setInterval(function() {
                if (notificationActive && !isAndonIframeVisible()) {
                    removeNotification();
                }
            }, 5000);
        }, 15000);
    }

    function attachButtonListener() {
        document.addEventListener('click', function(event) {
            const target = event.target;

            const buttonText = target.textContent || target.innerText || '';
            if (buttonText.includes('Pull Andon Cord')) {
                buttonWasClicked = true;

                setTimeout(function() {
                    createNotification();
                    monitorIframeClosure();
                }, 3000);
                return;
            }

            let parent = target.parentElement;
            for (let i = 0; i < 3; i++) {
                if (parent) {
                    const parentText = parent.textContent || parent.innerText || '';
                    if (parentText.includes('Pull Andon Cord') &&
                        (parent.tagName === 'BUTTON' || parent.getAttribute('role') === 'button')) {
                        buttonWasClicked = true;

                        setTimeout(function() {
                            createNotification();
                            monitorIframeClosure();
                        }, 3000);
                        return;
                    }
                    parent = parent.parentElement;
                }
            }
        }, true);
    }

    // ========== PULL AC BUTTON SECTION ==========
    let pullAcButton = null;
    let pullAcTimer = null;
    let pullAcReappearTimer = null;
    let pullAcClickCount = 0;

    function createPullAcButton() {
        if (pullAcButton && document.body.contains(pullAcButton)) {
            return;
        }

        pullAcButton = document.createElement('button');
        pullAcButton.id = 'pull-ac-button';
        pullAcButton.className = 'pull-ac-button';

        // Change text based on click count
        if (pullAcClickCount >= 2) {
            pullAcButton.textContent = 'Please pull an andon cord now';
            pullAcButton.classList.add('pull-ac-button-urgent');
        } else {
            pullAcButton.textContent = 'If you do not know how to proceed, please consider pulling an andon cord. We are here to help you.';
        }

        pullAcButton.addEventListener('click', function() {
            pullAcClickCount++;
            console.log('Pull AC button clicked. Click count:', pullAcClickCount);

            pullAcButton.remove();

            // Reappear after 10 seconds
            pullAcReappearTimer = setTimeout(function() {
                createPullAcButton();
            }, 10000);
        });

        document.body.appendChild(pullAcButton);
        console.log('Pull AC button created with click count:', pullAcClickCount);
    }

    function initPullAcButton() {
        // Show button after 15 seconds
        pullAcTimer = setTimeout(function() {
            createPullAcButton();
        }, 15000);
    }

    // ========== INITIALIZATION ==========
    function init() {
        setTimeout(function() {
            attachButtonListener();
            initPullAcButton();
        }, 1000);
    }

    let currentUrl = window.location.href;
    if (currentUrl.includes('view-case')) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
        } else {
            init();
        }
    }

    console.log('=== Merged script initialization complete ===');
})();

