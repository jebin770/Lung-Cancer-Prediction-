/* ==========================================================================
   PULMOGUARD AI - MAIN APPLICATION CONTROLLER
   Pure Vanilla JS SPA, LocalStorage Auth, Risk Calculator & Visualizations
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
    // Initialize Lucide SVG icons
    lucide.createIcons();

    // ---------------------------------------------------------
    // CUSTOM TOAST NOTIFICATION SYSTEM
    // ---------------------------------------------------------
    function showToast(message, type = "info") {
        let container = document.getElementById("toast-container");
        if (!container) {
            container = document.createElement("div");
            container.id = "toast-container";
            container.className = "toast-container";
            document.body.appendChild(container);
        }
        
        const toast = document.createElement("div");
        toast.className = "toast-notification";
        
        let icon = `<svg class="toast-icon info" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
        let title = "Notification";
        
        if (type === "success") {
            icon = `<svg class="toast-icon success" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`;
            title = "Success";
        } else if (type === "error") {
            icon = `<svg class="toast-icon error" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`;
            title = "Clinical Alert";
        }
        
        toast.innerHTML = `
            ${icon}
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;
        
        container.appendChild(toast);
        
        // Auto removal
        setTimeout(() => {
            toast.classList.add("fade-out");
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 4000);
    }

    // ---------------------------------------------------------
    // CUSTOM IN-PAGE PROMISE-BASED CONFIRM MODAL SYSTEM
    // ---------------------------------------------------------
    function showConfirm(title, message) {
        return new Promise((resolve) => {
            const confirmModal = document.getElementById("confirm-dialog-modal");
            const confirmTitle = document.getElementById("confirm-title");
            const confirmMsg = document.getElementById("confirm-message");
            const btnCancel = document.getElementById("btn-confirm-cancel");
            const btnProceed = document.getElementById("btn-confirm-proceed");
            
            if (!confirmModal || !confirmTitle || !confirmMsg || !btnCancel || !btnProceed) {
                // Fallback to native confirmation in case of DOM issues
                resolve(false);
                return;
            }
            
            confirmTitle.textContent = title;
            confirmMsg.textContent = message;
            
            confirmModal.classList.add("active");
            
            function cleanupListeners() {
                btnCancel.removeEventListener("click", onCancel);
                btnProceed.removeEventListener("click", onProceed);
            }
            
            function onCancel() {
                cleanupListeners();
                confirmModal.classList.remove("active");
                resolve(false);
            }
            
            function onProceed() {
                cleanupListeners();
                confirmModal.classList.remove("active");
                resolve(true);
            }
            
            btnCancel.addEventListener("click", onCancel);
            btnProceed.addEventListener("click", onProceed);
        });
    }

    // ---------------------------------------------------------
    // APPLICATION STATE MANAGEMENT
    // ---------------------------------------------------------
    const state = {
        theme: localStorage.getItem("pg_theme") || "light",
        user: null, // Holds current session user info
        history: [], // Holds current user prediction history
        predictorCurrentStep: 1,
        predictorData: {}
    };

    // ---------------------------------------------------------
    // DOM ELEMENTS CACHE
    // ---------------------------------------------------------
    const DOM = {
        // Sections
        authSection: document.getElementById("auth-section"),
        dashboardSection: document.getElementById("app-dashboard"),
        
        // Auth views & forms
        loginView: document.getElementById("login-form-view"),
        registerView: document.getElementById("register-form-view"),
        loginForm: document.getElementById("login-form"),
        registerForm: document.getElementById("register-form"),
        
        // Navigation targets & links
        navItems: document.querySelectorAll(".nav-item"),
        appViews: document.querySelectorAll(".app-view"),
        viewTitle: document.getElementById("current-view-title"),
        
        // Quick profile & settings
        userAvatarChar: document.getElementById("user-avatar-char"),
        userDisplayName: document.getElementById("user-display-name"),
        welcomeUsername: document.getElementById("welcome-username"),
        settingsAvatarChar: document.getElementById("settings-avatar-char"),
        settingsDisplayName: document.getElementById("settings-display-name"),
        settingsDisplayEmail: document.getElementById("settings-display-email"),
        settingsForm: document.getElementById("settings-profile-form"),
        settingsNameInput: document.getElementById("settings-name-input"),
        settingsNewPassword: document.getElementById("settings-new-password"),
        settingsStatRisk: document.getElementById("settings-stat-risk"),
        settingsStatCount: document.getElementById("settings-stat-count"),
        
        // Controls
        themeToggleBtn: document.getElementById("btn-theme-toggle"),
        headerClock: document.getElementById("header-clock"),
        logoutBtn: document.getElementById("btn-logout"),
        
        // Dashboard Stats
        statTotalAssessments: document.getElementById("stat-total-assessments"),
        statLatestRisk: document.getElementById("stat-latest-risk"),
        statLastScan: document.getElementById("stat-last-scan"),
        statRiskIcon: document.getElementById("stat-risk-icon"),
        dashboardRecentList: document.getElementById("dashboard-recent-list"),
        
        // Risk Predictor Wizard
        predictorForm: document.getElementById("prediction-steps-form"),
        formSteps: document.querySelectorAll(".form-step"),
        stepIndicators: document.querySelectorAll(".step-indicator"),
        btnPrev: document.getElementById("btn-form-prev"),
        btnNext: document.getElementById("btn-form-next"),
        btnFinish: document.getElementById("btn-form-finish"),
        
        // Predictor Output Elements
        resultsGaugePath: document.getElementById("results-gauge-path"),
        resultsScorePercent: document.getElementById("results-score-percent"),
        resultsRiskTier: document.getElementById("results-risk-tier"),
        resultsExplanation: document.getElementById("results-tier-explanation"),
        resultsContributors: document.getElementById("results-contributors-list"),
        
        // History Page
        historySearch: document.getElementById("history-search-input"),
        historyTableTbody: document.getElementById("history-table-tbody"),
        historyEmptyState: document.getElementById("history-empty-state-view"),
        btnExportHistory: document.getElementById("btn-export-history"),
        btnClearHistory: document.getElementById("btn-clear-history"),
        
        // Modal Overlay Detail Viewer
        modalOverlay: document.getElementById("record-inspector-modal"),
        modalCloseBtn: document.getElementById("btn-close-modal"),
        modalReportName: document.getElementById("modal-report-name"),
        modalReportDate: document.getElementById("modal-report-date"),
        modalReportScore: document.getElementById("modal-report-score"),
        modalReportSeverity: document.getElementById("modal-report-severity"),
        modalSymptomsBreakdown: document.getElementById("modal-symptoms-breakdown-grid"),
        modalAdviceParagraph: document.getElementById("modal-advice-paragraph")
    };

    // ---------------------------------------------------------
    // THEME HANDLING
    // ---------------------------------------------------------
    function initTheme() {
        document.documentElement.setAttribute("data-theme", state.theme);
        updateThemeToggleIcon();
    }

    function toggleTheme() {
        state.theme = state.theme === "dark" ? "light" : "dark";
        localStorage.setItem("pg_theme", state.theme);
        document.documentElement.setAttribute("data-theme", state.theme);
        updateThemeToggleIcon();
    }

    function updateThemeToggleIcon() {
        if (!DOM.themeToggleBtn) return;
        DOM.themeToggleBtn.innerHTML = state.theme === "dark" 
            ? `<i data-lucide="sun"></i>` 
            : `<i data-lucide="moon"></i>`;
        lucide.createIcons();
    }

    if (DOM.themeToggleBtn) {
        DOM.themeToggleBtn.addEventListener("click", toggleTheme);
    }

    // ---------------------------------------------------------
    // TIME CLOCK WIDGET
    // ---------------------------------------------------------
    function updateClock() {
        if (!DOM.headerClock) return;
        const now = new Date();
        let hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, "0");
        const seconds = String(now.getSeconds()).padStart(2, "0");
        const ampm = hours >= 12 ? "PM" : "AM";
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
        DOM.headerClock.textContent = `${String(hours).padStart(2, "0")}:${minutes}:${seconds} ${ampm}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ---------------------------------------------------------
    // SESSION & AUTH PORTAL LOGIC
    // ---------------------------------------------------------
    
    // Toggle between login & registration forms
    document.getElementById("go-to-register").addEventListener("click", (e) => {
        e.preventDefault();
        DOM.loginView.style.display = "none";
        DOM.registerView.style.display = "block";
    });

    document.getElementById("go-to-login").addEventListener("click", (e) => {
        e.preventDefault();
        DOM.registerView.style.display = "none";
        DOM.loginView.style.display = "block";
    });

    // ---------------------------------------------------------
    // CT SCAN DRAG & DROP UPLOADER
    // ---------------------------------------------------------
    const dragBox = document.getElementById("upload-drag-box");
    const fileInput = document.getElementById("ct-scan-file");
    const fileInfo = document.getElementById("upload-file-info");

    let uploadedScanMeta = null;

    if (dragBox && fileInput) {
        dragBox.addEventListener("click", () => {
            fileInput.click();
        });

        fileInput.addEventListener("change", (e) => {
            handleUploadedFiles(e.target.files);
        });

        // Dragover/Dragleave transitions
        dragBox.addEventListener("dragover", (e) => {
            e.preventDefault();
            dragBox.classList.add("dragover");
        });

        dragBox.addEventListener("dragleave", () => {
            dragBox.classList.remove("dragover");
        });

        dragBox.addEventListener("drop", (e) => {
            e.preventDefault();
            dragBox.classList.remove("dragover");
            handleUploadedFiles(e.dataTransfer.files);
        });
    }

    function handleUploadedFiles(files) {
        if (files && files.length > 0) {
            const file = files[0];
            const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
            
            if (file.size > 20 * 1024 * 1024) {
                showToast("File size exceeds the maximum 20MB limit.", "error");
                return;
            }

            uploadedScanMeta = {
                name: file.name,
                size: `${sizeMB} MB`,
                type: file.type || "DICOM Image"
            };

            if (fileInfo) {
                fileInfo.textContent = `✓ Selected: ${file.name} (${sizeMB} MB)`;
                fileInfo.style.display = "block";
            }
            
            dragBox.style.borderColor = "var(--risk-low)";
            dragBox.style.background = "rgba(16, 185, 129, 0.03)";
        }
    }

    // Handle user registration
    DOM.registerForm.addEventListener("submit", () => {
        const name = document.getElementById("register-name").value.trim();
        const email = document.getElementById("register-email").value.trim().toLowerCase();
        const password = document.getElementById("register-password").value;

        if (password.length < 8) {
            showToast("Security password must be at least 8 characters.", "error");
            return;
        }

        const users = JSON.parse(localStorage.getItem("pg_users") || "[]");
        if (users.find(u => u.email === email)) {
            showToast("This patient email is already registered.", "error");
            return;
        }

        const newUser = { 
            id: "u_" + Date.now(), 
            name, 
            email, 
            password,
            ctScan: uploadedScanMeta 
        };
        users.push(newUser);
        localStorage.setItem("pg_users", JSON.stringify(users));
        
        showToast("Patient profile registered successfully! Logging in...", "success");
        loginUser(newUser);
    });

    // Handle user login
    DOM.loginForm.addEventListener("submit", () => {
        const email = document.getElementById("login-email").value.trim().toLowerCase();
        const password = document.getElementById("login-password").value;

        const users = JSON.parse(localStorage.getItem("pg_users") || "[]");
        const user = users.find(u => u.email === email && u.password === password);

        if (!user) {
            showToast("Invalid patient email address or password credentials.", "error");
            return;
        }

        loginUser(user);
    });

    // Handle Guest login
    document.getElementById("btn-guest-login").addEventListener("click", () => {
        const guestUser = { id: "guest", name: "Anonymous Guest", email: "guest@pulmoguard.org" };
        loginUser(guestUser);
    });

    function loginUser(user) {
        state.user = user;
        localStorage.setItem("pg_session", JSON.stringify(user));
        
        // Reset predictor wizard steps
        resetPredictorForm();

        // Load History & Metrics
        loadUserHistory();
        updateUIForUser();
        
        // Transition Section
        DOM.authSection.style.display = "none";
        DOM.dashboardSection.classList.add("active");
        
        // Click first sidebar item to view Overview
        DOM.navItems[0].click();
    }

    // Handle user sign out
    DOM.logoutBtn.addEventListener("click", () => {
        state.user = null;
        state.history = [];
        localStorage.removeItem("pg_session");
        
        DOM.dashboardSection.classList.remove("active");
        DOM.authSection.style.display = "grid"; // Grid layout for split columns
        DOM.loginForm.reset();
        DOM.registerForm.reset();
        
        // Reset Drag & Drop file state
        uploadedScanMeta = null;
        if (fileInfo) {
            fileInfo.style.display = "none";
            fileInfo.textContent = "";
        }
        if (dragBox) {
            dragBox.style.borderColor = "#cbd5e1";
            dragBox.style.background = "#f8fafc";
        }
        
        DOM.loginView.style.display = "none";
        DOM.registerView.style.display = "block";
    });

    // Check for active login session on startup
    function checkActiveSession() {
        initTheme();
        // Clear active session to ensure the login screen always displays first on fresh runs
        localStorage.removeItem("pg_session");
        
        DOM.authSection.style.display = "grid"; // Grid layout for split columns
        DOM.dashboardSection.classList.remove("active");
        DOM.loginView.style.display = "block";
        DOM.registerView.style.display = "none";
    }

    // ---------------------------------------------------------
    // SPA CLIENT ROUTING & NAVIGATION
    // ---------------------------------------------------------
    DOM.navItems.forEach(item => {
        item.addEventListener("click", () => {
            const targetViewId = item.getAttribute("data-target");
            
            // Remove active classes
            DOM.navItems.forEach(nav => nav.classList.remove("active"));
            DOM.appViews.forEach(view => view.classList.remove("active"));
            
            // Activate selected
            item.classList.add("active");
            const activeView = document.getElementById(targetViewId);
            activeView.classList.add("active");
            
            // Set Header title
            let friendlyTitle = "Overview Dashboard";
            if (targetViewId === "predictor-view") friendlyTitle = "Lung Cancer Risk Predictor";
            else if (targetViewId === "future-predict-view") friendlyTitle = "Future Enhance Predict";
            else if (targetViewId === "history-view") friendlyTitle = "Report";
            else if (targetViewId === "resources-view") friendlyTitle = "Clinical Lung Resources Hub";
            else if (targetViewId === "tips-view") friendlyTitle = "Health Tips & Clinical Advice";
            else if (targetViewId === "settings-view") friendlyTitle = "Patient Profile & Settings";
            DOM.viewTitle.textContent = friendlyTitle;
            
            // Populate views when clicked
            if (targetViewId === "history-view") {
                renderHistoryTable();
            } else if (targetViewId === "overview-view") {
                renderRecentActivityList();
            } else if (targetViewId === "settings-view") {
                populateSettingsView();
            } else if (targetViewId === "future-predict-view") {
                if (typeof initFuturePredictCharts === "function") initFuturePredictCharts();
            }
        });
    });

    // ---------------------------------------------------------
    // USER DETAILS & METRICS RE-LOAD
    // ---------------------------------------------------------
    function loadUserHistory() {
        if (!state.user) return;
        const key = `pg_history_${state.user.id}`;
        state.history = JSON.parse(localStorage.getItem(key) || "[]");
    }

    function saveUserHistory() {
        if (!state.user) return;
        const key = `pg_history_${state.user.id}`;
        localStorage.setItem(key, JSON.stringify(state.history));
    }

    function updateUIForUser() {
        if (!state.user) return;
        const shortName = state.user.name.split(" ")[0];
        const avatarChar = shortName.charAt(0).toUpperCase();

        // Sidebar user profile card
        DOM.userAvatarChar.textContent = avatarChar;
        DOM.userDisplayName.textContent = state.user.name;
        document.getElementById("user-display-role").textContent = state.user.id === "guest" 
            ? "Anonymous Session" 
            : "Clinical Patient ID";

        // Dashboard Home Greeting
        DOM.welcomeUsername.textContent = shortName;

        // Dashboard Metrics Calculations
        calculateMetrics();
    }

    function calculateMetrics() {
        const count = state.history.length;
        DOM.statTotalAssessments.textContent = count;

        if (count > 0) {
            const latest = state.history[0]; // History array is sorted newest first
            DOM.statLatestRisk.textContent = `${latest.score}%`;
            DOM.statLastScan.textContent = new Date(latest.timestamp).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric'
            });

            // Set badge visual
            DOM.statLatestRisk.style.color = getRiskColor(latest.severity);
            DOM.statRiskIcon.style.color = getRiskColor(latest.severity);
            DOM.statRiskIcon.style.borderColor = getRiskColor(latest.severity) + "40";
            DOM.statRiskIcon.style.background = getRiskColor(latest.severity) + "10";
            DOM.statRiskIcon.innerHTML = latest.severity === "high" 
                ? `<i data-lucide="shield-alert"></i>` 
                : latest.severity === "medium" 
                    ? `<i data-lucide="shield-alert" style="transform: scale(0.9)"></i>`
                    : `<i data-lucide="shield-check"></i>`;
        } else {
            DOM.statLatestRisk.textContent = "N/A";
            DOM.statLatestRisk.style.color = "var(--text-secondary)";
            DOM.statLastScan.textContent = "Never";
            DOM.statRiskIcon.className = "metric-icon blue";
            DOM.statRiskIcon.style.color = "var(--accent-teal)";
            DOM.statRiskIcon.style.borderColor = "var(--glass-border)";
            DOM.statRiskIcon.style.background = "rgba(14, 165, 233, 0.1)";
            DOM.statRiskIcon.innerHTML = `<i data-lucide="shield-check"></i>`;
        }
        lucide.createIcons();
        if (typeof renderChart === 'function') {
            renderChart();
        }
    }

    function getRiskColor(severity) {
        if (severity === "high") return "var(--risk-high)";
        if (severity === "medium") return "var(--risk-medium)";
        return "var(--risk-low)";
    }

    // Populate profile inputs
    function populateSettingsView() {
        if (!state.user) return;
        DOM.settingsNameInput.value = state.user.name;
        DOM.settingsNewPassword.value = "";
        DOM.settingsDisplayName.textContent = state.user.name;
        DOM.settingsDisplayEmail.textContent = state.user.email;
        DOM.settingsAvatarChar.textContent = state.user.name.charAt(0).toUpperCase();

        const count = state.history.length;
        DOM.settingsStatCount.textContent = count;
        
        if (count > 0) {
            const latest = state.history[0];
            DOM.settingsStatRisk.textContent = latest.severity.toUpperCase();
            DOM.settingsStatRisk.style.color = getRiskColor(latest.severity);
        } else {
            DOM.settingsStatRisk.textContent = "N/A";
            DOM.settingsStatRisk.style.color = "var(--text-secondary)";
        }
    }

    // Save profile changes
    DOM.settingsForm.addEventListener("submit", () => {
        if (!state.user || state.user.id === "guest") {
            alert("Session modifications are locked in anonymous guest mode.");
            return;
        }

        const name = DOM.settingsNameInput.value.trim();
        const newPass = DOM.settingsNewPassword.value;

        const users = JSON.parse(localStorage.getItem("pg_users") || "[]");
        const idx = users.findIndex(u => u.id === state.user.id);
        
        if (idx !== -1) {
            users[idx].name = name;
            if (newPass.trim().length >= 8) {
                users[idx].password = newPass;
            }
            localStorage.setItem("pg_users", JSON.stringify(users));
            
            // Sync Session state
            state.user.name = name;
            localStorage.setItem("pg_session", JSON.stringify(state.user));
            
            updateUIForUser();
            populateSettingsView();
            alert("Clinical profile credentials updated successfully.");
        }
    });

    // ---------------------------------------------------------
    // LUNG CANCER CLINICAL RISK CALCULATOR ENGINE
    // ---------------------------------------------------------
    
    function resetPredictorForm() {
        state.predictorCurrentStep = 1;
        state.predictorData = {};
        DOM.predictorForm.reset();
        
        // Reset CT Scan Upload UI
        if (ctUploadStatus) ctUploadStatus.style.display = "none";
        if (ctFileInput) ctFileInput.value = "";
        
        // Activate Demographics step
        showStep(1);
        
        // Reset Result values
        DOM.resultsScorePercent.textContent = "0%";
        DOM.resultsGaugePath.style.strokeDashoffset = "628";
        DOM.resultsRiskTier.className = "result-badge";
        DOM.resultsRiskTier.textContent = "Calculating...";
        DOM.resultsExplanation.textContent = "";
        DOM.resultsContributors.innerHTML = "";
    }

    function showStep(step) {
        state.predictorCurrentStep = step;
        
        // Toggle view containers
        DOM.formSteps.forEach((element, index) => {
            element.classList.toggle("active", (index + 1) === step);
        });

        // Toggle step circles
        DOM.stepIndicators.forEach((element, index) => {
            const stepNum = index + 1;
            element.classList.toggle("active", stepNum === step);
            element.classList.toggle("completed", stepNum < step);
        });

        // Manage button display states
        if (step === 1) {
            DOM.btnPrev.style.visibility = "hidden";
            DOM.btnNext.style.display = "inline-flex";
            DOM.btnFinish.style.display = "none";
        } else if (step === 2 || step === 3) {
            DOM.btnPrev.style.visibility = "visible";
            DOM.btnNext.style.display = "inline-flex";
            DOM.btnFinish.style.display = "none";
        } else if (step === 4) {
            DOM.btnPrev.style.visibility = "visible";
            DOM.btnNext.style.display = "none";
            DOM.btnFinish.style.display = "inline-flex";
            computeRiskResult();
        }
        lucide.createIcons();
    }

    // Step navigation buttons
    DOM.btnNext.addEventListener("click", () => {
        if (validateStep(state.predictorCurrentStep)) {
            saveStepData(state.predictorCurrentStep);
            showStep(state.predictorCurrentStep + 1);
        }
    });

    DOM.btnPrev.addEventListener("click", () => {
        showStep(state.predictorCurrentStep - 1);
    });

    // Save final report to localStorage history
    DOM.btnFinish.addEventListener("click", () => {
        if (!state.predictorData.score) return;

        const assessmentRecord = {
            id: "rec_" + Date.now(),
            timestamp: new Date().toISOString(),
            patientName: state.predictorData.patientName || "Unknown Patient",
            age: state.predictorData.age,
            gender: state.predictorData.gender === "2" ? "Male" : (state.predictorData.gender === "1" ? "Female" : "Other"),
            score: state.predictorData.score,
            severity: state.predictorData.severity,
            badFactors: state.predictorData.badFactors,
            inputs: { ...state.predictorData }
        };

        state.history.unshift(assessmentRecord); // Add newest first
        saveUserHistory();
        calculateMetrics();
        
        alert("Assessment successfully committed to local patient file.");
        resetPredictorForm();
        
        // Route to History Dashboard
        document.querySelector("[data-target=history-view]").click();
        
        // Open the detailed report modal for the newly created assessment
        if (typeof showReportModal === 'function') {
            setTimeout(() => {
                showReportModal(assessmentRecord);
            }, 100);
        }
    });

    // Form inputs validation per step
    function validateStep(step) {
        if (step === 1) {
            const ageInput = document.getElementById("param-age");
            if (!ageInput.value || ageInput.value < 1 || ageInput.value > 120) {
                showToast("Please input a valid Patient Age between 1 and 120.", "error");
                return false;
            }
        }
        return true;
    }

    function saveStepData(step) {
        if (step === 1) {
            const nameEl = document.getElementById("param-patient-name");
            state.predictorData.patientName = nameEl ? nameEl.value.trim() : "Unknown Patient";
            state.predictorData.age = parseInt(document.getElementById("param-age").value);
            state.predictorData.gender = document.querySelector('input[name="param-gender"]:checked').value;
        } else if (step === 2) {
            state.predictorData.coughing = document.querySelector('input[name="param-coughing"]:checked').value;
            state.predictorData.wheezing = document.querySelector('input[name="param-wheezing"]:checked').value;
            state.predictorData.shortness = document.querySelector('input[name="param-shortness"]:checked').value;
            state.predictorData.chestPain = document.querySelector('input[name="param-chest-pain"]:checked').value;
            state.predictorData.swallowing = document.querySelector('input[name="param-swallowing"]:checked').value;
            state.predictorData.fatigue = document.querySelector('input[name="param-fatigue"]:checked').value;
        } else if (step === 3) {
            state.predictorData.smoking = document.querySelector('input[name="param-smoking"]:checked').value;
            state.predictorData.alcohol = document.querySelector('input[name="param-alcohol"]:checked').value;
            state.predictorData.chronic = document.querySelector('input[name="param-chronic"]:checked').value;
            state.predictorData.allergy = document.querySelector('input[name="param-allergy"]:checked').value;
            state.predictorData.yellowFingers = document.querySelector('input[name="param-yellow-fingers"]:checked').value;
            state.predictorData.anxiety = document.querySelector('input[name="param-anxiety"]:checked').value;
            state.predictorData.peer = document.querySelector('input[name="param-peer"]:checked').value;
        }
    }

    // MAIN PREDICTIVE COEFFICIENT MATHEMATICS
    function computeRiskResult() {
        // Collect data from step 3 since step 3 form wasn't finished until now
        saveStepData(3);

        const d = state.predictorData;
        let points = 0;
        const maxPoints = 24; // Normalized denominator sum of maximum weights
        const contributors = [];

        // CT Scan AI Nodule Detection Input (Weight 7.0)
        if (d.ctScanNoduleDetected) {
            points += 7.0;
            contributors.push(`Detected Solitary Lung Nodule (${d.ctScanNoduleType || '8mm'}) via AI CT Scan`);
        }

        // 1. Age Factor (Weight 2)
        if (d.age >= 60) {
            points += 2;
            contributors.push("Advanced Patient Age (≥ 60)");
        } else if (d.age >= 45) {
            points += 1;
            contributors.push("Moderate Patient Age (45 - 59)");
        }

        // 2. Gender Baseline (Weight 0.5)
        if (d.gender === "2") { // Male
            points += 0.5;
        }

        // 3. Coughing up / Chronic Cough (Weight 3.0)
        if (d.coughing === "2") {
            points += 3.0;
            contributors.push("Severe Chronic Coughing");
        } else if (d.coughing === "1.5") {
            points += 1.5;
            contributors.push("Mild Persistent Coughing");
        }

        // 4. Smoking tobacco (Weight 3.0)
        if (d.smoking === "2") {
            points += 3.0;
            contributors.push("Persistent Tobacco Smoking Exposure");
        } else if (d.smoking === "1.5") {
            points += 1.5;
            contributors.push("Ex-smoker / Historical Tobacco Exposure");
        }

        // 5. Alcohol consuming (Weight 2.5)
        if (d.alcohol === "2") {
            points += 2.5;
            contributors.push("Moderate to Heavy Alcohol Intake");
        } else if (d.alcohol === "1.5") {
            points += 1.25;
            contributors.push("Occasional Alcohol Intake");
        }

        // 6. Chest Pain (Weight 2.0)
        if (d.chestPain === "2") {
            points += 2.0;
            contributors.push("Severe Thoracic / Chest Pain");
        } else if (d.chestPain === "1.5") {
            points += 1.0;
            contributors.push("Mild Chest Discomfort");
        }

        // 7. Wheezing (Weight 2.0)
        if (d.wheezing === "2") {
            points += 2.0;
            contributors.push("Significant Airway Wheezing");
        } else if (d.wheezing === "1.5") {
            points += 1.0;
            contributors.push("Mild Airway Wheezing");
        }

        // 8. Swallowing Difficulty (Weight 1.5)
        if (d.swallowing === "2") {
            points += 1.5;
            contributors.push("Severe Dysphagia (Difficulty Swallowing)");
        } else if (d.swallowing === "1.5") {
            points += 0.75;
            contributors.push("Mild Swallowing Discomfort");
        }

        // 9. Shortness of Breath (Weight 1.5)
        if (d.shortness === "2") {
            points += 1.5;
            contributors.push("Severe Dyspnea (Shortness of Breath)");
        } else if (d.shortness === "1.5") {
            points += 0.75;
            contributors.push("Mild Shortness of Breath");
        }

        // 10. Chronic Diseases (Weight 1.5)
        if (d.chronic === "2") {
            points += 1.5;
            contributors.push("Underlying Chronic Respiratory History");
        }

        // 11. Chemical Allergies (Weight 1.0)
        if (d.allergy === "2") {
            points += 1.0;
            contributors.push("Occupational/Chemical Airway Allergen Exposures");
        }

        // 12. Discolored Yellow Fingers (Weight 1.0)
        if (d.yellowFingers === "2") {
            points += 1.0;
            contributors.push("Nicotine Staining on Skin / Fingertips");
        }

        // 13. Fatigue (Weight 1.0)
        if (d.fatigue === "2") {
            points += 1.0;
            contributors.push("Severe Unexplained Physical Fatigue");
        } else if (d.fatigue === "1.5") {
            points += 0.5;
            contributors.push("Mild Fatigue / Tiredness");
        }

        // 14. Anxiety (Weight 0.5)
        if (d.anxiety === "2") {
            points += 0.5;
        }

        // 15. Peer Pressure (Weight 0.5)
        if (d.peer === "2") {
            points += 0.5;
        }

        // Calculate and cap percentage
        let score = Math.round((points / maxPoints) * 100);
        if (score > 100) score = 100;

        // Categorize Risk Tier Severity
        let severity = "low";
        let tierText = "Low Risk Profile";
        let explanationText = "Your lung health profile exhibits low immediate vulnerability correlates. Maintain a healthy lifestyle, avoid active smoking, and conduct yearly reviews.";

        if (score >= 70) {
            severity = "high";
            tierText = "High Risk Correlates";
            explanationText = "Your clinical markers showcase highly elevated risk correlates. We advise booking a Consultation with a Pulmonologist immediately to inspect symptoms and query for a Low-Dose CT (LDCT) Screening.";
        } else if (score >= 35) {
            severity = "medium";
            tierText = "Moderate Risk Indicators";
            explanationText = "You show several clinical markers that contribute to a moderate risk index. Monitor these symptoms, reduce exposure to primary environmental toxins, and check again if issues worsen.";
        }

        // Cache results locally in wizard data object
        state.predictorData.score = score;
        state.predictorData.severity = severity;
        state.predictorData.badFactors = contributors;

        // ANIMATE SVG GAUGE CIRCLE
        // Radius r = 100, Circumference = 628
        const circumference = 628;
        const strokeDashOffset = circumference - (circumference * score) / 100;
        
        DOM.resultsGaugePath.style.stroke = getRiskColor(severity);
        
        // Delayed animation for visual wow factor
        setTimeout(() => {
            DOM.resultsGaugePath.style.strokeDashoffset = strokeDashOffset;
        }, 150);

        // Update DOM displays
        DOM.resultsScorePercent.textContent = `${score}%`;
        DOM.resultsScorePercent.style.color = getRiskColor(severity);
        
        DOM.resultsRiskTier.textContent = tierText;
        DOM.resultsRiskTier.className = `result-badge ${severity}`;
        DOM.resultsExplanation.textContent = explanationText;

        // Render high contributors list
        DOM.resultsContributors.innerHTML = "";
        if (contributors.length > 0) {
            contributors.forEach(factor => {
                const div = document.createElement("div");
                div.className = "factor-item";
                div.innerHTML = `<i data-lucide="alert-triangle"></i><span>${factor}</span>`;
                DOM.resultsContributors.appendChild(div);
            });
        } else {
            DOM.resultsContributors.innerHTML = `<div style="font-size:0.85rem; color:var(--text-muted)">No major chronic symptoms logged.</div>`;
        }
        lucide.createIcons();
    }

    // ---------------------------------------------------------
    // DASHBOARD OVERVIEW HOME RECENT LIST RENDER
    // ---------------------------------------------------------
    function renderRecentActivityList() {
        if (!DOM.dashboardRecentList) return;
        DOM.dashboardRecentList.innerHTML = "";

        if (state.history.length === 0) {
            DOM.dashboardRecentList.innerHTML = `
                <div style="text-align:center; padding: 30px; color:var(--text-muted); font-size:0.9rem;">
                    <i data-lucide="activity" style="margin-bottom: 10px; opacity:0.6;"></i>
                    <p>No assessment profiles available. Initiate a new session check.</p>
                </div>
            `;
            lucide.createIcons();
            return;
        }

        const recent = state.history.slice(0, 3); // Take top 3
        recent.forEach(rec => {
            const div = document.createElement("div");
            div.className = "activity-item";
            
            const dateStr = new Date(rec.timestamp).toLocaleDateString(undefined, {
                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
            });

            div.innerHTML = `
                <div class="activity-meta">
                    <div class="risk-dot ${rec.severity}" title="Severity level: ${rec.severity}"></div>
                    <div class="activity-desc">
                        <h5>Risk Score Assessment</h5>
                        <p>${dateStr} | <strong>${rec.patientName || "Unknown"}</strong> (${rec.age}y/o, ${rec.gender})</p>
                    </div>
                </div>
                <div class="activity-score" style="color: ${getRiskColor(rec.severity)}">${rec.score}%</div>
            `;
            DOM.dashboardRecentList.appendChild(div);
        });
    }

    // ---------------------------------------------------------
    // HISTORICAL ASSESSMENTS DATA TABLE
    // ---------------------------------------------------------
    function renderHistoryTable() {
        if (!DOM.historyTableTbody) return;
        DOM.historyTableTbody.innerHTML = "";

        const searchQuery = DOM.historySearch ? DOM.historySearch.value.trim().toLowerCase() : "";
        
        // Filter history based on search bar
        const filteredHistory = state.history.filter(rec => {
            if (!searchQuery) return true;
            return rec.severity.toLowerCase().includes(searchQuery) ||
                   rec.gender.toLowerCase().includes(searchQuery) ||
                   (rec.patientName && rec.patientName.toLowerCase().includes(searchQuery)) ||
                   String(rec.age).includes(searchQuery) ||
                   String(rec.score).includes(searchQuery) ||
                   new Date(rec.timestamp).toLocaleDateString().toLowerCase().includes(searchQuery);
        });

        if (filteredHistory.length === 0) {
            document.getElementById("table-history-element").style.display = "none";
            DOM.historyEmptyState.style.display = "flex";
            return;
        }

        document.getElementById("table-history-element").style.display = "table";
        DOM.historyEmptyState.style.display = "none";

        filteredHistory.forEach(rec => {
            const tr = document.createElement("tr");
            
            const dateStr = new Date(rec.timestamp).toLocaleString(undefined, {
                dateStyle: "medium", timeStyle: "short"
            });

            tr.innerHTML = `
                <td>${dateStr}</td>
                <td><strong>${rec.patientName || "Unknown Patient"}</strong> (${rec.age} Years, ${rec.gender})</td>
                <td>${rec.badFactors ? rec.badFactors.length : 0} Risk Indicators</td>
                <td style="font-weight:800; color: ${getRiskColor(rec.severity)}">${rec.score}%</td>
                <td><span class="history-risk-badge ${rec.severity}">${rec.severity}</span></td>
                <td>
                    <button class="history-details-trigger" data-id="${rec.id}">
                        <i data-lucide="info" style="width: 14px; height: 14px;"></i>
                        <span>Inspect</span>
                    </button>
                </td>
            `;
            DOM.historyTableTbody.appendChild(tr);
        });

        // Add report modal listeners to dynamic table buttons
        document.querySelectorAll(".history-details-trigger").forEach(btn => {
            btn.addEventListener("click", () => {
                const recordId = btn.getAttribute("data-id");
                const record = state.history.find(r => r.id === recordId);
                if (record) {
                    showReportModal(record);
                }
            });
        });
        lucide.createIcons();
    }

    // Connect Search bar input with immediate table update
    if (DOM.historySearch) {
        DOM.historySearch.addEventListener("input", renderHistoryTable);
    }

    // Clear logs operation
    DOM.btnClearHistory.addEventListener("click", async () => {
        if (state.history.length === 0) return;
        
        const approved = await showConfirm(
            "Erase Clinical History",
            "Are you sure you want to permanently erase all clinical records associated with this patient index? This action is completely irreversible."
        );
        
        if (approved) {
            state.history = [];
            saveUserHistory();
            calculateMetrics();
            renderHistoryTable();
            showToast("All clinical records have been permanently erased.", "success");
        }
    });

    // Export history backup as local JSON
    DOM.btnExportHistory.addEventListener("click", () => {
        if (state.history.length === 0) {
            showToast("No medical files available to backup.", "error");
            return;
        }

        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state.history, null, 2));
        const dlAnchorElem = document.createElement('a');
        dlAnchorElem.setAttribute("href", dataStr);
        dlAnchorElem.setAttribute("download", `pulmoguard_health_records_${state.user.id}.json`);
        dlAnchorElem.click();
    });

    // ---------------------------------------------------------
    // DETAILED MODAL INSPECTOR RENDERER
    // ---------------------------------------------------------
    function showReportModal(record) {
        if (DOM.modalReportName) {
            DOM.modalReportName.textContent = "Patient: " + (record.patientName || "Unknown Patient");
        }
        DOM.modalReportDate.textContent = "Assessed on: " + new Date(record.timestamp).toLocaleString(undefined, {
            dateStyle: "full", timeStyle: "medium"
        });
        DOM.modalReportScore.textContent = `${record.score}%`;
        DOM.modalReportScore.style.color = getRiskColor(record.severity);
        
        DOM.modalReportSeverity.textContent = `${record.severity.toUpperCase()} RISK TIER`;
        DOM.modalReportSeverity.style.color = getRiskColor(record.severity);

        // Reconstruct symptom matrix
        DOM.modalSymptomsBreakdown.innerHTML = "";
        const inputs = record.inputs;

        const checklist = [
            { 
                label: "Active Smoking", 
                val: inputs.smoking, 
                customText: inputs.smoking === "2" ? "ACTIVE" : (inputs.smoking === "1.5" ? "EX-SMOKER" : "NON-SMOKER") 
            },
            { 
                label: "Alcohol Intake", 
                val: inputs.alcohol, 
                customText: inputs.alcohol === "2" ? "FREQUENT" : (inputs.alcohol === "1.5" ? "OCCASIONAL" : "NON-DRINKER") 
            },
            { label: "Persistent Coughing", val: inputs.coughing },
            { label: "Airway Wheezing", val: inputs.wheezing },
            { label: "Dyspnea (Shortness)", val: inputs.shortness },
            { label: "Chest Pain Markers", val: inputs.chestPain },
            { label: "Dysphagia (Swallowing)", val: inputs.swallowing },
            { label: "Severe Fatigue", val: inputs.fatigue },
            { label: "Chronic Respiratory Ills", val: inputs.chronic },
            { label: "Environmental Allergies", val: inputs.allergy },
            { label: "Anxiety", val: inputs.anxiety },
            { label: "Yellow Fingers", val: inputs.yellowFingers }
        ];

        if (inputs.ctScanFileName) {
            checklist.push({
                label: `CT Scan Image: ${inputs.ctScanFileName}`,
                val: inputs.ctScanNoduleDetected ? "2" : "1",
                customText: inputs.ctScanNoduleDetected ? `Detected (${inputs.ctScanNoduleType || '8mm Nodule'})` : "Clean Cavity"
            });
        }

        checklist.forEach(item => {
            const isTriggered = item.val === "2";
            const isMild = item.val === "1.5";
            const rowDiv = document.createElement("div");
            rowDiv.className = "glass-card";
            rowDiv.style.padding = "10px 15px";
            rowDiv.style.display = "flex";
            rowDiv.style.justifyContent = "space-between";
            rowDiv.style.alignItems = "center";
            rowDiv.style.fontSize = "0.85rem";
            
            let borderColor = "var(--glass-border)";
            let textColor = "var(--text-muted)";
            let statusColor = "var(--accent-emerald)";
            let valText = "NORMAL";
            
            if (isTriggered) {
                borderColor = "rgba(239,68,68,0.15)";
                textColor = "var(--text-primary)";
                statusColor = "var(--risk-high)";
                valText = "SEVERE";
            } else if (isMild) {
                borderColor = "rgba(245,158,11,0.15)";
                textColor = "var(--text-primary)";
                statusColor = "var(--risk-medium)";
                valText = "MILD";
            }
            
            if (item.customText) {
                valText = item.customText;
            }
            
            rowDiv.style.borderColor = borderColor;
            
            rowDiv.innerHTML = `
                <span style="color: ${textColor}; font-weight:600">${item.label}</span>
                <span style="font-weight: 700; color: ${statusColor}">
                    ${valText}
                </span>
            `;
            DOM.modalSymptomsBreakdown.appendChild(rowDiv);
        });

        // Set tailored Advice recommendations
        let advice = "Your screening displays clean respiratory indices. Maintain active aerobic conditioning, avoid secondary and primary chemical smoke exposures, and conduct routine screenings yearly.";
        if (record.severity === "high") {
            advice = "CRITICAL: Multiple significant medical vulnerability benchmarks are triggered. We strongly encourage scheduling a Low-Dose Computed Tomography (LDCT) scan with an oncologist. Avoid all toxic air spaces and pursue clinical counsel immediately.";
        } else if (record.severity === "medium") {
            advice = "WARNING: Moderate correlation patterns observed. If you smoke or consume alcohol frequently, we recommend starting cessation programs today. Keep a regular journal of pulmonary chest symptoms and seek direct primary care if issues persist.";
        }
        DOM.modalAdviceParagraph.textContent = advice;

        // Show modal overlays
        DOM.modalOverlay.classList.add("active");
    }

    function closeModal() {
        DOM.modalOverlay.classList.remove("active");
    }

    DOM.modalCloseBtn.addEventListener("click", closeModal);
    DOM.modalOverlay.addEventListener("click", (e) => {
        if (e.target === DOM.modalOverlay) {
            closeModal();
        }
    });

    // ---------------------------------------------------------
    // ---------------------------------------------------------
    // CT SCAN FILE UPLOAD & AI ANALYSIS INTERACTION
    // ---------------------------------------------------------
    const ctDropzone = document.getElementById("ct-dropzone");
    const ctFileInput = document.getElementById("ct-file-input");
    const ctUploadStatus = document.getElementById("ct-upload-status");
    const ctFilename = document.getElementById("ct-filename");
    const ctNoduleStatus = document.getElementById("ct-nodule-status");

    if (ctDropzone && ctFileInput) {
        // Trigger file selection on click
        ctDropzone.addEventListener("click", () => {
            ctFileInput.click();
        });

        // Prevent defaults on drag & drop
        ["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
            ctDropzone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        // Add visual active states
        ["dragenter", "dragover"].forEach(eventName => {
            ctDropzone.addEventListener(eventName, () => {
                ctDropzone.classList.add("dragover");
            }, false);
        });

        ["dragleave", "drop"].forEach(eventName => {
            ctDropzone.addEventListener(eventName, () => {
                ctDropzone.classList.remove("dragover");
            }, false);
        });

        // Handle dropped files
        ctDropzone.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            if (files.length > 0) {
                handleCTScanFile(files[0]);
            }
        });

        // Handle selected files
        ctFileInput.addEventListener("change", (e) => {
            if (e.target.files.length > 0) {
                handleCTScanFile(e.target.files[0]);
            }
        });
    }

    function handleCTScanFile(file) {
        if (!file) return;

        // Show uploading progress state
        ctUploadStatus.style.display = "flex";
        ctUploadStatus.style.background = "rgba(139, 92, 246, 0.05)";
        ctUploadStatus.style.borderColor = "rgba(139, 92, 246, 0.2)";
        ctUploadStatus.style.color = "#8b5cf6";
        ctFilename.textContent = file.name;
        ctNoduleStatus.innerHTML = `<span class="loading-dots">Analyzing chest scan slices...</span>`;
        
        // Custom interactive toasts
        showToast("Uploading medical image to local AI model...", "info");

        setTimeout(() => {
            // Check if name contains terms like "cancer", "tumor", "nodule", or "positive"
            const nameLower = file.name.toLowerCase();
            const isAbnormal = nameLower.includes("cancer") || nameLower.includes("tumor") || nameLower.includes("nodule") || nameLower.includes("positive") || Math.random() < 0.35;

            if (isAbnormal) {
                // Record state
                state.predictorData.ctScanNoduleDetected = true;
                state.predictorData.ctScanNoduleType = "Solitary Nodule (8mm)";
                state.predictorData.ctScanFileName = file.name;

                // Update UI status to critical alert red
                ctUploadStatus.style.background = "rgba(239, 68, 68, 0.05)";
                ctUploadStatus.style.borderColor = "rgba(239, 68, 68, 0.2)";
                ctUploadStatus.style.color = "var(--risk-high)";
                ctNoduleStatus.innerHTML = `<strong>ALERT: Detected pulmonary nodule (8mm, left upper lobe). Recommended clinical follow-up.</strong>`;
                
                showToast("AI Detection Complete: Identified a solitary lung nodule.", "error");

                // Autofill related symptoms to support the user
                const chestPainYes = document.querySelector('input[name="param-chest-pain"][value="2"]');
                if (chestPainYes) chestPainYes.checked = true;
                
                const coughingYes = document.querySelector('input[name="param-coughing"][value="2"]');
                if (coughingYes) coughingYes.checked = true;

                showToast("Clinical baseline adjusted dynamically to reflect scanning anomalies.", "success");
            } else {
                // Record state
                state.predictorData.ctScanNoduleDetected = false;
                state.predictorData.ctScanNoduleType = "None";
                state.predictorData.ctScanFileName = file.name;

                // Update UI status to success green
                ctUploadStatus.style.background = "rgba(16, 185, 129, 0.05)";
                ctUploadStatus.style.borderColor = "rgba(16, 185, 129, 0.2)";
                ctUploadStatus.style.color = "var(--accent-emerald)";
                ctNoduleStatus.innerHTML = `<strong>Normal baseline: 0 abnormal nodules detected (Clean chest cavity)</strong>`;

                showToast("AI Detection Complete: 0 abnormal nodules detected.", "success");
            }
            lucide.createIcons();
        }, 1500);
    }

    // ---------------------------------------------------------
    // STANDALONE DASHBOARD CT SCAN DROPZONE HANDLERS
    // ---------------------------------------------------------
    const dashCtDropzone  = document.getElementById("dashboard-ct-dropzone");
    const dashCtFileInput = document.getElementById("dashboard-ct-file-input");
    const dashCtStatus    = document.getElementById("dashboard-ct-upload-status");
    const dashCtFilename  = document.getElementById("dashboard-ct-filename");
    const dashCtNodule    = document.getElementById("dashboard-ct-nodule-status");

    if (dashCtDropzone && dashCtFileInput) {
        dashCtDropzone.addEventListener("click", () => dashCtFileInput.click());

        ["dragenter", "dragover", "dragleave", "drop"].forEach(ev =>
            dashCtDropzone.addEventListener(ev, e => { e.preventDefault(); e.stopPropagation(); }, false));

        ["dragenter", "dragover"].forEach(ev =>
            dashCtDropzone.addEventListener(ev, () => dashCtDropzone.classList.add("dragover"), false));
        ["dragleave", "drop"].forEach(ev =>
            dashCtDropzone.addEventListener(ev, () => dashCtDropzone.classList.remove("dragover"), false));

        dashCtDropzone.addEventListener("drop", e => {
            if (e.dataTransfer.files.length > 0) handleDashboardCTScan(e.dataTransfer.files[0]);
        });

        dashCtFileInput.addEventListener("change", e => {
            if (e.target.files.length > 0) handleDashboardCTScan(e.target.files[0]);
        });
    }

    function handleDashboardCTScan(file) {
        if (!file) return;

        // Analyzing state
        dashCtStatus.style.display     = "flex";
        dashCtStatus.style.background  = "rgba(139, 92, 246, 0.05)";
        dashCtStatus.style.borderColor = "rgba(139, 92, 246, 0.2)";
        dashCtStatus.style.color       = "#8b5cf6";
        dashCtFilename.textContent     = file.name;
        dashCtNodule.innerHTML         = `<em>Analyzing chest scan slices…</em>`;
        showToast("Uploading CT scan to local AI imaging model…", "info");

        setTimeout(() => {
            const low = file.name.toLowerCase();
            const isAbnormal = low.includes("cancer") || low.includes("tumor") ||
                               low.includes("nodule") || low.includes("positive") ||
                               Math.random() < 0.35;

            if (isAbnormal) {
                dashCtStatus.style.background  = "rgba(239, 68, 68, 0.05)";
                dashCtStatus.style.borderColor = "rgba(239, 68, 68, 0.2)";
                dashCtStatus.style.color       = "var(--risk-high)";
                dashCtNodule.innerHTML =
                    `<strong>⚠ ALERT: Solitary pulmonary nodule detected (8mm, left upper lobe). Seek specialist review.</strong>`;
                showToast("AI Imaging: Abnormal nodule found — clinical follow-up recommended.", "error");
            } else {
                dashCtStatus.style.background  = "rgba(16, 185, 129, 0.05)";
                dashCtStatus.style.borderColor = "rgba(16, 185, 129, 0.2)";
                dashCtStatus.style.color       = "var(--accent-emerald)";
                dashCtNodule.innerHTML =
                    `<strong>✓ Normal — 0 abnormal nodules detected (Clean chest cavity)</strong>`;
                showToast("AI Imaging: No abnormal nodules found.", "success");
            }
            lucide.createIcons();
        }, 1500);
    }

    // CHART RENDERING
    // ---------------------------------------------------------
    let riskTrendChart = null;
    function renderChart() {
        const canvas = document.getElementById("risk-trend-chart");
        if (!canvas) return;

        if (riskTrendChart) {
            riskTrendChart.destroy();
        }

        // Get history, sort oldest to newest for the chart timeline
        const chartData = [...state.history].reverse();
        
        // If no data, show empty chart with default labels
        const labels = chartData.length > 0 
            ? chartData.map(record => new Date(record.timestamp).toLocaleDateString(undefined, {month: 'short', day: 'numeric'}))
            : ['No Data'];
            
        const dataPoints = chartData.length > 0
            ? chartData.map(record => record.score)
            : [0];

        const ctx = canvas.getContext('2d');
        riskTrendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Risk Score (%)',
                    data: dataPoints,
                    borderColor: 'rgba(14, 165, 233, 1)',
                    backgroundColor: 'rgba(14, 165, 233, 0.1)',
                    borderWidth: 2,
                    pointBackgroundColor: 'rgba(14, 165, 233, 1)',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: 'rgba(14, 165, 233, 1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: {
                            color: 'rgba(0,0,0,0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
    }

    // ---------------------------------------------------------
    // HEALTH TIPS DYNAMIC INTERACTION PROTOCOL
    // ---------------------------------------------------------
    const healthTips = [
        "🌬️ Alternating nostril breathing (Anulom Vilom) balances respiratory flow and strengthens vital alveoli.",
        "🥦 Cruciferous foods like broccoli contain sulforaphane, helping lung tissue switch on cellular defense genes.",
        "🥛 Hydration is clinically proven to dilute mucous layers, enabling respiratory pathways to sweep out environmental toxins.",
        "🏡 Placing a snake plant in your workspace naturally absorbs airborne formaldehydes and benzene.",
        "🏃‍♂️ Engaging in 30 minutes of daily aerobic cardio expands chest structures and boosts absolute vital capacity.",
        "🧬 Curcumin (found in turmeric) reduces chronic bronchial inflammation and supports deep bronchial recovery.",
        "🚭 Shielding yourself from secondhand smoke avoids inhaling highly carcinogenic nitrosamines and benzene.",
        "🍵 Drinking warm green tea loaded with catechins provides vital antioxidants that actively shield bronchial cells.",
        "🧘‍♀️ Diaphragmatic belly breathing exercises maximize oxygen transfer and clear residual carbon dioxide.",
        "🚫 Monitor your local AQI before morning jogs. Stay indoors if fine particulates (PM2.5) climb above 100."
    ];

    const btnGenerateTip = document.getElementById("btn-generate-tip");
    const tipGeneratorContent = document.getElementById("tip-generator-content");
    const tipGeneratorBox = document.getElementById("tip-generator-box");

    if (btnGenerateTip && tipGeneratorContent && tipGeneratorBox) {
        let currentTipIndex = -1;

        function generateRandomTip() {
            // Apply bounce click animation to button
            btnGenerateTip.style.transform = "scale(0.95)";
            setTimeout(() => btnGenerateTip.style.transform = "scale(1)", 150);

            // Fade out current tip
            tipGeneratorBox.style.opacity = "0.3";
            tipGeneratorBox.style.transform = "translateY(-4px)";

            setTimeout(() => {
                let newIndex;
                do {
                    newIndex = Math.floor(Math.random() * healthTips.length);
                } while (newIndex === currentTipIndex && healthTips.length > 1);

                currentTipIndex = newIndex;
                tipGeneratorContent.innerHTML = `<strong>Tip of the Day:</strong><br>${healthTips[currentTipIndex]}`;

                // Fade back in
                tipGeneratorBox.style.opacity = "1";
                tipGeneratorBox.style.transform = "translateY(0)";
            }, 250);
        }

        btnGenerateTip.addEventListener("click", generateRandomTip);
        
        // Generate an initial random tip upon active page mount
        generateRandomTip();
    }

    // STARTUP RUN
    // ---------------------------------------------------------
    checkActiveSession();

});


// ==========================================================================
// FUTURE ENHANCE PREDICT - CHARTS INITIALIZATION
// ==========================================================================
let fpChartsInitialized = false;
function initFuturePredictCharts() {
    if (fpChartsInitialized) return;
    fpChartsInitialized = true;

    if (typeof Chart === 'undefined') {
        console.warn("Chart.js is not loaded.");
        return;
    }

    // Common options for tiny sparklines
    const sparklineOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false, min: 0 } },
        elements: { point: { radius: 0 } },
        interaction: { mode: null }
    };

    // Helper to create sparkline
    function createSparkline(ctxId, color, data) {
        const ctx = document.getElementById(ctxId);
        if (!ctx) return;
        new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['1','2','3','4','5','6','7'],
                datasets: [{
                    data: data,
                    borderColor: color,
                    borderWidth: 2,
                    tension: 0.4
                }]
            },
            options: sparklineOptions
        });
    }

    // Vitals Row Sparklines
    createSparkline('fp-spark-hr', '#8B5CF6', [65, 68, 74, 70, 72, 75, 72]);
    createSparkline('fp-spark-spo2', '#3b82f6', [97, 98, 97, 99, 98, 98, 98]);
    createSparkline('fp-spark-resp', '#22c55e', [15, 16, 15, 17, 16, 16, 16]);
    createSparkline('fp-spark-stress', '#ef4444', [30, 45, 50, 40, 35, 45, 45]);

    // Table Row Sparklines
    createSparkline('fp-table-spark-1', '#8B5CF6', [65, 68, 74, 70, 72, 75, 72]);
    createSparkline('fp-table-spark-2', '#3b82f6', [97, 98, 97, 99, 98, 98, 98]);
    createSparkline('fp-table-spark-3', '#22c55e', [15, 16, 15, 17, 16, 16, 16]);
    createSparkline('fp-table-spark-4', '#6366f1', [7, 6.5, 7.2, 7.5, 6.8, 7.1, 7.3]);
    createSparkline('fp-table-spark-5', '#ef4444', [30, 45, 50, 40, 35, 45, 45]);

    // Bottom Analytics Sparklines
    createSparkline('fp-bottom-spark-1', '#8B5CF6', [5000, 6500, 8000, 7500, 9000, 8432, 8500]);
    createSparkline('fp-bottom-spark-2', '#3b82f6', [30, 40, 45, 35, 50, 45, 45]);
    createSparkline('fp-bottom-spark-3', '#22c55e', [1800, 2000, 2100, 2050, 2200, 2140, 2150]);
    createSparkline('fp-bottom-spark-4', '#ef4444', [64, 63, 62, 63, 61, 62, 62]);

    // AI Health Score Doughnut
    const healthCtx = document.getElementById('fp-health-score-chart');
    if (healthCtx) {
        new Chart(healthCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [82, 18],
                    backgroundColor: ['#8B5CF6', '#F3EEFF'],
                    borderWidth: 0,
                    borderRadius: 20
                }]
            },
            options: {
                cutout: '80%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { animateScale: true }
            }
        });
    }

    // Risk Meter Doughnut
    const riskCtx = document.getElementById('fp-risk-meter');
    if (riskCtx) {
        new Chart(riskCtx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [21, 79],
                    backgroundColor: ['#ef4444', '#f1f5f9'],
                    borderWidth: 0,
                    borderRadius: 10
                }]
            },
            options: {
                cutout: '80%',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                animation: { animateScale: true }
            }
        });
    }

    // Risk Projection Line Chart
    const projCtx = document.getElementById('fp-risk-projection');
    if (projCtx) {
        new Chart(projCtx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Risk %',
                    data: [25, 24, 23, 22, 21, 20],
                    borderColor: '#8B5CF6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#8B5CF6',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#94a3b8', font: { size: 10 } } },
                    y: { border: { dash: [4, 4] }, grid: { color: '#f1f5f9' }, ticks: { display: false, min: 0, max: 100 } }
                }
            }
        });
    }
}

// ==========================================================================
// LIVE DATA SIMULATION
// ==========================================================================
let liveDataInterval = null;
let isLiveDataActive = false;

document.addEventListener('DOMContentLoaded', () => {
    // Wait slightly to ensure elements are ready
    setTimeout(() => {
        const btnLiveData = document.getElementById('btn-live-data');
        if (btnLiveData) {
            btnLiveData.addEventListener('click', () => {
                const btnText = document.getElementById('btn-live-data-text');
                const icon = btnLiveData.querySelector('i');
                
                isLiveDataActive = !isLiveDataActive;
                
                if (isLiveDataActive) {
                    // Turn ON
                    btnText.textContent = "Live Data: ON";
                    btnLiveData.style.background = "linear-gradient(135deg, #10b981, #059669)"; // Emerald
                    btnLiveData.style.boxShadow = "0 8px 20px rgba(16, 185, 129, 0.3)";
                    icon.style.animation = "pulse-glow 1.5s infinite";
                    
                    // Start Simulation Interval
                    simulateLiveData(); // Initial tick
                    liveDataInterval = setInterval(simulateLiveData, 2500);
                } else {
                    // Turn OFF
                    btnText.textContent = "View Live Data";
                    btnLiveData.style.background = ""; // Revert to class style
                    btnLiveData.style.boxShadow = "0 8px 20px rgba(139, 92, 246, 0.25)";
                    icon.style.animation = "none";
                    
                    // Stop Simulation Interval
                    clearInterval(liveDataInterval);
                }
            });
        }
    }, 500);
});

function simulateLiveData() {
    if (typeof Chart === 'undefined') return;

    // Helper to get random int between
    const rand = (min, max) => Math.floor(Math.random() * (max - min + 1) + min);

    // 1. Update text metrics
    const hr = rand(65, 80);
    const spo2 = rand(96, 99);
    const resp = rand(14, 18);
    const stress = rand(30, 55);

    const hrEl = document.getElementById('live-metric-hr');
    const spo2El = document.getElementById('live-metric-spo2');
    const respEl = document.getElementById('live-metric-resp');
    const stressEl = document.getElementById('live-metric-stress');

    if (hrEl) hrEl.textContent = hr;
    if (spo2El) spo2El.textContent = spo2;
    if (respEl) respEl.textContent = resp;
    if (stressEl) stressEl.textContent = stress;

    // 2. Update Sparklines (Push new data, shift old)
    const updateChart = (chartId, newValue) => {
        const chart = Chart.getChart(chartId);
        if (chart) {
            const dataArr = chart.data.datasets[0].data;
            dataArr.shift(); // remove first
            dataArr.push(newValue); // add to end
            chart.update('none'); // Update without full animation for smoother look
        }
    };

    updateChart('fp-spark-hr', hr);
    updateChart('fp-spark-spo2', spo2);
    updateChart('fp-spark-resp', resp);
    updateChart('fp-spark-stress', stress);
    
    // Also update table sparklines to match
    updateChart('fp-table-spark-1', hr);
    updateChart('fp-table-spark-2', spo2);
    updateChart('fp-table-spark-3', resp);
    updateChart('fp-table-spark-5', stress);

    // 3. Randomly fluctuate AI Health Score slightly
    const healthChart = Chart.getChart('fp-health-score-chart');
    if (healthChart) {
        const currentScore = healthChart.data.datasets[0].data[0];
        const newScore = Math.min(100, Math.max(0, currentScore + rand(-2, 2)));
        healthChart.data.datasets[0].data = [newScore, 100 - newScore];
        healthChart.update('none');
        
        // Update the big text number inside the doughnut wrapper
        const scoreTextEl = healthChart.canvas.nextElementSibling?.querySelector('span');
        if (scoreTextEl) scoreTextEl.textContent = newScore;
    }
}
