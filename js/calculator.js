class ConventionRoomCalculator {
    constructor() {
        this.form = document.getElementById('calculatorForm');
        this.resultsContainer = document.getElementById('resultsContainer');
        this.detailedBreakdown = document.getElementById('detailedBreakdown');
        this.scheduleTable = document.getElementById('scheduleTable');
        this.utilizationChart = null;
        this.currentResults = null;
        this.customSessions = new Map(); // Store custom session modifications
        this.currentEditingSession = null;
        this.timeSlotSchedule = new Map(); // Store time assignments for each slot
        this.sessionCategories = new Map(); // Store custom categories
        this.paperDetails = new Map(); // Store individual paper details
        this.paperAssignments = new Map(); // Store manual paper-to-session assignments
        this.roomNames = new Map(); // Store custom room names (room number -> custom name)
        this.moderators = new Map(); // Store moderator details (id -> {name, school, email, bio})
        this.chairs = new Map(); // Store chair details (id -> {name, school, email, bio})
        this.customTimeSlots = new Map(); // Store custom time slots per day (day -> number of slots)
        this.customRoomsPerDay = new Map(); // Store custom available rooms per day (day -> number of rooms)
        this.customSessionsPerSlot = new Map(); // Store custom sessions per time slot per day (day -> sessions per slot)
        this.customTimeSlotLabels = new Map(); // Store custom time slot labels (day -> array of slot labels)
        this.customSessionLabels = new Map(); // Store custom session labels (sessionKey -> custom label)
        
        this.initializeEventListeners();
        this.initializeModalEventListeners();
        this.initializeTimeSlotEventListeners();
        this.initializeCategoryEventListeners();
        this.initializePaperEventListeners();
        this.initializePaperAssignmentEventListeners();
        this.initializeRoomManagementEventListeners();
        this.initializeModeratorManagementEventListeners();
        this.initializeChairManagementEventListeners();
        this.initializeCustomTimeSlotsEventListeners();
        this.initializeTimeSlotLabelsEventListeners();
        this.initializeSessionLabelsEventListeners();
        this.loadDefaultCategories();
        this.loadDataFromSupabase(); // Load saved data
        this.calculateRequirements(); // Initial calculation with default values
    }

    initializeEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.calculateRequirements();
        });

        // Real-time calculation on input change
        const inputs = this.form.querySelectorAll('input, select');
        inputs.forEach(input => {
            input.addEventListener('input', () => {
                this.calculateRequirements();
            });
            input.addEventListener('change', () => {
                this.calculateRequirements();
            });
        });

        // PDF export functionality
        document.getElementById('exportPDF').addEventListener('click', () => {
            this.exportToPDF();
        });

        // Reset customizations
        document.getElementById('resetCustomizations').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all session customizations?')) {
                this.customSessions.clear();
                this.generateDetailedBreakdown(this.currentResults);
                this.updateCustomizationSummary();
            }
        });

        // Configure time slots
        document.getElementById('configureTimeSlots').addEventListener('click', () => {
            this.openTimeSlotModal();
        });

        // Manage categories
        document.getElementById('manageCategoriesBtn').addEventListener('click', () => {
            this.openCategoryModal();
        });

        // Manage papers
        document.getElementById('managePapersBtn').addEventListener('click', () => {
            this.openPaperModal();
        });

        // Assign papers to sessions
        document.getElementById('autoPopulateBtn').addEventListener('click', () => {
            this.autoPopulateSessions();
        });

        document.getElementById('assignPapersBtn').addEventListener('click', () => {
            this.openPaperAssignmentModal();
        });

        // Manage time slot labels
        document.getElementById('manageTimeSlotLabelsBtn').addEventListener('click', () => {
            this.openTimeSlotLabelsModal();
        });

        // Manage session labels
        document.getElementById('manageSessionLabelsBtn').addEventListener('click', () => {
            this.openSessionLabelsModal();
        });

        // Convention management
        document.getElementById('saveConventionBtn').addEventListener('click', () => {
            this.saveCurrentConvention();
        });

        document.getElementById('loadConventionBtn').addEventListener('click', () => {
            this.openConventionListModal();
        });

        document.getElementById('newConventionBtn').addEventListener('click', () => {
            this.createNewConvention();
        });
    }

    initializeModalEventListeners() {
        // Modal controls
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeEditModal();
        });
        
        document.getElementById('cancelEdit').addEventListener('click', () => {
            this.closeEditModal();
        });
        
        document.getElementById('saveSession').addEventListener('click', () => {
            this.saveSessionEdit();
        });
        
        // Custom category handling
        document.getElementById('editCategorySelect').addEventListener('change', (e) => {
            const customInput = document.getElementById('editCategoryCustom');
            if (e.target.value === 'custom') {
                customInput.classList.remove('hidden');
                customInput.focus();
            } else {
                customInput.classList.add('hidden');
            }
        });
        
        // Close modal when clicking overlay
        document.getElementById('sessionEditModal').addEventListener('click', (e) => {
            if (e.target.id === 'sessionEditModal') {
                this.closeEditModal();
            }
        });
    }

    initializeTimeSlotEventListeners() {
        // Time slot modal controls
        document.getElementById('closeTimeModal').addEventListener('click', () => {
            this.closeTimeSlotModal();
        });
        
        document.getElementById('cancelTimeConfig').addEventListener('click', () => {
            this.closeTimeSlotModal();
        });
        
        const saveButton = document.getElementById('saveTimeConfig');
        if (saveButton) {
            saveButton.addEventListener('click', () => {
                this.saveTimeSlotConfiguration();
            });
        } else {
            console.error('Save Time Config button not found!');
        }
        
        document.getElementById('autoGenerateTimes').addEventListener('click', () => {
            this.autoGenerateTimeSlots();
        });
        
        // Close modal when clicking overlay
        document.getElementById('timeSlotModal').addEventListener('click', (e) => {
            if (e.target.id === 'timeSlotModal') {
                this.closeTimeSlotModal();
            }
        });
    }

    getFormData() {
        const conventionDays = parseInt(document.getElementById('conventionDays').value) || 3;
        const standardTimeSlotsPerDay = parseInt(document.getElementById('timeSlotsPerDay').value) || 4;
        const standardAvailableRooms = parseInt(document.getElementById('availableRooms').value) || 10;
        const standardSessionsPerTimeSlot = parseInt(document.getElementById('sessionsPerTimeSlot').value) || 3;
        
        // Calculate arrays for daily configurations
        let totalTimeSlots = 0;
        let timeSlotsPerDay = [];
        let roomsPerDay = [];
        let sessionsPerSlotPerDay = [];
        
        const hasCustomConfig = this.customTimeSlots.size > 0 || this.customRoomsPerDay.size > 0 || this.customSessionsPerSlot.size > 0;
        
        for (let day = 1; day <= conventionDays; day++) {
            // Time slots per day
            const slots = this.customTimeSlots.get(day) || standardTimeSlotsPerDay;
            timeSlotsPerDay.push(slots);
            totalTimeSlots += slots;
            
            // Rooms per day
            const rooms = this.customRoomsPerDay.get(day) || standardAvailableRooms;
            roomsPerDay.push(rooms);
            
            // Sessions per slot per day
            const sessionsPerSlot = this.customSessionsPerSlot.get(day) || standardSessionsPerTimeSlot;
            sessionsPerSlotPerDay.push(sessionsPerSlot);
        }
        
        return {
            conventionDays: conventionDays,
            timeSlotsPerDay: standardTimeSlotsPerDay, // Keep for backward compatibility
            timeSlotsPerDayArray: timeSlotsPerDay, // Array of slots per day
            totalTimeSlots: totalTimeSlots, // Total across all days
            availableRooms: standardAvailableRooms, // Keep for backward compatibility
            roomsPerDayArray: roomsPerDay, // Array of rooms per day
            sessionsPerTimeSlot: standardSessionsPerTimeSlot, // Keep for backward compatibility
            sessionsPerSlotPerDayArray: sessionsPerSlotPerDay, // Array of sessions per slot per day
            hasCustomDailyConfig: hasCustomConfig, // Flag indicating custom configuration exists
            totalPapers: parseInt(document.getElementById('totalPapers').value) || 0,
            papersPerSession: parseInt(document.getElementById('papersPerSession').value) || 4,
            minPapersPerSession: parseInt(document.getElementById('minPapersPerSession').value) || 2,
            maxPapersPerSession: parseInt(document.getElementById('maxPapersPerSession').value) || 6,
            papersPerRoom: parseInt(document.getElementById('papersPerRoom').value) || 1,
            totalRoundTables: parseInt(document.getElementById('totalRoundTables').value) || 0,
            roundTableDuration: parseInt(document.getElementById('roundTableDuration').value) || 1
        };
    }

    calculateRequirements() {
        const data = this.getFormData();
        
        // Calculate paper sessions using category-based distribution
        const sessionDistribution = this.generateCategoryBasedSessions();
        const paperSessions = sessionDistribution.sessions.length;
        const roundTableSessions = data.totalRoundTables * data.roundTableDuration;
        const totalSessions = paperSessions + roundTableSessions;
        
        // Calculate total capacity using per-day configurations
        let totalSessionCapacity = 0;
        let totalRoomSlots = 0;
        let minRoomsNeeded = 0;
        
        if (data.hasCustomDailyConfig) {
            // Use per-day configurations
            for (let day = 1; day <= data.conventionDays; day++) {
                const dayIndex = day - 1;
                const slots = data.timeSlotsPerDayArray[dayIndex];
                const rooms = data.roomsPerDayArray[dayIndex];
                const sessionsPerSlot = data.sessionsPerSlotPerDayArray[dayIndex];
                
                totalSessionCapacity += slots * sessionsPerSlot;
                totalRoomSlots += slots * rooms;
                
                // Calculate minimum rooms needed per day based on concurrent sessions
                const maxConcurrentSessions = sessionsPerSlot;
                const roomsNeededThisDay = Math.min(rooms, maxConcurrentSessions);
                minRoomsNeeded = Math.max(minRoomsNeeded, roomsNeededThisDay);
            }
        } else {
            // Use standard calculations
            const totalTimeSlots = data.totalTimeSlots;
            totalRoomSlots = totalTimeSlots * data.availableRooms;
            totalSessionCapacity = totalTimeSlots * data.sessionsPerTimeSlot;
            minRoomsNeeded = Math.ceil(totalSessions / totalTimeSlots);
        }
        
        // Calculate if it's feasible
        const isFeasible = totalSessions <= totalSessionCapacity;
        const utilizationRate = (totalSessions / totalSessionCapacity * 100).toFixed(1);
        
        // Calculate approximate sessions per day (for backward compatibility)
        const sessionsPerDay = Math.ceil(totalSessions / data.conventionDays);
        const roomsUsedPerDay = data.hasCustomDailyConfig ? 
            Math.max(...data.roomsPerDayArray) : 
            Math.ceil(sessionsPerDay / data.timeSlotsPerDay);
        
        const results = {
            ...data,
            sessionDistribution,
            paperSessions,
            roundTableSessions,
            totalSessions,
            totalSessionCapacity, // New: total session capacity across all days
            totalRoomSlots,
            minRoomsNeeded,
            isFeasible,
            utilizationRate,
            sessionsPerDay,
            roomsUsedPerDay,
            excessRooms: data.availableRooms - minRoomsNeeded,
            sessionsPerSlot: Math.ceil(totalSessions / data.totalTimeSlots)
        };

        this.currentResults = results;
        this.displayResults(results);
        this.generateDetailedBreakdown(results);
        this.updateTimeSlotPreview();
        this.updateRoomPreview();
        this.updateModeratorPreview();
        this.updateChairPreview();
    }

    calculateOptimalSessionDistribution(data) {
        if (data.totalPapers === 0) {
            return { sessions: [], totalPapers: 0 };
        }

        const sessions = [];
        let remainingPapers = data.totalPapers;
        let sessionId = 1;

        // Ensure min/max are properly ordered
        const minPapers = Math.min(data.minPapersPerSession, data.maxPapersPerSession);
        const maxPapers = Math.max(data.minPapersPerSession, data.maxPapersPerSession);
        const standardPapers = Math.max(minPapers, Math.min(maxPapers, data.papersPerSession));

        while (remainingPapers > 0) {
            let papersInThisSession;

            if (remainingPapers <= maxPapers) {
                // Last session - use all remaining papers if within bounds
                if (remainingPapers >= minPapers) {
                    papersInThisSession = remainingPapers;
                } else {
                    // Too few papers for minimum - combine with previous session if possible
                    if (sessions.length > 0 && sessions[sessions.length - 1].paperCount + remainingPapers <= maxPapers) {
                        sessions[sessions.length - 1].paperCount += remainingPapers;
                        sessions[sessions.length - 1].title = `Paper Session ${sessions[sessions.length - 1].id} (${sessions[sessions.length - 1].paperCount} papers)`;
                        break;
                    } else {
                        papersInThisSession = remainingPapers;
                    }
                }
            } else {
                // Calculate optimal session size based on remaining papers
                const estimatedSessionsLeft = Math.ceil(remainingPapers / standardPapers);
                const optimalSize = Math.ceil(remainingPapers / estimatedSessionsLeft);
                
                // Keep within bounds
                papersInThisSession = Math.max(minPapers, Math.min(maxPapers, optimalSize));
                
                // Adjust if this would leave too few papers for the next session
                if (remainingPapers - papersInThisSession > 0 && remainingPapers - papersInThisSession < minPapers) {
                    papersInThisSession = Math.max(minPapers, remainingPapers - minPapers);
                }
            }

            sessions.push({
                id: sessionId,
                paperCount: papersInThisSession,
                title: `Paper Session ${sessionId} (${papersInThisSession} papers)`,
                type: 'paper',
                category: this.categorizeSession(papersInThisSession, minPapers, maxPapers, standardPapers)
            });

            remainingPapers -= papersInThisSession;
            sessionId++;
        }

        return {
            sessions: sessions,
            totalPapers: data.totalPapers,
            sessionStats: this.calculateSessionStats(sessions, minPapers, maxPapers, standardPapers)
        };
    }

    categorizeSession(paperCount, minPapers, maxPapers, standardPapers) {
        if (paperCount <= minPapers + 1) {
            return 'small';
        } else if (paperCount >= maxPapers - 1) {
            return 'large';
        } else {
            return 'standard';
        }
    }

    calculateSessionStats(sessions, minPapers, maxPapers, standardPapers) {
        const stats = {
            small: sessions.filter(s => s.category === 'small').length,
            standard: sessions.filter(s => s.category === 'standard').length,
            large: sessions.filter(s => s.category === 'large').length,
            avgPapersPerSession: sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.paperCount, 0) / sessions.length).toFixed(1) : 0,
            minActual: Math.min(...sessions.map(s => s.paperCount)),
            maxActual: Math.max(...sessions.map(s => s.paperCount))
        };
        return stats;
    }

    displayResults(results) {
        const statusColor = results.isFeasible ? 'green' : 'red';
        const statusIcon = results.isFeasible ? 'check-circle' : 'exclamation-triangle';
        const statusText = results.isFeasible ? 'Feasible' : 'Not Feasible';

        this.resultsContainer.innerHTML = `
            <!-- Status Card -->
            <div class="bg-${statusColor}-50 border border-${statusColor}-200 rounded-lg p-4 mb-4">
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <i class="fas fa-${statusIcon} text-${statusColor}-600 text-2xl mr-3"></i>
                        <div>
                            <h3 class="text-lg font-semibold text-${statusColor}-800">${statusText}</h3>
                            <p class="text-${statusColor}-600 text-sm">
                                ${results.isFeasible 
                                    ? `Your convention can be accommodated with the available rooms` 
                                    : `You need more rooms or time slots to accommodate all sessions`}
                            </p>
                        </div>
                    </div>
                    <div class="text-right">
                        <div class="text-2xl font-bold text-${statusColor}-600">${results.utilizationRate}%</div>
                        <div class="text-sm text-${statusColor}-600">Room Utilization</div>
                    </div>
                </div>
            </div>

            <!-- Key Metrics -->
            <div class="grid grid-cols-2 gap-4 mb-4">
                <div class="bg-blue-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-blue-600">${results.minRoomsNeeded}</div>
                    <div class="text-sm text-blue-600">Minimum Rooms Needed</div>
                </div>
                <div class="bg-purple-50 p-4 rounded-lg">
                    <div class="text-2xl font-bold text-purple-600">${results.totalSessions}</div>
                    <div class="text-sm text-purple-600">Total Sessions</div>
                </div>
            </div>

            <!-- Session Breakdown -->
            <div class="bg-gray-50 p-4 rounded-lg mb-4">
                <h4 class="font-semibold text-gray-700 mb-3">Session Breakdown</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Paper Presentation Sessions:</span>
                        <span class="font-medium">${results.paperSessions} sessions</span>
                    </div>

                    <div class="flex justify-between">
                        <span class="text-gray-600">Round Table Sessions:</span>
                        <span class="font-medium">${results.roundTableSessions} sessions</span>
                    </div>
                    <div class="flex justify-between border-t pt-2">
                        <span class="text-gray-600">Total Sessions:</span>
                        <span class="font-bold">${results.totalSessions} sessions</span>
                    </div>
                </div>
            </div>

            <!-- Daily Planning -->
            <div class="bg-gray-50 p-4 rounded-lg">
                <h4 class="font-semibold text-gray-700 mb-3">Daily Planning</h4>
                <div class="space-y-2 text-sm">
                    <div class="flex justify-between">
                        <span class="text-gray-600">Sessions per Day:</span>
                        <span class="font-medium">${results.sessionsPerDay} sessions</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Rooms Used per Day:</span>
                        <span class="font-medium">${results.roomsUsedPerDay} rooms</span>
                    </div>
                    <div class="flex justify-between">
                        <span class="text-gray-600">Available Time Slots:</span>
                        <span class="font-medium">${results.totalTimeSlots} slots${results.hasCustomDailyConfig ? ' (variable per day)' : ''}</span>
                    </div>
                    ${results.excessRooms > 0 ? `
                    <div class="flex justify-between text-green-600">
                        <span>Buffer Rooms Available:</span>
                        <span class="font-medium">${results.excessRooms} rooms</span>
                    </div>
                    ` : ''}
                </div>
            </div>

            ${!results.isFeasible ? `
            <div class="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <h4 class="font-semibold text-red-800 mb-2">
                    <i class="fas fa-exclamation-triangle mr-2"></i>
                    Suggestions to Make it Feasible
                </h4>
                <ul class="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>Increase the number of available rooms to at least ${results.minRoomsNeeded}</li>
                    <li>Add more time slots per day (currently ${results.timeSlotsPerDay})</li>
                    <li>Extend the convention to ${Math.ceil(results.totalSessions / (results.timeSlotsPerDay * results.availableRooms))} days</li>
                    <li>Increase papers per session to ${Math.ceil(results.totalPapers / (results.totalTimeSlots * results.availableRooms - results.roundTableSessions))}</li>
                </ul>
            </div>
            ` : ''}
        `;
    }

    generateDetailedBreakdown(results) {
        if (!results.isFeasible && results.totalSessions === 0) {
            this.detailedBreakdown.classList.add('hidden');
            return;
        }

        this.detailedBreakdown.classList.remove('hidden');
        this.generateScheduleTable(results);
        this.generateUtilizationChart(results);
        this.generateSessionBreakdown(results);
        this.updateCustomizationSummary();
    }

    generateScheduleTable(results) {
        let tableHTML = `
            <div class="overflow-x-auto">
                <table class="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead class="bg-gray-50">
                        <tr>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Day</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time Slots</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Rooms Used</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sessions</th>
                            <th class="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-200">
        `;

        let remainingSessions = results.totalSessions;
        
        for (let day = 1; day <= results.conventionDays; day++) {
            const dayIndex = day - 1;
            
            // Get per-day configurations
            const timeSlotsThisDay = results.timeSlotsPerDayArray ? results.timeSlotsPerDayArray[dayIndex] : results.timeSlotsPerDay;
            const roomsThisDay = results.roomsPerDayArray ? results.roomsPerDayArray[dayIndex] : results.availableRooms;
            const sessionsPerSlotThisDay = results.sessionsPerSlotPerDayArray ? results.sessionsPerSlotPerDayArray[dayIndex] : results.sessionsPerTimeSlot;
            
            // Calculate capacity and sessions for this day
            const dayCapacity = timeSlotsThisDay * sessionsPerSlotThisDay;
            const sessionsThisDay = Math.min(remainingSessions, dayCapacity);
            const roomsUsedThisDay = timeSlotsThisDay > 0 ? Math.ceil(sessionsThisDay / timeSlotsThisDay) : 0;
            const utilitzationThisDay = dayCapacity > 0 ? ((sessionsThisDay / dayCapacity) * 100).toFixed(1) : '0.0';
            
            remainingSessions -= sessionsThisDay;
            
            const utilizationColor = utilitzationThisDay > 80 ? 'text-red-600' : 
                                   utilitzationThisDay > 60 ? 'text-yellow-600' : 'text-green-600';

            // Display rooms info (show custom if different from standard)
            const roomsDisplay = results.hasCustomDailyConfig && roomsThisDay !== results.availableRooms ? 
                `${roomsUsedThisDay}/${roomsThisDay}` : 
                `${roomsUsedThisDay}/${results.availableRooms}`;

            tableHTML += `
                <tr class="${day % 2 === 0 ? 'bg-gray-50' : 'bg-white'}">
                    <td class="px-4 py-2 text-sm font-medium text-gray-900">Day ${day}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">${timeSlotsThisDay}${results.hasCustomDailyConfig ? '*' : ''}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">${roomsDisplay}${results.hasCustomDailyConfig && roomsThisDay !== results.availableRooms ? '*' : ''}</td>
                    <td class="px-4 py-2 text-sm text-gray-600">${sessionsThisDay}/${dayCapacity}${results.hasCustomDailyConfig ? '*' : ''}</td>
                    <td class="px-4 py-2 text-sm ${utilizationColor} font-medium">${utilitzationThisDay}%</td>
                </tr>
            `;
        }

        tableHTML += `
                    </tbody>
                </table>
            </div>
        `;

        this.scheduleTable.innerHTML = tableHTML;
    }

    generateUtilizationChart(results) {
        const ctx = document.getElementById('utilizationChart').getContext('2d');
        
        if (this.utilizationChart) {
            this.utilizationChart.destroy();
        }

        const data = [];
        const labels = [];
        let remainingSessions = results.totalSessions;

        for (let day = 1; day <= results.conventionDays; day++) {
            const dayIndex = day - 1;
            
            // Get per-day configurations
            const timeSlotsThisDay = results.timeSlotsPerDayArray ? results.timeSlotsPerDayArray[dayIndex] : results.timeSlotsPerDay;
            const sessionsPerSlotThisDay = results.sessionsPerSlotPerDayArray ? results.sessionsPerSlotPerDayArray[dayIndex] : results.sessionsPerTimeSlot;
            
            // Calculate capacity and sessions for this day
            const dayCapacity = timeSlotsThisDay * sessionsPerSlotThisDay;
            const sessionsThisDay = Math.min(remainingSessions, dayCapacity);
            const utilization = dayCapacity > 0 ? (sessionsThisDay / dayCapacity) * 100 : 0;
            
            const labelInfo = results.hasCustomDailyConfig ? 
                `Day ${day} (${timeSlotsThisDay}×${sessionsPerSlotThisDay}=${dayCapacity})` : 
                `Day ${day} (${timeSlotsThisDay} slots)`;
            
            labels.push(labelInfo);
            data.push(utilization.toFixed(1));
            remainingSessions -= sessionsThisDay;
        }

        this.utilizationChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Room Utilization (%)',
                    data: data,
                    backgroundColor: data.map(value => 
                        value > 80 ? 'rgba(239, 68, 68, 0.6)' :
                        value > 60 ? 'rgba(245, 158, 11, 0.6)' :
                        'rgba(34, 197, 94, 0.6)'
                    ),
                    borderColor: data.map(value => 
                        value > 80 ? 'rgba(239, 68, 68, 1)' :
                        value > 60 ? 'rgba(245, 158, 11, 1)' :
                        'rgba(34, 197, 94, 1)'
                    ),
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Utilization: ${context.parsed.y}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    generateSessionBreakdown(results) {
        const sessionBreakdown = document.getElementById('sessionBreakdown');
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        
        // Initialize round table assignments if not exists
        if (!this.roundTableAssignments) {
            this.roundTableAssignments = new Map(); // Maps roundTableId -> {day, timeSlot, slotIndex}
        }
        
        // Initialize paper session assignments if not exists
        if (!this.paperSessionAssignments) {
            this.paperSessionAssignments = new Map(); // Maps positionKey -> {sessionNumber, title, paperCount, category, color}
        }
        
        let paperSessionCount = 0;
        let breakdownHTML = '';
        
        for (let day = 1; day <= results.conventionDays; day++) {
            const dayIndex = day - 1;
            
            // Get per-day configurations
            const timeSlotsThisDay = results.timeSlotsPerDayArray ? results.timeSlotsPerDayArray[dayIndex] : results.timeSlotsPerDay;
            const roomsThisDay = results.roomsPerDayArray ? results.roomsPerDayArray[dayIndex] : results.availableRooms;
            const sessionsPerSlotThisDay = results.sessionsPerSlotPerDayArray ? results.sessionsPerSlotPerDayArray[dayIndex] : results.sessionsPerTimeSlot;
            
            const dayCapacity = timeSlotsThisDay * sessionsPerSlotThisDay;
            const configInfo = results.hasCustomDailyConfig ? 
                ` - ${timeSlotsThisDay} slots × ${sessionsPerSlotThisDay} sessions = ${dayCapacity} capacity` : 
                ` (${timeSlotsThisDay} time slots)`;
            
            breakdownHTML += `
                <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3">
                        <h4 class="text-lg font-semibold">Day ${day}${configInfo}</h4>
                        ${results.hasCustomDailyConfig ? `<p class="text-sm text-blue-100 mt-1">${roomsThisDay} rooms available</p>` : ''}
                    </div>
                    <div class="p-6">
                        <div class="grid gap-4">
            `;
            
            // Calculate remaining paper sessions for this day
            const remainingPaperSessions = results.paperSessions - paperSessionCount;
            
            if (timeSlotsThisDay === 0) {
                breakdownHTML += `
                    <div class="text-center py-8 text-gray-500">
                        <i class="fas fa-info-circle text-3xl mb-2"></i>
                        <p>No time slots available</p>
                    </div>
                `;
            } else {
                for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                    const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                    const timeSlotKey = `day${day}_slot${slot}`;
                    
                    breakdownHTML += `
                        <div class="border border-gray-200 rounded-lg p-4 time-slot-container" 
                             data-day="${day}" data-slot="${slot}" data-time-slot-key="${timeSlotKey}">
                            <div class="flex items-center justify-between mb-3">
                                <h5 class="font-semibold text-gray-800">
                                    <i class="fas fa-clock text-blue-500 mr-2"></i>
                                    ${this.formatTimeSlot(day, slotLabel)}
                                </h5>
                                <span class="text-sm text-gray-500">
                                    ${sessionsPerSlotThisDay} session position${sessionsPerSlotThisDay > 1 ? 's' : ''} available
                                </span>
                            </div>
                            <div class="grid gap-2 session-drop-zone" data-max-sessions="${sessionsPerSlotThisDay}">
                    `;
                    
                    // Generate individual session positions within this time slot
                    for (let position = 0; position < sessionsPerSlotThisDay; position++) {
                        const positionKey = `day${day}_slot${slot}_pos${position}`;
                        
                        // Check if this position has assigned sessions
                        const assignedRoundTable = this.getAssignedRoundTableForPosition(day, slot, position);
                        
                        // Check if this position has an assigned paper session
                        const assignedPaper = this.getAssignedPaperForPosition(day, slot, position);
                        
                        if (assignedRoundTable) {
                            // Render assigned round table
                            const roundTableTitle = this.getSessionLabel('round_table', assignedRoundTable);
                            const sessionData = {
                                day: day,
                                timeSlot: slot,
                                position: position,
                                type: 'round table',
                                sessionNumber: assignedRoundTable
                            };
                            
                            const sessionKey = `roundtable_${assignedRoundTable}`;
                            
                            breakdownHTML += this.generateEditableSessionCard(
                                sessionData,
                                sessionKey,
                                'purple',
                                'users',
                                roundTableTitle,
                                true, // isDraggable
                                true  // isModifiable
                            );
                        } else if (assignedPaper) {
                            // Render assigned paper session
                            const sessionInfo = assignedPaper;
                            
                            // Get the custom title if available, otherwise use stored title or default
                            const customTitle = this.getSessionLabel('paper_session', sessionInfo.sessionNumber);
                            const sessionTitle = customTitle !== `Paper Session ${sessionInfo.sessionNumber}` 
                                ? customTitle 
                                : (sessionInfo.title || `Paper Session ${sessionInfo.sessionNumber}`);
                            
                            // Create session data for editing
                            const sessionData = {
                                day: day,
                                timeSlot: slot,
                                position: position,
                                type: 'paper',
                                sessionNumber: sessionInfo.sessionNumber,
                                paperCount: sessionInfo.paperCount || 4,
                                category: sessionInfo.category || null
                            };
                            
                            const sessionKey = this.getSessionKey(day, slotLabel, position);
                            
                            breakdownHTML += this.generateEditableSessionCard(
                                sessionData,
                                sessionKey,
                                sessionInfo.color || 'green',
                                'file-alt',
                                sessionTitle,
                                false, // isDraggable
                                true   // isModifiable
                            );
                        } else {
                            // Render empty position slot
                            breakdownHTML += `
                                <div class="session-position-slot border-2 border-dashed border-gray-300 rounded-md p-4 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
                                     data-day="${day}" data-slot="${slot}" data-position="${position}"
                                     onclick="calculator.openPositionAssignmentModal(${day}, ${slot}, ${position})">
                                    <div class="text-gray-400 mb-2">
                                        <i class="fas fa-plus-circle text-2xl"></i>
                                    </div>
                                    <p class="text-sm text-gray-500 font-medium">Position ${position + 1}</p>
                                    <p class="text-xs text-gray-400 mt-1">Click to assign session</p>
                                </div>
                            `;
                        }
                    }
                    
                    breakdownHTML += `
                            </div>
                        </div>
                    `;
                }
            }
            
            breakdownHTML += `
                        </div>
                    </div>
                </div>
            `;
        }
        
        // Add summary at the end
        breakdownHTML += `
            <div class="bg-gray-50 border border-gray-200 rounded-lg p-6">
                <h4 class="text-lg font-semibold text-gray-800 mb-4">
                    <i class="fas fa-chart-pie text-blue-600 mr-2"></i>
                    Session Summary
                </h4>
                <div class="grid md:grid-cols-3 gap-4">
                    <div class="bg-green-100 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-green-600">${results.paperSessions}</div>
                        <div class="text-sm text-green-600">Paper Sessions</div>
                        <div class="text-xs text-green-500 mt-1">${results.totalPapers} total papers</div>
                    </div>
                    <div class="bg-purple-100 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-purple-600">${results.roundTableSessions}</div>
                        <div class="text-sm text-purple-600">Round Table Sessions</div>
                        <div class="text-xs text-purple-500 mt-1">${results.totalRoundTables} total tables</div>
                    </div>
                    <div class="bg-blue-100 p-4 rounded-lg text-center">
                        <div class="text-2xl font-bold text-blue-600">${results.totalSessions}</div>
                        <div class="text-sm text-blue-600">Total Sessions</div>
                        <div class="text-xs text-blue-500 mt-1">Across ${results.conventionDays} days</div>
                    </div>
                </div>
                
                <div class="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div class="flex items-start">
                        <i class="fas fa-info-circle text-yellow-600 mt-1 mr-2"></i>
                        <div class="text-sm text-yellow-800">
                            <strong>Note:</strong> Room assignments shown are examples. Actual room allocation should consider 
                            factors such as room capacity, equipment needs, and presenter preferences.
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add unassigned round tables section at the end
        breakdownHTML += this.generateUnassignedRoundTablesSection(results);
        
        sessionBreakdown.innerHTML = breakdownHTML;
        
        // Attach event listeners for drag-and-drop functionality
        this.attachRoundTableDragListeners();
    }

    generateAssignedRoundTables(day, slot) {
        const assignedTables = this.getAssignedRoundTablesForSlot(day, slot);
        let html = '';
        
        assignedTables.forEach(roundTableId => {
            const roundTableTitle = this.getSessionLabel('round_table', roundTableId);
            const sessionData = {
                day: day,
                timeSlot: slot,
                type: 'round table',
                sessionNumber: roundTableId
            };
            
            const sessionKey = `roundtable_${roundTableId}`;
            
            html += this.generateEditableSessionCard(
                sessionData,
                sessionKey,
                'purple',
                'users',
                roundTableTitle,
                true // isDraggable
            );
        });
        
        return html;
    }

    getAssignedRoundTablesForSlot(day, slot) {
        const assigned = [];
        this.roundTableAssignments.forEach((assignment, roundTableId) => {
            if (assignment.day === day && assignment.slotIndex === slot) {
                assigned.push(roundTableId);
            }
        });
        return assigned;
    }

    getAssignedRoundTableForPosition(day, slot, position) {
        // Find round table assigned to specific position
        for (let [roundTableId, assignment] of this.roundTableAssignments) {
            if (assignment.day === day && assignment.slotIndex === slot && assignment.position === position) {
                return roundTableId;
            }
        }
        return null;
    }

    getAssignedPaperForPosition(day, slot, position) {
        // Find paper session assigned to specific position
        const positionKey = `day${day}_slot${slot}_pos${position}`;
        return this.paperSessionAssignments.get(positionKey) || null;
    }

    findNextAvailablePosition(day, slot, maxSessions) {
        // Find the next available position in this time slot
        for (let position = 0; position < maxSessions; position++) {
            if (!this.getAssignedRoundTableForPosition(day, slot, position)) {
                return position;
            }
        }
        return 0; // Fallback to first position
    }

    shouldAssignPaperToPosition(day, slot, position, paperSessionCount, totalPaperSessions) {
        // Only assign paper if we still have papers left and this position isn't occupied by round table
        if (paperSessionCount >= totalPaperSessions) {
            return false;
        }
        
        // Calculate how many paper sessions should be before this position
        let paperSessionsBeforeThisPosition = 0;
        
        // Count paper sessions in previous days/slots/positions
        for (let d = 1; d <= day; d++) {
            const dayIndex = d - 1;
            const timeSlotsThisDay = this.currentResults?.timeSlotsPerDayArray ? this.currentResults.timeSlotsPerDayArray[dayIndex] : this.currentResults?.timeSlotsPerDay || 4;
            const sessionsPerSlotThisDay = this.currentResults?.sessionsPerSlotPerDayArray ? this.currentResults.sessionsPerSlotPerDayArray[dayIndex] : this.currentResults?.sessionsPerTimeSlot || 3;
            
            const maxSlot = (d === day) ? slot : timeSlotsThisDay;
            
            for (let s = 0; s < maxSlot; s++) {
                const maxPosition = (d === day && s === slot) ? position : sessionsPerSlotThisDay;
                
                for (let p = 0; p < maxPosition; p++) {
                    // If no round table is assigned to this position, count it as a paper session spot
                    if (!this.getAssignedRoundTableForPosition(d, s, p)) {
                        paperSessionsBeforeThisPosition++;
                    }
                }
            }
        }
        
        return paperSessionsBeforeThisPosition === paperSessionCount;
    }

    generateUnassignedRoundTablesSection(results) {
        const unassignedTables = [];
        
        // Find unassigned round tables
        for (let i = 1; i <= results.roundTableSessions; i++) {
            if (!this.roundTableAssignments.has(i)) {
                unassignedTables.push(i);
            }
        }
        

        
        if (unassignedTables.length === 0) {
            return ''; // All round tables are assigned
        }
        
        let html = `
            <div class="bg-white border border-gray-200 rounded-lg overflow-hidden mt-6">
                <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-3">
                    <h4 class="text-lg font-semibold">
                        <i class="fas fa-users mr-2"></i>
                        Unassigned Round Tables
                    </h4>
                    <p class="text-sm text-purple-100 mt-1">Click on any round table to choose where to place it</p>
                </div>
                <div class="p-6">
                    <div class="grid gap-3 unassigned-round-tables">
        `;
        
        unassignedTables.forEach(roundTableId => {
            const roundTableTitle = this.getSessionLabel('round_table', roundTableId);
            const sessionData = {
                type: 'round table',
                sessionNumber: roundTableId
            };
            
            const sessionKey = `unassigned_roundtable_${roundTableId}`;
            
            html += this.generateEditableSessionCard(
                sessionData,
                sessionKey,
                'purple',
                'users',
                roundTableTitle,
                true, // isDraggable
                false // isModifiable - unassigned tables don't need edit/remove buttons
            );
        });
        
        html += `
                    </div>
                    <div class="mt-4 p-3 bg-purple-50 rounded-lg">
                        <p class="text-sm text-purple-700">
                            <i class="fas fa-info-circle mr-1"></i>
                            <strong>How to assign:</strong> Click on any round table above to choose which time slot to place it in. 
                            You can also click on any available time slot to select from unassigned round tables.
                        </p>
                    </div>
                </div>
            </div>
        `;
        
        return html;
    }

    attachRoundTableDragListeners() {
        // Remove any existing listeners to prevent duplicates
        document.removeEventListener('click', this.handleRoundTableClick);
        
        // Create a bound version of the handler to enable removal
        this.handleRoundTableClick = (e) => {
            if (e.target.closest('.round-table-clickable')) {
                const roundTableCard = e.target.closest('.round-table-clickable');
                const roundTableId = parseInt(roundTableCard.dataset.roundTableId);
                
                // Check if this is an unassigned round table
                if (!this.roundTableAssignments.has(roundTableId)) {
                    // For unassigned round tables, open the placement modal to choose position
                    this.openRoundTablePlacementModal(roundTableId);
                } else {
                    // For assigned round tables, allow editing
                    this.openRoundTablePlacementModal(roundTableId);
                }
            }
        };
        
        // Handle click on round tables to open placement modal
        document.addEventListener('click', this.handleRoundTableClick);
    }

    openRoundTablePlacementModal(roundTableId) {
        const results = this.currentResults;
        if (!results) return;

        // Get round table title
        const roundTableTitle = this.getSessionLabel('round_table', roundTableId);

        // Generate available positions
        let positionsHTML = '';
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

        for (let day = 1; day <= results.conventionDays; day++) {
            const dayIndex = day - 1;
            const timeSlotsThisDay = results.timeSlotsPerDayArray ? results.timeSlotsPerDayArray[dayIndex] : results.timeSlotsPerDay;
            const sessionsPerSlotThisDay = results.sessionsPerSlotPerDayArray ? results.sessionsPerSlotPerDayArray[dayIndex] : results.sessionsPerTimeSlot;

            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                const timeSlotDisplay = this.formatTimeSlot(day, slotLabel);
                
                // Show all positions within this time slot
                for (let position = 0; position < sessionsPerSlotThisDay; position++) {
                    const assignedRoundTable = this.getAssignedRoundTableForPosition(day, slot, position);
                    const assignedPaper = this.getAssignedPaperForPosition(day, slot, position);
                    const isOccupied = assignedRoundTable || assignedPaper;
                    
                    // Check if this round table is currently in this position
                    const isCurrentPosition = assignedRoundTable === roundTableId;
                    
                    let statusText = '';
                    let statusClass = '';
                    let clickHandler = '';
                    
                    if (isCurrentPosition) {
                        statusText = 'Currently Here';
                        statusClass = 'bg-purple-100 border-purple-300';
                    } else if (isOccupied) {
                        if (assignedRoundTable) {
                            statusText = `Occupied by Round Table ${assignedRoundTable}`;
                        } else if (assignedPaper) {
                            statusText = `Occupied by Paper Session ${assignedPaper.sessionNumber}`;
                        }
                        statusClass = 'bg-gray-100 border-gray-200 opacity-50';
                    } else {
                        statusText = 'Available';
                        statusClass = 'bg-green-50 border-green-200 hover:bg-green-100 cursor-pointer';
                        clickHandler = `onclick="calculator.assignRoundTableToPosition(${roundTableId}, ${day}, ${slot}, ${position})"`;
                    }
                    
                    positionsHTML += `
                        <div class="flex items-center justify-between p-3 border rounded-lg ${statusClass}" ${clickHandler}>
                            <div class="flex-1">
                                <div class="font-medium text-gray-900">
                                    ${timeSlotDisplay} - Position ${position + 1}
                                    ${isCurrentPosition ? '<span class="ml-2 text-purple-600 font-semibold">(Current)</span>' : ''}
                                </div>
                                <div class="text-sm text-gray-600">
                                    Day ${day} • ${statusText}
                                </div>
                            </div>
                            <div class="ml-4">
                                ${isCurrentPosition ? 
                                    '<i class="fas fa-check-circle text-purple-600"></i>' : 
                                    !isOccupied ? 
                                        '<i class="fas fa-plus-circle text-green-600"></i>' : 
                                        '<i class="fas fa-times-circle text-gray-400"></i>'
                                }
                            </div>
                        </div>
                    `;
                }
            }
        }

        // Show modal
        const modalHTML = `
            <div id="roundTablePlacementModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="calculator.closeRoundTablePlacementModal()">
                <div class="bg-white rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
                    <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-semibold flex items-center">
                                    <i class="fas fa-users mr-2"></i>
                                    Place ${roundTableTitle}
                                </h3>
                                <p class="text-sm text-purple-100 mt-1">Click on an available position to place this round table</p>
                            </div>
                            <button onclick="calculator.closeRoundTablePlacementModal()" 
                                    class="text-white hover:text-purple-200 transition-colors ml-4">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 flex-1 overflow-y-auto">
                        <div class="space-y-2">
                            ${positionsHTML}
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 flex justify-between flex-shrink-0">
                        <button onclick="calculator.unassignRoundTable(${roundTableId})" 
                                class="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors">
                            <i class="fas fa-trash mr-2"></i>
                            Remove Assignment
                        </button>
                        <button onclick="calculator.closeRoundTablePlacementModal()" 
                                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
                            Close
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('roundTablePlacementModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    assignRoundTableToSlot(roundTableId, day, slot) {
        // This function is kept for backward compatibility with old modal system
        // but redirects to position-based assignment
        
        const results = this.currentResults;
        if (!results) return;

        const dayIndex = day - 1;
        const sessionsPerSlotThisDay = results.sessionsPerSlotPerDayArray ? results.sessionsPerSlotPerDayArray[dayIndex] : results.sessionsPerTimeSlot;
        
        // Find first available position in this slot
        let availablePosition = -1;
        for (let position = 0; position < sessionsPerSlotThisDay; position++) {
            const assignedRoundTable = this.getAssignedRoundTableForPosition(day, slot, position);
            const assignedPaper = this.getAssignedPaperForPosition(day, slot, position);
            
            if (!assignedRoundTable && !assignedPaper) {
                availablePosition = position;
                break;
            }
        }

        if (availablePosition === -1) {
            this.showNotification('This time slot is full. No available positions.', 'error');
            return;
        }

        // Use the position-based assignment
        this.assignRoundTableToPosition(roundTableId, day, slot, availablePosition);
        
        // Close the placement modal
        this.closeRoundTablePlacementModal();
    }

    unassignRoundTable(roundTableId) {
        // Remove from assignments
        this.roundTableAssignments.delete(roundTableId);
        
        // Close modal and refresh display
        this.closeRoundTablePlacementModal();
        this.generateDetailedBreakdown(this.currentResults);
        
        this.showNotification(`Round Table ${roundTableId} removed from assignment`, 'success');
    }

    closeRoundTablePlacementModal() {
        const modal = document.getElementById('roundTablePlacementModal');
        if (modal) {
            modal.remove();
        }
    }

    assignRoundTableToPosition(roundTableId, day, slot, position) {
        // Remove from previous assignment if exists
        this.roundTableAssignments.delete(roundTableId);
        
        // Add to new position-specific assignment
        this.roundTableAssignments.set(roundTableId, {
            day: day,
            slotIndex: slot,
            position: position
        });

        // Close any open modals and refresh display
        this.closeRoundTableSelectionModal();
        this.closeTimeSlotAssignmentModal();
        this.generateDetailedBreakdown(this.currentResults);
        
        // Show success message
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
        this.showNotification(`Round Table ${roundTableId} assigned to Day ${day}, ${slotLabel}, Position ${position + 1}`, 'success');
    }

    assignPaperSessionToPosition(day, slot, position) {
        // Create a new paper session assignment
        const positionKey = `day${day}_slot${slot}_pos${position}`;
        
        // Find next available session number
        let nextSessionNumber = 1;
        const existingNumbers = new Set();
        this.paperSessionAssignments.forEach(session => {
            existingNumbers.add(session.sessionNumber);
        });
        
        while (existingNumbers.has(nextSessionNumber)) {
            nextSessionNumber++;
        }
        
        // Get custom title if available
        const customTitle = this.getSessionLabel('paper_session', nextSessionNumber);
        
        // Create paper session data
        const paperSession = {
            sessionNumber: nextSessionNumber,
            title: customTitle,
            paperCount: 4,
            category: null,
            color: 'green'
        };
        
        // Assign to position
        this.paperSessionAssignments.set(positionKey, paperSession);
        
        // Close modal and refresh display
        this.closePositionAssignmentModal();
        this.generateDetailedBreakdown(this.currentResults);
        
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
        this.showNotification(`Paper Session ${nextSessionNumber} assigned to Day ${day}, ${slotLabel}, Position ${position + 1}`, 'success');
    }

    removeSessionFromPosition(day, slot, position, sessionType) {
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
        
        if (sessionType === 'round table') {
            // Find and remove round table assignment
            const roundTableId = this.getAssignedRoundTableForPosition(day, slot, position);
            if (roundTableId) {
                this.roundTableAssignments.delete(roundTableId);
                this.showNotification(`Round Table ${roundTableId} removed from Day ${day}, ${slotLabel}, Position ${position + 1}`, 'success');
            }
        } else if (sessionType === 'paper') {
            // Remove paper session assignment
            const positionKey = `day${day}_slot${slot}_pos${position}`;
            const paperSession = this.paperSessionAssignments.get(positionKey);
            if (paperSession) {
                this.paperSessionAssignments.delete(positionKey);
                this.showNotification(`Paper Session ${paperSession.sessionNumber} removed from Day ${day}, ${slotLabel}, Position ${position + 1}`, 'success');
            }
        }
        
        // Refresh display
        this.generateDetailedBreakdown(this.currentResults);
    }

    autoPopulateSessions() {
        if (!this.currentResults) {
            this.showNotification('Please calculate the schedule first before auto-populating sessions.', 'error');
            return;
        }

        // Clear existing assignments
        this.paperSessionAssignments.clear();
        this.roundTableAssignments.clear();

        const results = this.currentResults;
        let paperSessionCount = 0;
        let roundTableCount = 0;

        // Iterate through all days and time slots
        for (let day = 1; day <= results.conventionDays; day++) {
            const dayIndex = day - 1;
            const timeSlotsThisDay = results.timeSlotsPerDayArray ? results.timeSlotsPerDayArray[dayIndex] : results.timeSlotsPerDay;
            const sessionsPerSlotThisDay = results.sessionsPerSlotPerDayArray ? results.sessionsPerSlotPerDayArray[dayIndex] : results.sessionsPerTimeSlot;

            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                // For each position in this time slot
                for (let position = 0; position < sessionsPerSlotThisDay; position++) {
                    // Auto-populate logic: Round tables go in last positions, papers in earlier positions
                    const isLastPosition = position === (sessionsPerSlotThisDay - 1);
                    
                    if (isLastPosition && roundTableCount < results.roundTableSessions) {
                        // Assign round table to last position
                        roundTableCount++;
                        this.roundTableAssignments.set(roundTableCount, {
                            day: day,
                            slotIndex: slot,
                            position: position
                        });
                    } else if (!isLastPosition && paperSessionCount < results.paperSessions) {
                        // Assign paper session to earlier positions
                        paperSessionCount++;
                        const positionKey = `day${day}_slot${slot}_pos${position}`;
                        
                        this.paperSessionAssignments.set(positionKey, {
                            sessionNumber: paperSessionCount,
                            title: `Paper Session ${paperSessionCount}`,
                            paperCount: 4,
                            category: null,
                            color: 'green'
                        });
                    }
                    
                    // Break if we've assigned all sessions
                    if (paperSessionCount >= results.paperSessions && roundTableCount >= results.roundTableSessions) {
                        break;
                    }
                }
                
                // Break if we've assigned all sessions
                if (paperSessionCount >= results.paperSessions && roundTableCount >= results.roundTableSessions) {
                    break;
                }
            }
            
            // Break if we've assigned all sessions
            if (paperSessionCount >= results.paperSessions && roundTableCount >= results.roundTableSessions) {
                break;
            }
        }

        // Refresh display
        this.generateDetailedBreakdown(this.currentResults);
        
        this.showNotification(`Auto-populated ${paperSessionCount} paper sessions and ${roundTableCount} round tables (round tables placed in end positions)`, 'success');
    }

    openTimeSlotAssignmentModal(day, slot) {
        const results = this.currentResults;
        if (!results) return;

        // Get unassigned round tables
        const unassignedTables = [];
        for (let i = 1; i <= results.roundTableSessions; i++) {
            if (!this.roundTableAssignments.has(i)) {
                unassignedTables.push(i);
            }
        }

        if (unassignedTables.length === 0) {
            this.showNotification('No unassigned round tables available.', 'info');
            return;
        }

        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
        const timeSlotDisplay = this.formatTimeSlot(day, slotLabel);

        // Generate round table options
        let tablesHTML = '';
        unassignedTables.forEach(roundTableId => {
            const roundTableTitle = this.getSessionLabel('round_table', roundTableId);
            tablesHTML += `
                <div class="flex items-center justify-between p-3 border border-purple-200 rounded-lg bg-purple-50 hover:bg-purple-100 cursor-pointer transition-colors"
                     onclick="calculator.assignRoundTableToSlot(${roundTableId}, ${day}, ${slot})"
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-purple-500 text-white rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-users text-sm"></i>
                        </div>
                        <div>
                            <div class="font-medium text-purple-800">${roundTableTitle}</div>
                            <div class="text-sm text-purple-600">Click to assign to this time slot</div>
                        </div>
                    </div>
                    <i class="fas fa-arrow-right text-purple-600"></i>
                </div>
            `;
        });

        // Show modal
        const modalHTML = `
            <div id="timeSlotAssignmentModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                <div class="bg-white rounded-lg max-w-lg w-full max-h-96 overflow-hidden">
                    <div class="bg-gradient-to-r from-purple-500 to-purple-600 text-white px-6 py-4">
                        <h3 class="text-lg font-semibold flex items-center">
                            <i class="fas fa-clock mr-2"></i>
                            Add Round Table to ${timeSlotDisplay}
                        </h3>
                        <p class="text-sm text-purple-100 mt-1">Day ${day} • Choose a round table to assign</p>
                    </div>
                    <div class="p-6 max-h-64 overflow-y-auto">
                        <div class="space-y-3">
                            ${tablesHTML}
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 flex justify-end">
                        <button onclick="calculator.closeTimeSlotAssignmentModal()" 
                                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('timeSlotAssignmentModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeTimeSlotAssignmentModal() {
        const modal = document.getElementById('timeSlotAssignmentModal');
        if (modal) {
            modal.remove();
        }
    }

    openPositionAssignmentModal(day, slot, position) {
        // Create modal content for position-specific assignment
        let modalContent = `
            <div class="fixed inset-0 z-50 modal-overlay" id="positionAssignmentModal" style="background-color: rgba(0,0,0,0.5);" onclick="calculator.closePositionAssignmentModal()">
                <div class="flex items-center justify-center min-h-screen px-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-md w-full" onclick="event.stopPropagation()">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-800">
                                        <i class="fas fa-plus-circle text-blue-600 mr-2"></i>
                                        Assign Session
                                    </h3>
                                    <p class="text-sm text-gray-600 mt-1">Choose what to assign to Day ${day}, Time Slot ${slot + 1}, Position ${position + 1}</p>
                                </div>
                                <button onclick="calculator.closePositionAssignmentModal()" 
                                        class="text-gray-400 hover:text-gray-600 transition-colors ml-4">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        <div class="px-6 py-4">
                            <div class="space-y-3">
        `;
        
        // Option for Round Table
        const availableRoundTables = [];
        for (let i = 1; i <= (this.currentResults?.roundTableSessions || 0); i++) {
            if (!this.roundTableAssignments.has(i)) {
                availableRoundTables.push(i);
            }
        }
        
        if (availableRoundTables.length > 0) {
            modalContent += `
                <button class="w-full text-left p-4 border-2 border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                        onclick="calculator.showRoundTableOptions(${day}, ${slot}, ${position});">
                    <div class="flex items-center">
                        <i class="fas fa-users text-purple-600 mr-3 text-xl"></i>
                        <div>
                            <div class="font-medium text-gray-800">Round Table</div>
                            <div class="text-sm text-gray-500">${availableRoundTables.length} available</div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400 ml-auto"></i>
                    </div>
                </button>
            `;
        }
        
        // Option for Paper Session
        modalContent += `
                <button class="w-full text-left p-4 border-2 border-green-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors"
                        onclick="calculator.assignPaperSessionToPosition(${day}, ${slot}, ${position}); calculator.closePositionAssignmentModal();">
                    <div class="flex items-center">
                        <i class="fas fa-file-alt text-green-600 mr-3 text-xl"></i>
                        <div>
                            <div class="font-medium text-gray-800">Paper Session</div>
                            <div class="text-sm text-gray-500">Create new paper session</div>
                        </div>
                        <i class="fas fa-chevron-right text-gray-400 ml-auto"></i>
                    </div>
                </button>
        `;
        
        modalContent += `
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-gray-200 flex justify-end">
                            <button onclick="calculator.closePositionAssignmentModal();" 
                                    class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalContent);
    }

    closePositionAssignmentModal() {
        const modal = document.getElementById('positionAssignmentModal');
        if (modal) {
            modal.remove();
        }
    }

    showRoundTableOptions(day, slot, position) {
        // Close current modal
        this.closePositionAssignmentModal();
        
        // Find available round tables
        const availableRoundTables = [];
        for (let i = 1; i <= (this.currentResults?.roundTableSessions || 0); i++) {
            if (!this.roundTableAssignments.has(i)) {
                availableRoundTables.push(i);
            }
        }
        
        // Create round table selection modal
        let modalContent = `
            <div class="fixed inset-0 z-50 modal-overlay" id="roundTableSelectionModal" style="background-color: rgba(0,0,0,0.5);" onclick="calculator.closeRoundTableSelectionModal()">
                <div class="flex items-center justify-center min-h-screen px-4">
                    <div class="bg-white rounded-lg shadow-xl max-w-md w-full" onclick="event.stopPropagation()">
                        <div class="px-6 py-4 border-b border-gray-200">
                            <div class="flex items-center justify-between">
                                <div>
                                    <h3 class="text-lg font-semibold text-gray-800">
                                        <i class="fas fa-users text-purple-600 mr-2"></i>
                                        Select Round Table
                                    </h3>
                                    <p class="text-sm text-gray-600 mt-1">Day ${day}, Time Slot ${slot + 1}, Position ${position + 1}</p>
                                </div>
                                <button onclick="calculator.closeRoundTableSelectionModal()" 
                                        class="text-gray-400 hover:text-gray-600 transition-colors ml-4">
                                    <i class="fas fa-times text-xl"></i>
                                </button>
                            </div>
                        </div>
                        <div class="px-6 py-4 max-h-96 overflow-y-auto">
                            <div class="space-y-2">
        `;
        
        availableRoundTables.forEach(roundTableId => {
            const roundTableTitle = this.getSessionLabel('round_table', roundTableId);
            modalContent += `
                <button class="w-full text-left p-3 border border-gray-200 rounded-md hover:bg-purple-50 hover:border-purple-300 transition-colors"
                        onclick="calculator.assignRoundTableToPosition(${roundTableId}, ${day}, ${slot}, ${position}); calculator.closeRoundTableSelectionModal();">
                    <div class="flex items-center">
                        <i class="fas fa-users text-purple-600 mr-3"></i>
                        <div>
                            <div class="font-medium text-gray-800">${roundTableTitle}</div>
                            <div class="text-sm text-gray-500">Round Table ${roundTableId}</div>
                        </div>
                    </div>
                </button>
            `;
        });
        
        modalContent += `
                            </div>
                        </div>
                        <div class="px-6 py-4 border-t border-gray-200 flex justify-between">
                            <button onclick="calculator.openPositionAssignmentModal(${day}, ${slot}, ${position}); calculator.closeRoundTableSelectionModal();" 
                                    class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
                                <i class="fas fa-arrow-left mr-2"></i>Back
                            </button>
                            <button onclick="calculator.closeRoundTableSelectionModal();" 
                                    class="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Add modal to DOM
        document.body.insertAdjacentHTML('beforeend', modalContent);
    }

    closeRoundTableSelectionModal() {
        const modal = document.getElementById('roundTableSelectionModal');
        if (modal) {
            modal.remove();
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            type === 'success' ? 'bg-green-500 text-white' :
            type === 'error' ? 'bg-red-500 text-white' :
            'bg-blue-500 text-white'
        }`;
        notification.innerHTML = `
            <div class="flex items-center">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'} mr-2"></i>
                ${message}
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Auto remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    exportToPDF() {
        if (!this.currentResults) {
            alert('Please calculate the schedule first before exporting.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Add title
        doc.setFontSize(20);
        doc.setFont('helvetica', 'bold');
        doc.text('Convention Room Schedule', 20, 20);
        
        // Add convention details
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        let yPos = 35;
        
        doc.text(`Convention Duration: ${this.currentResults.conventionDays} days`, 20, yPos);
        yPos += 7;
        
        // Show custom daily configuration info if applicable
        if (this.currentResults.hasCustomDailyConfig) {
            doc.text(`Daily Configuration: Custom per day (Total: ${this.currentResults.totalTimeSlots} slots)`, 20, yPos);
            yPos += 7;
            
            for (let day = 1; day <= this.currentResults.conventionDays; day++) {
                const dayIndex = day - 1;
                const slots = this.currentResults.timeSlotsPerDayArray[dayIndex];
                const rooms = this.currentResults.roomsPerDayArray[dayIndex];
                const sessionsPerSlot = this.currentResults.sessionsPerSlotPerDayArray[dayIndex];
                const capacity = slots * sessionsPerSlot;
                
                doc.text(`  Day ${day}: ${slots} slots × ${rooms} rooms × ${sessionsPerSlot} sessions = ${capacity} capacity`, 20, yPos);
                yPos += 4;
            }
        } else {
            doc.text(`Time Slots per Day: ${this.currentResults.timeSlotsPerDay}`, 20, yPos);
            yPos += 7;
        }
        doc.text(`Available Rooms: ${this.currentResults.availableRooms}`, 20, yPos);
        yPos += 7;
        doc.text(`Sessions per Time Slot: ${this.currentResults.sessionsPerTimeSlot}`, 20, yPos);
        yPos += 10;
        
        // Add summary
        doc.setFont('helvetica', 'bold');
        doc.text('Schedule Summary:', 20, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Papers: ${this.currentResults.totalPapers} (${this.currentResults.paperSessions} sessions)`, 20, yPos);
        yPos += 7;
        doc.text(`Total Round Tables: ${this.currentResults.totalRoundTables} sessions`, 20, yPos);
        yPos += 7;
        doc.text(`Room Utilization: ${this.currentResults.utilizationRate}%`, 20, yPos);
        yPos += 15;
        
        // Generate session breakdown for PDF
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        let sessionId = 1;
        let paperSessionCount = 0;
        let roundTableCount = 0;
        // Note: Using per-day slot indexing instead of global continuous indexing
        
        for (let day = 1; day <= this.currentResults.conventionDays; day++) {
            const dayIndex = day - 1;
            
            // Get per-day configurations
            const timeSlotsThisDay = this.currentResults.timeSlotsPerDayArray ? 
                this.currentResults.timeSlotsPerDayArray[dayIndex] : this.currentResults.timeSlotsPerDay;
            const roomsThisDay = this.currentResults.roomsPerDayArray ? 
                this.currentResults.roomsPerDayArray[dayIndex] : this.currentResults.availableRooms;
            const sessionsPerSlotThisDay = this.currentResults.sessionsPerSlotPerDayArray ? 
                this.currentResults.sessionsPerSlotPerDayArray[dayIndex] : this.currentResults.sessionsPerTimeSlot;
            
            // Check if we need a new page
            if (yPos > 250) {
                doc.addPage();
                yPos = 20;
            }
            
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            
            if (this.currentResults.hasCustomDailyConfig) {
                doc.text(`Day ${day} (${timeSlotsThisDay} slots × ${sessionsPerSlotThisDay} sessions, ${roomsThisDay} rooms)`, 20, yPos);
            } else {
                doc.text(`Day ${day} (${timeSlotsThisDay} time slots)`, 20, yPos);
            }
            yPos += 10;
            
            // Use per-day slot indexing (A, B, C, D for each day)
            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                const remainingPaperSessions = this.currentResults.paperSessions - paperSessionCount;
                const remainingRoundTables = this.currentResults.roundTableSessions - roundTableCount;
                const totalRemainingSessions = remainingPaperSessions + remainingRoundTables;
                
                if (totalRemainingSessions <= 0) break;
                
                const sessionsInThisSlot = Math.min(sessionsPerSlotThisDay, totalRemainingSessions);
                
                if (sessionsInThisSlot <= 0) break;
                
                // Check if we need a new page
                if (yPos > 240) {
                    doc.addPage();
                    yPos = 20;
                }
                
                doc.setFont('helvetica', 'bold');
                doc.setFontSize(12);
                doc.text(this.formatTimeSlot(day, slotLabel), 25, yPos);
                yPos += 7;
                
                doc.setFont('helvetica', 'normal');
                doc.setFontSize(10);
                
                let roundTableAddedInSlot = false;
                
                for (let s = 0; s < sessionsInThisSlot && (paperSessionCount < this.currentResults.paperSessions || roundTableCount < this.currentResults.roundTableSessions); s++) {
                    const remainingPaperSessionsNow = this.currentResults.paperSessions - paperSessionCount;
                    const remainingRoundTablesNow = this.currentResults.roundTableSessions - roundTableCount;
                    
                    const shouldAddRoundTable = remainingRoundTablesNow > 0 && 
                                               !roundTableAddedInSlot && 
                                               (s === 0 || remainingPaperSessionsNow === 0);
                    
                    let sessionText = '';
                    if (shouldAddRoundTable && roundTableCount < this.currentResults.roundTableSessions) {
                        const sessionKey = this.getSessionKey(day, slotLabel, s);
                        const customSession = this.customSessions.get(sessionKey);
                        const roomInfo = customSession && customSession.preferredRoom ? customSession.preferredRoom : this.getRoomName(Math.floor(Math.random() * this.currentResults.availableRooms) + 1);
                        const roundTableId = roundTableCount + 1;
                        const roundTableTitle = this.getSessionLabel('round_table', roundTableId);
                        sessionText = `  • ${roundTableTitle}`;
                        sessionText += `\n    Room: ${roomInfo}`;
                        
                        if (customSession && customSession.notes) {
                            sessionText += `\n    Notes: ${customSession.notes}`;
                        }
                        
                        // Add moderator and chair information for round tables if available
                        if (customSession && (customSession.moderatorName || customSession.chairName)) {
                            sessionText += '\n    Leadership:';
                            if (customSession.moderatorName) {
                                sessionText += `\n      • Moderator: ${customSession.moderatorName}`;
                                if (customSession.moderatorSchool) {
                                    sessionText += ` (${customSession.moderatorSchool})`;
                                }
                            }
                            if (customSession.chairName) {
                                sessionText += `\n      • Chair: ${customSession.chairName}`;
                                if (customSession.chairSchool) {
                                    sessionText += ` (${customSession.chairSchool})`;
                                }
                            }
                        }
                        roundTableCount++;
                        roundTableAddedInSlot = true;
                    } else if (paperSessionCount < this.currentResults.paperSessions) {
                        const sessionKey = this.getSessionKey(day, slotLabel, s);
                        const customSession = this.customSessions.get(sessionKey);
                        
                        let sessionInfo = this.currentResults.sessionDistribution.sessions[paperSessionCount];
                        let papersInSession = sessionInfo ? sessionInfo.paperCount : this.currentResults.papersPerSession;
                        let category = sessionInfo && sessionInfo.category ? sessionInfo.category : '';
                        let roomInfo = this.getRoomName(Math.floor(Math.random() * this.currentResults.availableRooms) + 1);
                        
                        // Override with custom data if available
                        if (customSession) {
                            papersInSession = customSession.paperCount || papersInSession;
                            category = customSession.category || category;
                            roomInfo = customSession.preferredRoom || roomInfo;
                        }
                        
                        // Build session title with category and custom name
                        const paperSessionId = paperSessionCount + 1;
                        const paperSessionTitle = this.getSessionLabel('paper_session', paperSessionId);
                        const categoryIndicator = category ? ` - ${category.toUpperCase()}` : '';
                        
                        // Use custom name if available, otherwise default format
                        if (paperSessionTitle !== `Paper Session ${paperSessionId}`) {
                            sessionText = `  • ${paperSessionTitle} (${papersInSession} papers)${categoryIndicator}`;
                        } else {
                            sessionText = `  • Paper Session ${paperSessionId} (${papersInSession} papers)${categoryIndicator}`;
                        }
                        sessionText += `\n    Room: ${roomInfo}`;
                        
                        if (customSession && customSession.notes) {
                            sessionText += `\n    Notes: ${customSession.notes}`;
                        }
                        
                        // Add moderator and chair information if available
                        if (customSession && (customSession.moderatorName || customSession.chairName)) {
                            sessionText += '\n    Leadership:';
                            if (customSession.moderatorName) {
                                sessionText += `\n      • Moderator: ${customSession.moderatorName}`;
                                if (customSession.moderatorSchool) {
                                    sessionText += ` (${customSession.moderatorSchool})`;
                                }
                            }
                            if (customSession.chairName) {
                                sessionText += `\n      • Chair: ${customSession.chairName}`;
                                if (customSession.chairSchool) {
                                    sessionText += ` (${customSession.chairSchool})`;
                                }
                            }
                        }
                        
                        // Add specific paper details if available
                        if (sessionInfo && sessionInfo.papers && sessionInfo.papers.length > 0) {
                            sessionText += `\n    Papers:`;
                            sessionInfo.papers.forEach((paper, idx) => {
                                sessionText += `\n      ${idx + 1}. "${paper.title}" - ${paper.student}, ${paper.school}`;
                            });
                        }
                        
                        paperSessionCount++;
                    } else if (roundTableCount < this.currentResults.roundTableSessions && !roundTableAddedInSlot) {
                        const sessionKey = this.getSessionKey(day, slotLabel, s);
                        const customSession = this.customSessions.get(sessionKey);
                        const roomInfo = customSession && customSession.preferredRoom ? customSession.preferredRoom : this.getRoomName(Math.floor(Math.random() * this.currentResults.availableRooms) + 1);
                        const roundTableId = roundTableCount + 1;
                        const roundTableTitle = this.getSessionLabel('round_table', roundTableId);
                        sessionText = `  • ${roundTableTitle}`;
                        sessionText += `\n    Room: ${roomInfo}`;
                        
                        if (customSession && customSession.notes) {
                            sessionText += `\n    Notes: ${customSession.notes}`;
                        }
                        
                        // Add moderator and chair information for round tables if available
                        if (customSession && (customSession.moderatorName || customSession.chairName)) {
                            sessionText += '\n    Leadership:';
                            if (customSession.moderatorName) {
                                sessionText += `\n      • Moderator: ${customSession.moderatorName}`;
                                if (customSession.moderatorSchool) {
                                    sessionText += ` (${customSession.moderatorSchool})`;
                                }
                            }
                            if (customSession.chairName) {
                                sessionText += `\n      • Chair: ${customSession.chairName}`;
                                if (customSession.chairSchool) {
                                    sessionText += ` (${customSession.chairSchool})`;
                                }
                            }
                        }
                        roundTableCount++;
                        roundTableAddedInSlot = true;
                    }
                    
                    if (sessionText) {
                        // Split multiline text and handle each line separately
                        const lines = sessionText.split('\n');
                        
                        // Check if we need a new page before adding this session
                        if (yPos + (lines.length * 4) > 270) {
                            doc.addPage();
                            yPos = 30;
                        }
                        
                        lines.forEach((line, index) => {
                            if (line.trim()) {
                                // Check if we need a new page for this line
                                if (yPos > 270) {
                                    doc.addPage();
                                    yPos = 30;
                                }
                                doc.text(line, 30, yPos);
                                yPos += 4; // Smaller spacing between lines within a session
                            }
                        });
                        yPos += 3; // Extra spacing after each session
                    }
                    
                    sessionId++;
                }
                
                yPos += 3;
                // Note: Removed globalSlotIndex increment as we now use day-specific slot indexing
            }
            
            yPos += 5;
        }
        
        // Add footer
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated by Convention Room Calculator - Page ${i} of ${pageCount}`, 20, 285);
        }
        
        // Save the PDF
        const filename = `Convention_Schedule_${this.currentResults.conventionDays}days_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(filename);
    }

    openEditModal(sessionKey, sessionData) {
        this.currentEditingSession = { key: sessionKey, data: sessionData };
        
        // Get current session info (custom or original)
        const customSession = this.customSessions.get(sessionKey);
        const currentSession = customSession || sessionData;
        
        // Populate modal
        const timeSlotDisplay = this.formatTimeSlot(sessionData.day, sessionData.timeSlot);
        document.getElementById('sessionInfo').innerHTML = `
            <div><strong>Time Slot:</strong> ${timeSlotDisplay}</div>
            <div><strong>Day:</strong> ${sessionData.day}</div>
            <div><strong>Session Type:</strong> ${sessionData.type}</div>
        `;

        // Show/hide round table specific fields
        const roundTableFields = document.getElementById('roundTableFields');
        const paperSessionFields = document.getElementById('paperSessionFields');
        
        if (sessionData.type === 'round table') {
            roundTableFields.classList.remove('hidden');
            paperSessionFields.classList.add('hidden');
            this.populateRoundTableFields(currentSession);
        } else {
            roundTableFields.classList.add('hidden');
            paperSessionFields.classList.remove('hidden');
        }
        
        document.getElementById('editPaperCount').value = currentSession.paperCount || sessionData.paperCount || 4;
        
        // Update category options first
        this.updateSessionCategoryOptions();
        
        // Set category
        const categorySelect = document.getElementById('editCategorySelect');
        const customInput = document.getElementById('editCategoryCustom');
        
        if (currentSession.category && !Array.from(categorySelect.options).some(opt => opt.value === currentSession.category)) {
            categorySelect.value = 'custom';
            customInput.value = currentSession.category;
            customInput.classList.remove('hidden');
        } else {
            const firstCategory = this.sessionCategories.size > 0 ? Array.from(this.sessionCategories.values())[0].name : 'General';
            categorySelect.value = currentSession.category || firstCategory;
            customInput.classList.add('hidden');
        }
        
        document.getElementById('editRoom').value = currentSession.preferredRoom || '';
        document.getElementById('editNotes').value = currentSession.notes || '';
        
        // Populate moderator and chair dropdowns
        this.populateModeratorDropdown();
        this.populateChairDropdown();
        
        // Set moderator selection
        const moderatorSelect = document.getElementById('editModeratorSelect');
        const moderatorNameInput = document.getElementById('editModeratorName');
        const moderatorSchoolInput = document.getElementById('editModeratorSchool');
        const customModeratorInputs = document.getElementById('customModeratorInputs');
        
        if (currentSession.moderatorName) {
            // Check if this moderator exists in our database
            let found = false;
            for (let [id, moderator] of this.moderators) {
                if (moderator.name === currentSession.moderatorName && moderator.school === currentSession.moderatorSchool) {
                    moderatorSelect.value = id;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                // Custom moderator
                moderatorSelect.value = 'custom';
                customModeratorInputs.classList.remove('hidden');
                moderatorNameInput.value = currentSession.moderatorName;
                moderatorSchoolInput.value = currentSession.moderatorSchool || '';
            } else {
                customModeratorInputs.classList.add('hidden');
                moderatorNameInput.value = currentSession.moderatorName;
                moderatorSchoolInput.value = currentSession.moderatorSchool || '';
            }
        } else {
            moderatorSelect.value = '';
            customModeratorInputs.classList.add('hidden');
            moderatorNameInput.value = '';
            moderatorSchoolInput.value = '';
        }
        
        // Set chair selection
        const chairSelect = document.getElementById('editChairSelect');
        const chairNameInput = document.getElementById('editChairName');
        const chairSchoolInput = document.getElementById('editChairSchool');
        const customChairInputs = document.getElementById('customChairInputs');
        
        if (currentSession.chairName) {
            // Check if this chair exists in our database
            let found = false;
            for (let [id, chair] of this.chairs) {
                if (chair.name === currentSession.chairName && chair.school === currentSession.chairSchool) {
                    chairSelect.value = id;
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                // Custom chair
                chairSelect.value = 'custom';
                customChairInputs.classList.remove('hidden');
                chairNameInput.value = currentSession.chairName;
                chairSchoolInput.value = currentSession.chairSchool || '';
            } else {
                customChairInputs.classList.add('hidden');
                chairNameInput.value = currentSession.chairName;
                chairSchoolInput.value = currentSession.chairSchool || '';
            }
        } else {
            chairSelect.value = '';
            customChairInputs.classList.add('hidden');
            chairNameInput.value = '';
            chairSchoolInput.value = '';
        }
        
        // Show paper details if available
        this.updateSessionPaperDetails(sessionData);
        
        // Show modal
        document.getElementById('sessionEditModal').classList.remove('hidden');
    }

    populateRoundTableFields(currentSession) {
        // Set custom round table name
        const roundTableNameInput = document.getElementById('editRoundTableName');
        if (roundTableNameInput) {
            roundTableNameInput.value = currentSession.customName || '';
        }

        // Populate participants
        const participants = currentSession.participants || [];
        for (let i = 0; i < 7; i++) {
            const nameInput = document.getElementById(`participant${i + 1}Name`);
            const schoolInput = document.getElementById(`participant${i + 1}School`);
            
            if (nameInput && schoolInput) {
                nameInput.value = participants[i] ? participants[i].name : '';
                schoolInput.value = participants[i] ? participants[i].school : '';
            }
        }
    }

    closeEditModal() {
        document.getElementById('sessionEditModal').classList.add('hidden');
        this.currentEditingSession = null;
        
        // Reset form
        document.getElementById('editCategoryCustom').classList.add('hidden');
        document.getElementById('editCategoryCustom').value = '';
    }

    saveSessionEdit() {
        if (!this.currentEditingSession) return;
        
        const sessionKey = this.currentEditingSession.key;
        const paperCount = parseInt(document.getElementById('editPaperCount').value) || 4;
        
        let category = document.getElementById('editCategorySelect').value;
        if (category === 'custom') {
            category = document.getElementById('editCategoryCustom').value.trim() || 'Custom';
        }
        
        const preferredRoom = document.getElementById('editRoom').value.trim();
        const notes = document.getElementById('editNotes').value.trim();
        
        // Get moderator and chair information
        const moderatorName = document.getElementById('editModeratorName').value.trim();
        const moderatorSchool = document.getElementById('editModeratorSchool').value.trim();
        const chairName = document.getElementById('editChairName').value.trim();
        const chairSchool = document.getElementById('editChairSchool').value.trim();
        
        // Get round table specific information
        let customName = '';
        let participants = [];
        
        if (this.currentEditingSession.data.type === 'round table') {
            const roundTableNameInput = document.getElementById('editRoundTableName');
            customName = roundTableNameInput ? roundTableNameInput.value.trim() : '';
            
            // Collect participants
            for (let i = 0; i < 7; i++) {
                const nameInput = document.getElementById(`participant${i + 1}Name`);
                const schoolInput = document.getElementById(`participant${i + 1}School`);
                
                if (nameInput && schoolInput) {
                    const name = nameInput.value.trim();
                    const school = schoolInput.value.trim();
                    
                    if (name || school) { // Only add if at least name or school is provided
                        participants.push({ name, school });
                    }
                }
            }
        }
        
        // Save custom session data
        this.customSessions.set(sessionKey, {
            ...this.currentEditingSession.data,
            paperCount: paperCount,
            category: category,
            preferredRoom: preferredRoom,
            notes: notes,
            moderatorName: moderatorName,
            moderatorSchool: moderatorSchool,
            chairName: chairName,
            chairSchool: chairSchool,
            customName: customName,
            participants: participants,
            isCustomized: true
        });
        
        this.closeEditModal();
        
        // Regenerate the breakdown to show changes
        this.generateDetailedBreakdown(this.currentResults);
        this.updateCustomizationSummary();
        
        // Auto-save changes to current convention
        this.saveToCurrentConvention().catch(error => {
            console.error('Auto-save failed:', error);
        });
    }

    getSessionKey(day, timeSlot, sessionIndex) {
        return `day-${day}-slot-${timeSlot}-session-${sessionIndex}`;
    }

    generateEditableSessionCard(sessionData, sessionKey, sessionColor, sessionIcon, sessionTitle, isDraggable = false, isModifiable = false) {
        // Check for custom session data
        const customSession = this.customSessions.get(sessionKey);
        const displayData = customSession || sessionData;
        
        // Update title and color based on custom data
        let finalTitle = sessionTitle;
        let finalColor = sessionColor;
        
        // First, check for custom session labels (from session labels management)
        if (displayData.type === 'paper') {
            const customLabel = this.getSessionLabel('paper_session', displayData.sessionNumber);
            if (customLabel !== `Paper Session ${displayData.sessionNumber}`) {
                // Use custom label with paper count
                const paperCount = (customSession && customSession.paperCount) || displayData.paperCount || 4;
                finalTitle = `${customLabel} (${paperCount} papers)`;
            } else {
                // Even if no custom label, ensure we show the right paper count
                const paperCount = (customSession && customSession.paperCount) || displayData.paperCount || 4;
                finalTitle = `Paper Session ${displayData.sessionNumber} (${paperCount} papers)`;
            }
        } else if (displayData.type === 'round table') {
            const customLabel = this.getSessionLabel('round_table', displayData.sessionNumber);
            if (customLabel !== `Round Table ${displayData.sessionNumber}`) {
                finalTitle = customLabel;
            }
        }
        
        // Apply session customizations (from individual session editing)
        if (customSession) {
            // Round table custom names from session editing take precedence over session labels
            if (customSession.type === 'round table' && customSession.customName) {
                finalTitle = customSession.customName;
            }
            // Set color to indicate customization
            finalColor = customSession.isCustomized ? 'blue' : sessionColor;
        }
        
        // Add category badge with custom colors
        let categoryBadge = '';
        if (displayData.category) {
            const categoryColor = this.getCategoryColor(displayData.category);
            const badgeColor = `bg-${categoryColor}-100 text-${categoryColor}-800`;
            categoryBadge = `<span class="text-xs px-2 py-1 rounded-full ${badgeColor} ml-2">${displayData.category}</span>`;
        }
        
        // Add custom indicator
        let customIndicator = '';
        if (customSession && customSession.isCustomized) {
            customIndicator = '<i class="fas fa-pencil-alt text-blue-500 text-xs ml-2"></i>';
        }
        
        // Get assigned papers for this session (for paper sessions only)
        let assignedPapersHTML = '';
        if (displayData.type === 'paper' && this.currentResults && this.currentResults.sessionDistribution && this.currentResults.sessionDistribution.sessions) {
            const sessionIndex = displayData.sessionNumber - 1; // sessionNumber is 1-based
            const sessionInfo = this.currentResults.sessionDistribution.sessions[sessionIndex];
            
            if (sessionInfo && sessionInfo.id) {
                const assignedPaperIds = this.paperAssignments.get(sessionInfo.id.toString()) || [];
                const assignedPaperDetails = assignedPaperIds.map(paperId => this.paperDetails.get(paperId)).filter(Boolean);
                
                if (assignedPaperDetails.length > 0) {
                    assignedPapersHTML = `
                        <div class="mt-3 pt-3 border-t border-${finalColor}-200">
                            <div class="text-xs font-medium text-${finalColor}-700 mb-2">
                                <i class="fas fa-file-alt mr-1"></i>
                                Assigned Papers (${assignedPaperDetails.length}):
                            </div>
                            <div class="space-y-1">
                                ${assignedPaperDetails.map(paper => `
                                    <div class="text-xs text-${finalColor}-600 pl-4 border-l-2 border-${finalColor}-300">
                                        <div class="font-medium">"${paper.title}"</div>
                                        <div class="text-gray-500">${paper.student} - ${paper.school}</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    `;
                } else {
                    // Show placeholder for unassigned papers
                    const expectedPaperCount = sessionInfo.paperCount || displayData.paperCount || 4;
                    assignedPapersHTML = `
                        <div class="mt-3 pt-3 border-t border-${finalColor}-200">
                            <div class="text-xs text-gray-500 italic flex items-center">
                                <i class="fas fa-info-circle mr-1"></i>
                                ${expectedPaperCount} papers expected - use "Assign Papers" to assign specific papers
                            </div>
                        </div>
                    `;
                }
            }
        }
        
        // Generate leadership information (moderator and chair)
        let leadershipHTML = '';
        const hasModerator = displayData.moderatorName && displayData.moderatorName.trim();
        const hasChair = displayData.chairName && displayData.chairName.trim();
        
        if (hasModerator || hasChair) {
            leadershipHTML = `
                <div class="mt-3 pt-3 border-t border-${finalColor}-200">
                    <div class="text-xs font-medium text-${finalColor}-700 mb-2">
                        <i class="fas fa-users mr-1"></i>
                        Session Leadership:
                    </div>
                    <div class="space-y-1">
                        ${hasModerator ? `
                            <div class="text-xs text-${finalColor}-600">
                                <span class="font-medium">Moderator:</span> ${displayData.moderatorName}
                                ${displayData.moderatorSchool ? `<span class="text-gray-500"> - ${displayData.moderatorSchool}</span>` : ''}
                            </div>
                        ` : ''}
                        ${hasChair ? `
                            <div class="text-xs text-${finalColor}-600">
                                <span class="font-medium">Chair:</span> ${displayData.chairName}
                                ${displayData.chairSchool ? `<span class="text-gray-500"> - ${displayData.chairSchool}</span>` : ''}
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }

        // Generate participant information for round tables
        let participantsHTML = '';
        if (displayData.type === 'round table' && displayData.participants && displayData.participants.length > 0) {
            const validParticipants = displayData.participants.filter(p => p.name || p.school);
            if (validParticipants.length > 0) {
                participantsHTML = `
                    <div class="mt-3 pt-3 border-t border-${finalColor}-200">
                        <div class="text-xs font-medium text-${finalColor}-700 mb-2">
                            <i class="fas fa-user-friends mr-1"></i>
                            Participants (${validParticipants.length}/7):
                        </div>
                        <div class="space-y-1 max-h-24 overflow-y-auto">
                            ${validParticipants.map(participant => `
                                <div class="text-xs text-${finalColor}-600">
                                    <span class="font-medium">${participant.name || 'No name'}</span>
                                    ${participant.school ? `<span class="text-gray-500"> - ${participant.school}</span>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        }
        
        const isRoundTableClickable = isDraggable && displayData.type === 'round table';
        const roundTableClasses = isRoundTableClickable ? ' round-table-clickable' : '';
        const dataAttributes = isRoundTableClickable ? `data-round-table-id="${displayData.sessionNumber}"` : '';
        
        return `
            <div class="bg-${finalColor}-50 border border-${finalColor}-200 rounded-md p-3 session-editable ${isDraggable ? 'cursor-pointer' : 'cursor-pointer'}${roundTableClasses}" 
                 ${dataAttributes}
                 ${!isDraggable ? `onclick="calculator.openEditModal('${sessionKey}', ${JSON.stringify(sessionData).replace(/"/g, '&quot;')})"` : ''}>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-8 h-8 bg-${finalColor}-500 text-white rounded-full flex items-center justify-center mr-3">
                            <i class="fas fa-${sessionIcon} text-sm"></i>
                        </div>
                        <div>
                            <div class="font-medium text-${finalColor}-800 flex items-center">
                                ${finalTitle}
                                ${categoryBadge}
                                ${customIndicator}
                            </div>
                            <div class="text-sm text-${finalColor}-600">
                                ${displayData.preferredRoom || this.getRoomName(Math.floor(Math.random() * (this.currentResults?.availableRooms || 10)) + 1)}
                                ${displayData.notes ? `• ${displayData.notes}` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="text-xs text-${finalColor}-600 font-medium flex items-center">
                        ${displayData.type ? displayData.type.toUpperCase() : 'SESSION'}
                        ${isModifiable ? `
                            <div class="ml-2 flex items-center space-x-1">
                                <button onclick="event.stopPropagation(); calculator.openEditModal('${sessionKey}', ${JSON.stringify(sessionData).replace(/"/g, '&quot;')})" 
                                        class="text-${finalColor}-500 hover:text-${finalColor}-700 transition-colors" title="Edit session">
                                    <i class="fas fa-edit text-xs"></i>
                                </button>
                                <button onclick="event.stopPropagation(); calculator.removeSessionFromPosition(${sessionData.day}, ${sessionData.timeSlot}, ${sessionData.position}, '${sessionData.type}')" 
                                        class="text-red-500 hover:text-red-700 transition-colors" title="Remove session">
                                    <i class="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        ` : `<i class="fas fa-edit text-xs ml-2 edit-indicator"></i>`}
                    </div>
                </div>
                ${assignedPapersHTML}
                ${leadershipHTML}
                ${participantsHTML}
            </div>
        `;
    }

    updateCustomizationSummary() {
        const summaryDiv = document.getElementById('customizationSummary');
        const countSpan = document.getElementById('customizationCount');
        
        const customSessionCount = this.customSessions.size;
        const customLabelCount = this.customSessionLabels.size;
        const totalCustomizations = customSessionCount + customLabelCount;
        
        if (totalCustomizations > 0) {
            summaryDiv.classList.remove('hidden');
            let summaryText = '';
            if (customSessionCount > 0 && customLabelCount > 0) {
                summaryText = `${customSessionCount} session${customSessionCount > 1 ? 's' : ''} customized, ${customLabelCount} custom name${customLabelCount > 1 ? 's' : ''}`;
            } else if (customSessionCount > 0) {
                summaryText = `${customSessionCount} session${customSessionCount > 1 ? 's' : ''} customized`;
            } else if (customLabelCount > 0) {
                summaryText = `${customLabelCount} custom session name${customLabelCount > 1 ? 's' : ''}`;
            }
            countSpan.textContent = summaryText;
        } else {
            summaryDiv.classList.add('hidden');
        }
    }

    openTimeSlotModal() {
        const data = this.getFormData();
        const totalTimeSlots = data.conventionDays * data.timeSlotsPerDay;
        
        console.log('Opening time slot modal for', totalTimeSlots, 'time slots');
        this.generateTimeSlotInputs(totalTimeSlots, data);
        
        const modal = document.getElementById('timeSlotModal');
        const saveButton = document.getElementById('saveTimeConfig');
        
        console.log('Modal element:', modal);
        console.log('Save button element:', saveButton);
        
        modal.classList.remove('hidden');
    }

    closeTimeSlotModal() {
        document.getElementById('timeSlotModal').classList.add('hidden');
    }

    generateTimeSlotInputs(totalTimeSlots, data) {
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        const inputsContainer = document.getElementById('timeSlotInputs');
        
        let inputsHTML = '';
        
        for (let day = 1; day <= data.conventionDays; day++) {
            // Get time slots for this specific day
            const timeSlotsThisDay = data.timeSlotsPerDayArray ? data.timeSlotsPerDayArray[day - 1] : data.timeSlotsPerDay;
            
            inputsHTML += `
                <div class="mb-4">
                    <h4 class="font-medium text-gray-800 mb-2 flex items-center">
                        <i class="fas fa-calendar-day text-blue-600 mr-2"></i>
                        Day ${day} (${timeSlotsThisDay} slots)
                    </h4>
                    <div class="grid grid-cols-2 gap-3 ml-6">
            `;
            
            // Use per-day slot indexing (A, B, C, D for each day)
            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                const timeSlotId = this.getTimeSlotId(day, slotLabel);
                const existingTime = this.timeSlotSchedule.get(timeSlotId);
                
                inputsHTML += `
                    <div class="flex items-center space-x-2">
                        <label class="text-sm font-medium text-gray-700 w-16">
                            Slot ${slotLabel}:
                        </label>
                        <input type="time" id="time-${timeSlotId}" value="${existingTime || ''}" 
                               class="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm">
                    </div>
                `;
            }
            
            inputsHTML += `
                    </div>
                </div>
            `;
        }
        
        inputsContainer.innerHTML = inputsHTML;
    }

    autoGenerateTimeSlots() {
        const data = this.getFormData();
        const sessionDuration = parseInt(document.getElementById('sessionDuration').value) || 90;
        const breakDuration = parseInt(document.getElementById('breakDuration').value) || 15;
        
        const startTime = new Date();
        startTime.setHours(9, 0, 0, 0); // Start at 9:00 AM
        
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        
        for (let day = 1; day <= data.conventionDays; day++) {
            // Get time slots for this specific day
            const timeSlotsThisDay = data.timeSlotsPerDayArray ? data.timeSlotsPerDayArray[day - 1] : data.timeSlotsPerDay;
            
            // Reset to start time for each day
            let currentTime = new Date(startTime);
            
            // Use per-day slot indexing (A, B, C, D for each day)
            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                const timeSlotId = this.getTimeSlotId(day, slotLabel);
                const timeInput = document.getElementById(`time-${timeSlotId}`);
                
                if (timeInput) {
                    const timeString = currentTime.toTimeString().slice(0, 5); // HH:MM format
                    timeInput.value = timeString;
                }
                
                // Add session duration and break for next slot
                currentTime.setMinutes(currentTime.getMinutes() + sessionDuration + breakDuration);
            }
        }
    }

    saveTimeSlotConfiguration() {
        const data = this.getFormData();
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
        
        // Clear existing schedule
        this.timeSlotSchedule.clear();
        
        for (let day = 1; day <= data.conventionDays; day++) {
            // Get time slots for this specific day
            const timeSlotsThisDay = data.timeSlotsPerDayArray ? data.timeSlotsPerDayArray[day - 1] : data.timeSlotsPerDay;
            
            // Use per-day slot indexing (A, B, C, D for each day)
            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const slotLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                const timeSlotId = this.getTimeSlotId(day, slotLabel);
                const timeInput = document.getElementById(`time-${timeSlotId}`);
                
                if (timeInput && timeInput.value) {
                    this.timeSlotSchedule.set(timeSlotId, timeInput.value);
                }
            }
        }
        
        this.closeTimeSlotModal();
        this.updateTimeSlotPreview();
        
        // Regenerate breakdown to show times
        if (this.currentResults) {
            this.generateDetailedBreakdown(this.currentResults);
        }
    }

    updateTimeSlotPreview() {
        const previewDiv = document.getElementById('timeSlotPreview');
        const scheduleSize = this.timeSlotSchedule.size;
        
        if (scheduleSize > 0) {
            previewDiv.innerHTML = `
                <div class="flex items-center text-green-600">
                    <i class="fas fa-check-circle mr-2"></i>
                    <span>${scheduleSize} time slots configured</span>
                </div>
            `;
        } else {
            previewDiv.innerHTML = `
                <div class="text-yellow-600">
                    Default times will be used until configured.
                </div>
            `;
        }
    }

    formatTimeSlot(day, slotLabel) {
        // Get custom label if available
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        const slotIndex = timeSlotLabels.indexOf(slotLabel);
        const customLabel = this.getTimeSlotLabel(day, slotIndex >= 0 ? slotIndex : 0);
        
        // Create consistent time slot ID format
        const timeSlotId = `day-${day}-slot-${slotLabel}`;
        const scheduledTime = this.timeSlotSchedule.get(timeSlotId);
        
        const displayLabel = customLabel !== slotLabel ? customLabel : `Time Slot ${slotLabel}`;
        
        if (scheduledTime) {
            return `${displayLabel} (${this.formatTime(scheduledTime)})`;
        } else {
            return displayLabel;
        }
    }

    getTimeSlotId(day, slotLabel) {
        return `day-${day}-slot-${slotLabel}`;
    }

    formatTime(timeString) {
        if (!timeString) return '';
        
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        
        return `${displayHour}:${minutes} ${ampm}`;
    }

    initializeCategoryEventListeners() {
        // Category modal controls
        document.getElementById('closeCategoryModal').addEventListener('click', () => {
            this.closeCategoryModal();
        });
        
        document.getElementById('cancelCategoryConfig').addEventListener('click', () => {
            this.closeCategoryModal();
        });
        
        document.getElementById('saveCategoryConfig').addEventListener('click', () => {
            this.saveCategoryConfiguration();
        });
        
        document.getElementById('loadDefaultCategories').addEventListener('click', () => {
            this.loadDefaultCategories();
            this.updateCategoriesList();
        });
        
        document.getElementById('addCategoryBtn').addEventListener('click', () => {
            this.addNewCategory();
        });
        
        // Allow Enter key to add category
        document.getElementById('newCategoryName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.addNewCategory();
            }
        });
        
        // Close modal when clicking overlay
        document.getElementById('categoryModal').addEventListener('click', (e) => {
            if (e.target.id === 'categoryModal') {
                this.closeCategoryModal();
            }
        });
    }

    loadDefaultCategories() {
        // English honor society specific categories with sample paper counts
        const defaultCategories = [
            { name: 'Medieval Literature', color: 'blue', paperCount: 8 },
            { name: 'Renaissance Literature', color: 'green', paperCount: 6 },
            { name: 'Romantic Literature', color: 'purple', paperCount: 10 },
            { name: 'Victorian Literature', color: 'red', paperCount: 7 },
            { name: 'Modern Literature', color: 'indigo', paperCount: 9 },
            { name: 'Contemporary Literature', color: 'pink', paperCount: 12 },
            { name: 'American Literature', color: 'yellow', paperCount: 8 }
        ];

        this.sessionCategories.clear();
        defaultCategories.forEach((category, index) => {
            this.sessionCategories.set(index.toString(), category);
        });

        this.updateCategoryPreview();
        this.updatePaperDistribution();
    }

    openCategoryModal() {
        this.updateCategoriesList();
        this.updatePaperDistribution();
        this.updateTargetPaperCount();
        document.getElementById('categoryModal').classList.remove('hidden');
    }

    closeCategoryModal() {
        document.getElementById('categoryModal').classList.add('hidden');
        // Clear the inputs
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryPapers').value = '';
        document.getElementById('newCategoryColor').value = 'blue';
    }

    addNewCategory() {
        const nameInput = document.getElementById('newCategoryName');
        const paperInput = document.getElementById('newCategoryPapers');
        const colorSelect = document.getElementById('newCategoryColor');
        
        const name = nameInput.value.trim();
        const paperCount = parseInt(paperInput.value) || 0;
        const color = colorSelect.value;
        
        if (!name) {
            alert('Please enter a category name.');
            return;
        }

        // Check for duplicates
        const existingNames = Array.from(this.sessionCategories.values()).map(cat => cat.name.toLowerCase());
        if (existingNames.includes(name.toLowerCase())) {
            alert('This category already exists.');
            return;
        }

        // Add new category
        const newId = Date.now().toString();
        this.sessionCategories.set(newId, { name, color, paperCount });

        // Clear inputs
        nameInput.value = '';
        paperInput.value = '';
        colorSelect.value = 'blue';

        // Update displays
        this.updateCategoriesList();
        this.updateCategoryPreview();
        this.updatePaperDistribution();
    }

    updateCategoriesList() {
        const listContainer = document.getElementById('categoriesList');
        
        if (this.sessionCategories.size === 0) {
            listContainer.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-tags text-2xl mb-2"></i>
                    <p>No categories defined. Click "Load English Defaults" or add your own.</p>
                </div>
            `;
            return;
        }

        let listHTML = '';
        this.sessionCategories.forEach((category, id) => {
            const colorClasses = {
                'blue': 'bg-blue-100 text-blue-800 border-blue-200',
                'green': 'bg-green-100 text-green-800 border-green-200',
                'purple': 'bg-purple-100 text-purple-800 border-purple-200',
                'red': 'bg-red-100 text-red-800 border-red-200',
                'yellow': 'bg-yellow-100 text-yellow-800 border-yellow-200',
                'indigo': 'bg-indigo-100 text-indigo-800 border-indigo-200',
                'pink': 'bg-pink-100 text-pink-800 border-pink-200',
                'gray': 'bg-gray-100 text-gray-800 border-gray-200'
            };

            listHTML += `
                <div class="flex items-center justify-between p-3 border rounded-md ${colorClasses[category.color] || colorClasses['gray']}">
                    <div class="flex items-center">
                        <div class="w-4 h-4 rounded-full bg-${category.color}-500 mr-3"></div>
                        <div>
                            <span class="font-medium">${category.name}</span>
                            <div class="text-xs text-gray-600">${category.paperCount || 0} papers</div>
                        </div>
                    </div>
                    <button onclick="calculator.removeCategory('${id}')" class="text-red-600 hover:text-red-800 p-1">
                        <i class="fas fa-trash text-sm"></i>
                    </button>
                </div>
            `;
        
        });

        listContainer.innerHTML = listHTML;
    }

    removeCategory(categoryId) {
        if (confirm('Are you sure you want to remove this category?')) {
            this.sessionCategories.delete(categoryId);
            this.updateCategoriesList();
            this.updateCategoryPreview();
            this.updatePaperDistribution();
        }
    }

    saveCategoryConfiguration() {
        this.closeCategoryModal();
        this.updateCategoryPreview();
        this.updateSessionCategoryOptions();
    }

    updateCategoryPreview() {
        const previewDiv = document.getElementById('categoryPreview').querySelector('.flex');
        
        if (this.sessionCategories.size === 0) {
            previewDiv.innerHTML = '<span class="text-purple-600">No categories defined</span>';
            return;
        }

        let previewHTML = '';
        let count = 0;
        const maxDisplay = 5;

        this.sessionCategories.forEach((category) => {
            if (count < maxDisplay) {
                const paperCount = category.paperCount || 0;
                previewHTML += `<span class="px-2 py-1 bg-${category.color}-100 text-${category.color}-800 rounded-full text-xs">${category.name} (${paperCount})</span>`;
                count++;
            }
        });

        if (this.sessionCategories.size > maxDisplay) {
            previewHTML += `<span class="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">+${this.sessionCategories.size - maxDisplay} more</span>`;
        }

        previewDiv.innerHTML = previewHTML;
    }

    updateSessionCategoryOptions() {
        const categorySelect = document.getElementById('editCategorySelect');
        
        // Clear existing options
        categorySelect.innerHTML = '';
        
        // Add custom categories
        this.sessionCategories.forEach((category) => {
            const option = document.createElement('option');
            option.value = category.name;
            option.textContent = category.name;
            categorySelect.appendChild(option);
        });
        
        // Add custom option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Custom Category...';
        categorySelect.appendChild(customOption);
    }

    getCategoryColor(categoryName) {
        const category = Array.from(this.sessionCategories.values()).find(cat => cat.name === categoryName);
        return category ? category.color : 'gray';
    }

    updatePaperDistribution() {
        const distributionContainer = document.getElementById('paperDistributionList');
        
        if (this.sessionCategories.size === 0) {
            distributionContainer.innerHTML = `
                <div class="text-center py-4 text-gray-500">
                    <p class="text-sm">No categories defined.</p>
                </div>
            `;
            this.updateTotalAssignedPapers();
            return;
        }

        let distributionHTML = '';
        this.sessionCategories.forEach((category, id) => {
            const colorClasses = {
                'blue': 'bg-blue-50 border-blue-200',
                'green': 'bg-green-50 border-green-200',
                'purple': 'bg-purple-50 border-purple-200',
                'red': 'bg-red-50 border-red-200',
                'yellow': 'bg-yellow-50 border-yellow-200',
                'indigo': 'bg-indigo-50 border-indigo-200',
                'pink': 'bg-pink-50 border-pink-200',
                'gray': 'bg-gray-50 border-gray-200'
            };

            distributionHTML += `
                <div class="flex items-center justify-between p-3 border rounded-md ${colorClasses[category.color] || colorClasses['gray']}">
                    <div class="flex items-center">
                        <div class="w-4 h-4 rounded-full bg-${category.color}-500 mr-3"></div>
                        <span class="font-medium text-gray-800">${category.name}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                        <input type="number" 
                               value="${category.paperCount || 0}" 
                               min="0" max="1000"
                               onchange="calculator.updateCategoryPaperCount('${id}', this.value)"
                               class="w-16 px-2 py-1 border border-gray-300 rounded text-sm text-center focus:outline-none focus:ring-1 focus:ring-${category.color}-500">
                        <span class="text-sm text-gray-600">papers</span>
                    </div>
                </div>
            `;
        });

        distributionContainer.innerHTML = distributionHTML;
        this.updateTotalAssignedPapers();
    }

    updateCategoryPaperCount(categoryId, newCount) {
        const category = this.sessionCategories.get(categoryId);
        if (category) {
            category.paperCount = parseInt(newCount) || 0;
            this.updateTotalAssignedPapers();
            this.updateCategoryPreview();
        }
    }

    updateTotalAssignedPapers() {
        const totalElement = document.getElementById('totalAssignedPapers');
        let total = 0;
        
        this.sessionCategories.forEach((category) => {
            total += category.paperCount || 0;
        });
        
        if (totalElement) {
            totalElement.textContent = total;
            
            // Color code based on target
            const targetElement = document.getElementById('targetTotalPapers');
            const target = parseInt(targetElement?.textContent) || 0;
            
            if (total === target) {
                totalElement.className = 'text-lg font-bold text-green-600';
            } else if (total > target) {
                totalElement.className = 'text-lg font-bold text-red-600';
            } else {
                totalElement.className = 'text-lg font-bold text-yellow-600';
            }
        }
    }

    updateTargetPaperCount() {
        const targetElement = document.getElementById('targetTotalPapers');
        const formData = this.getFormData();
        if (targetElement) {
            targetElement.textContent = formData.totalPapers;
        }
    }

    generateCategoryBasedSessions() {
        const data = this.getFormData();
        
        if (this.sessionCategories.size === 0) {
            // Fall back to original method if no categories defined
            return this.calculateOptimalSessionDistribution(data);
        }

        // Check if categories have been actually customized with real paper distribution
        const totalCategoryPapers = Array.from(this.sessionCategories.values())
            .reduce((sum, cat) => sum + (cat.paperCount || 0), 0);
        
        // If total category papers don't match form input, use form-based calculation
        if (totalCategoryPapers !== data.totalPapers) {
            return this.calculateOptimalSessionDistribution(data);
        }

        const sessions = [];
        let sessionId = 1;
        
        // Get categories with papers
        const categoriesWithPapers = Array.from(this.sessionCategories.values())
            .filter(cat => (cat.paperCount || 0) > 0)
            .sort((a, b) => (b.paperCount || 0) - (a.paperCount || 0)); // Sort by paper count desc

        for (const category of categoriesWithPapers) {
            let remainingPapers = category.paperCount || 0;
            
            while (remainingPapers > 0) {
                // Calculate optimal session size for this category
                const minPapers = Math.min(data.minPapersPerSession, remainingPapers);
                const maxPapers = Math.min(data.maxPapersPerSession, remainingPapers);
                
                let papersInSession;
                
                if (remainingPapers <= maxPapers) {
                    // Last session for this category
                    if (remainingPapers >= minPapers) {
                        papersInSession = remainingPapers;
                    } else if (sessions.length > 0) {
                        // Try to merge with last session if possible
                        const lastSession = sessions[sessions.length - 1];
                        if (lastSession.category === category.name && 
                            lastSession.paperCount + remainingPapers <= maxPapers) {
                            lastSession.paperCount += remainingPapers;
                            lastSession.title = `Paper Session ${lastSession.id} (${lastSession.paperCount} papers) - ${category.name}`;
                            break;
                        } else {
                            papersInSession = remainingPapers;
                        }
                    } else {
                        papersInSession = remainingPapers;
                    }
                } else {
                    // Calculate optimal size for remaining papers
                    const avgSessionSize = (minPapers + maxPapers) / 2;
                    const estimatedSessions = Math.ceil(remainingPapers / avgSessionSize);
                    papersInSession = Math.max(minPapers, 
                        Math.min(maxPapers, Math.ceil(remainingPapers / estimatedSessions)));
                }

                sessions.push({
                    id: sessionId,
                    paperCount: papersInSession,
                    title: `Paper Session ${sessionId} (${papersInSession} papers) - ${category.name}`,
                    type: 'paper',
                    category: category.name,
                    categoryColor: category.color
                });

                remainingPapers -= papersInSession;
                sessionId++;
            }
        }

        const finalSessions = this.assignPapersToSessions(sessions);
        
        return {
            sessions: finalSessions,
            totalPapers: finalSessions.reduce((sum, s) => sum + s.paperCount, 0),
            sessionStats: this.calculateCategorySessionStats(finalSessions, data)
        };
    }

    calculateCategorySessionStats(sessions, data) {
        const stats = {
            byCategory: {},
            avgPapersPerSession: sessions.length > 0 ? (sessions.reduce((sum, s) => sum + s.paperCount, 0) / sessions.length).toFixed(1) : 0,
            minActual: sessions.length > 0 ? Math.min(...sessions.map(s => s.paperCount)) : 0,
            maxActual: sessions.length > 0 ? Math.max(...sessions.map(s => s.paperCount)) : 0,
            totalSessions: sessions.length
        };

        // Calculate stats by category
        sessions.forEach(session => {
            if (!stats.byCategory[session.category]) {
                stats.byCategory[session.category] = {
                    sessions: 0,
                    papers: 0
                };
            }
            stats.byCategory[session.category].sessions++;
            stats.byCategory[session.category].papers += session.paperCount;
        });

        return stats;
    }

    initializePaperEventListeners() {
        // Paper modal controls
        document.getElementById('closePaperModal').addEventListener('click', () => {
            this.closePaperModal();
        });
        
        document.getElementById('cancelPaperConfig').addEventListener('click', () => {
            this.closePaperModal();
        });
        
        document.getElementById('savePaperConfig').addEventListener('click', () => {
            this.savePaperConfiguration();
        });
        
        document.getElementById('addPaperBtn').addEventListener('click', () => {
            this.addNewPaper();
        });

        document.getElementById('importPapersBtn').addEventListener('click', () => {
            document.getElementById('csvFileInput').click();
        });

        document.getElementById('exportPapersBtn').addEventListener('click', () => {
            this.exportPapersToCSV();
        });

        document.getElementById('csvFileInput').addEventListener('change', (e) => {
            this.importPapersFromCSV(e.target.files[0]);
        });
        
        // Allow Enter key to add paper
        ['newPaperTitle', 'newStudentName', 'newSchoolName'].forEach(id => {
            document.getElementById(id).addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.addNewPaper();
                }
            });
        });
        
        // Close modal when clicking overlay
        document.getElementById('paperModal').addEventListener('click', (e) => {
            if (e.target.id === 'paperModal') {
                this.closePaperModal();
            }
        });
    }

    openPaperModal() {
        this.updatePaperCategoryOptions();
        this.updatePapersByCategory();
        this.updatePaperCount();
        document.getElementById('paperModal').classList.remove('hidden');
    }

    closePaperModal() {
        document.getElementById('paperModal').classList.add('hidden');
        // Clear inputs
        document.getElementById('newPaperTitle').value = '';
        document.getElementById('newStudentName').value = '';
        document.getElementById('newSchoolName').value = '';
    }

    updatePaperCategoryOptions() {
        const categorySelect = document.getElementById('newPaperCategory');
        categorySelect.innerHTML = '';
        
        if (this.sessionCategories.size === 0) {
            const option = document.createElement('option');
            option.value = 'General';
            option.textContent = 'General';
            categorySelect.appendChild(option);
        } else {
            this.sessionCategories.forEach((category) => {
                const option = document.createElement('option');
                option.value = category.name;
                option.textContent = category.name;
                categorySelect.appendChild(option);
            });
        }
    }

    addNewPaper() {
        const titleInput = document.getElementById('newPaperTitle');
        const studentInput = document.getElementById('newStudentName');
        const schoolInput = document.getElementById('newSchoolName');
        const categorySelect = document.getElementById('newPaperCategory');
        
        const title = titleInput.value.trim();
        const student = studentInput.value.trim();
        const school = schoolInput.value.trim();
        const category = categorySelect.value;
        
        if (!title || !student || !school) {
            alert('Please fill in all fields (title, student name, and school).');
            return;
        }

        const paperId = Date.now().toString();
        this.paperDetails.set(paperId, {
            title,
            student,
            school,
            category,
            id: paperId
        });

        // Clear inputs
        titleInput.value = '';
        studentInput.value = '';
        schoolInput.value = '';

        // Update displays
        this.updatePapersByCategory();
        this.updatePaperCount();
        this.updatePaperPreview();
    }

    removePaper(paperId) {
        if (confirm('Are you sure you want to remove this paper?')) {
            this.paperDetails.delete(paperId);
            this.updatePapersByCategory();
            this.updatePaperCount();
            this.updatePaperPreview();
        }
    }

    updatePapersByCategory() {
        const container = document.getElementById('papersByCategory');
        
        if (this.paperDetails.size === 0) {
            container.innerHTML = `
                <div class="text-center py-6 text-gray-500">
                    <i class="fas fa-file-alt text-2xl mb-2"></i>
                    <p>No papers added yet. Use the form above to add papers.</p>
                </div>
            `;
            return;
        }

        // Group papers by category
        const papersByCategory = {};
        this.paperDetails.forEach((paper) => {
            if (!papersByCategory[paper.category]) {
                papersByCategory[paper.category] = [];
            }
            papersByCategory[paper.category].push(paper);
        });

        let categoryHTML = '';
        Object.keys(papersByCategory).sort().forEach(categoryName => {
            const papers = papersByCategory[categoryName];
            const categoryInfo = Array.from(this.sessionCategories.values()).find(cat => cat.name === categoryName);
            const categoryColor = categoryInfo ? categoryInfo.color : 'gray';
            
            categoryHTML += `
                <div class="border border-${categoryColor}-200 rounded-lg overflow-hidden">
                    <div class="bg-${categoryColor}-50 px-4 py-3 border-b border-${categoryColor}-200">
                        <div class="flex items-center justify-between">
                            <h4 class="font-medium text-${categoryColor}-800 flex items-center">
                                <div class="w-3 h-3 rounded-full bg-${categoryColor}-500 mr-2"></div>
                                ${categoryName}
                            </h4>
                            <span class="text-sm text-${categoryColor}-600">${papers.length} paper${papers.length !== 1 ? 's' : ''}</span>
                        </div>
                    </div>
                    <div class="p-4 space-y-3">
            `;

            papers.forEach((paper, index) => {
                categoryHTML += `
                    <div class="flex items-start justify-between p-3 bg-white border border-gray-200 rounded-md">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900 mb-1">${paper.title}</div>
                            <div class="text-sm text-gray-600">
                                <div><i class="fas fa-user text-${categoryColor}-500 mr-1"></i> ${paper.student}</div>
                                <div><i class="fas fa-university text-${categoryColor}-500 mr-1"></i> ${paper.school}</div>
                            </div>
                        </div>
                        <div class="flex items-center space-x-2 ml-4">
                            <button onclick="calculator.editPaper('${paper.id}')" class="text-blue-600 hover:text-blue-800 p-1">
                                <i class="fas fa-edit text-sm"></i>
                            </button>
                            <button onclick="calculator.removePaper('${paper.id}')" class="text-red-600 hover:text-red-800 p-1">
                                <i class="fas fa-trash text-sm"></i>
                            </button>
                        </div>
                    </div>
                `;
            });

            categoryHTML += `
                    </div>
                </div>
            `;
        });

        container.innerHTML = categoryHTML;
    }

    editPaper(paperId) {
        const paper = this.paperDetails.get(paperId);
        if (!paper) return;

        const newTitle = prompt('Paper Title:', paper.title);
        if (newTitle === null) return;

        const newStudent = prompt('Student Name:', paper.student);
        if (newStudent === null) return;

        const newSchool = prompt('School/University:', paper.school);
        if (newSchool === null) return;

        if (newTitle.trim() && newStudent.trim() && newSchool.trim()) {
            paper.title = newTitle.trim();
            paper.student = newStudent.trim();
            paper.school = newSchool.trim();

            this.updatePapersByCategory();
            this.updatePaperPreview();
        }
    }

    updatePaperCount() {
        const countElement = document.getElementById('totalPapersCount');
        if (countElement) {
            countElement.textContent = this.paperDetails.size;
        }
    }

    savePaperConfiguration() {
        this.closePaperModal();
        this.updatePaperPreview();
    }

    updatePaperPreview() {
        const summaryDiv = document.getElementById('paperSummary');
        
        if (this.paperDetails.size === 0) {
            summaryDiv.innerHTML = 'No specific papers defined yet.';
            return;
        }

        const papersByCategory = {};
        this.paperDetails.forEach((paper) => {
            if (!papersByCategory[paper.category]) {
                papersByCategory[paper.category] = 0;
            }
            papersByCategory[paper.category]++;
        });

        let summaryHTML = `${this.paperDetails.size} papers defined: `;
        const categorySummaries = Object.keys(papersByCategory).map(cat => 
            `${cat} (${papersByCategory[cat]})`
        );
        
        summaryHTML += categorySummaries.join(', ');
        summaryDiv.innerHTML = summaryHTML;
    }

    exportPapersToCSV() {
        if (this.paperDetails.size === 0) {
            alert('No papers to export.');
            return;
        }

        const csvContent = 'Title,Student,School,Category\n' + 
            Array.from(this.paperDetails.values())
                .map(paper => `"${paper.title}","${paper.student}","${paper.school}","${paper.category}"`)
                .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convention_papers_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
    }

    async importPapersFromCSV(file) {
        if (!file) return;

        const text = await file.text();
        const lines = text.split('\n').filter(line => line.trim());
        
        if (lines.length < 2) {
            alert('CSV file must have at least a header row and one data row.');
            return;
        }

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
        const requiredHeaders = ['title', 'student', 'school'];
        
        const missing = requiredHeaders.filter(h => !headers.includes(h));
        if (missing.length > 0) {
            alert(`CSV file must include these columns: ${missing.join(', ')}`);
            return;
        }

        let imported = 0;
        const titleIndex = headers.indexOf('title');
        const studentIndex = headers.indexOf('student');
        const schoolIndex = headers.indexOf('school');
        const categoryIndex = headers.indexOf('category');

        for (let i = 1; i < lines.length; i++) {
            const values = this.parseCSVLine(lines[i]);
            
            if (values.length >= 3) {
                const title = values[titleIndex]?.replace(/"/g, '').trim();
                const student = values[studentIndex]?.replace(/"/g, '').trim();
                const school = values[schoolIndex]?.replace(/"/g, '').trim();
                const category = categoryIndex >= 0 ? 
                    (values[categoryIndex]?.replace(/"/g, '').trim() || 'General') : 'General';

                if (title && student && school) {
                    const paperId = `import_${Date.now()}_${i}`;
                    this.paperDetails.set(paperId, {
                        title,
                        student,
                        school,
                        category,
                        id: paperId
                    });
                    imported++;
                }
            }
        }

        alert(`Successfully imported ${imported} papers.`);
        this.updatePapersByCategory();
        this.updatePaperCount();
        this.updatePaperPreview();
        
        // Clear the file input
        document.getElementById('csvFileInput').value = '';
    }

    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    }

    getPapersForCategory(categoryName) {
        return Array.from(this.paperDetails.values()).filter(paper => paper.category === categoryName);
    }

    assignPapersToSessions(sessions) {
        if (this.paperDetails.size === 0) {
            return sessions; // No specific papers to assign
        }

        const updatedSessions = sessions.map(session => {
            const categoryPapers = this.getPapersForCategory(session.category);
            
            if (categoryPapers.length > 0) {
                // Assign specific papers to this session
                const assignedPapers = categoryPapers.splice(0, session.paperCount);
                return {
                    ...session,
                    papers: assignedPapers,
                    hasSpecificPapers: true
                };
            }
            
            return session;
        });

        return updatedSessions;
    }

    updateSessionPaperDetails(sessionData) {
        const paperDetailsDiv = document.getElementById('sessionPaperDetails');
        const papersList = document.getElementById('sessionPapersList');
        
        // Find the session in current results to get paper details
        if (this.currentResults && this.currentResults.sessionDistribution) {
            const sessionInfo = this.currentResults.sessionDistribution.sessions.find(s => 
                s.id === sessionData.sessionNumber && s.type === sessionData.type
            );
            
            if (sessionInfo && sessionInfo.papers && sessionInfo.papers.length > 0) {
                let papersHTML = '';
                sessionInfo.papers.forEach((paper, index) => {
                    papersHTML += `
                        <div class="flex items-start justify-between py-2 ${index > 0 ? 'border-t border-gray-200' : ''}">
                            <div class="flex-1">
                                <div class="font-medium text-sm text-gray-900">${paper.title}</div>
                                <div class="text-xs text-gray-600 mt-1">
                                    <span class="mr-3"><i class="fas fa-user mr-1"></i>${paper.student}</span>
                                    <span><i class="fas fa-university mr-1"></i>${paper.school}</span>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                papersList.innerHTML = papersHTML;
                paperDetailsDiv.classList.remove('hidden');
            } else {
                paperDetailsDiv.classList.add('hidden');
            }
        } else {
            paperDetailsDiv.classList.add('hidden');
        }
    }

    initializePaperAssignmentEventListeners() {
        // Paper assignment modal controls
        document.getElementById('closePaperAssignmentModal').addEventListener('click', () => {
            this.closePaperAssignmentModal();
        });
        
        document.getElementById('cancelPaperAssignment').addEventListener('click', () => {
            this.closePaperAssignmentModal();
        });
        
        document.getElementById('savePaperAssignments').addEventListener('click', () => {
            this.savePaperAssignments();
        });

        document.getElementById('autoAssignPapers').addEventListener('click', () => {
            this.autoAssignPapers();
        });

        document.getElementById('clearAllAssignments').addEventListener('click', () => {
            this.clearAllAssignments();
        });

        document.getElementById('filterByCategory').addEventListener('change', () => {
            this.updateAvailablePapersList();
        });
        
        // Close modal when clicking overlay
        document.getElementById('paperAssignmentModal').addEventListener('click', (e) => {
            if (e.target.id === 'paperAssignmentModal') {
                this.closePaperAssignmentModal();
            }
        });

        // Prevent scroll events from bubbling to the background
        document.getElementById('paperAssignmentModal').addEventListener('wheel', (e) => {
            e.stopPropagation();
        }, { passive: false });

        document.getElementById('paperAssignmentModal').addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: false });
    }

    openPaperAssignmentModal() {
        if (this.paperDetails.size === 0) {
            alert('Please add some papers first using the "Manage Papers" button.');
            return;
        }

        if (!this.currentResults || !this.currentResults.sessionDistribution) {
            alert('Please calculate the schedule first to see available sessions.');
            return;
        }

        // Prevent background scrolling
        document.body.classList.add('modal-open');
        
        this.updateCategoryFilter();
        this.updateAvailablePapersList();
        this.updateSessionsList();
        this.updateAssignmentCounts();
        document.getElementById('paperAssignmentModal').classList.remove('hidden');
        
        // Focus on the modal to ensure it captures scroll events
        setTimeout(() => {
            const modal = document.getElementById('paperAssignmentModal');
            if (modal) {
                modal.focus();
            }
        }, 100);
    }

    closePaperAssignmentModal() {
        document.getElementById('paperAssignmentModal').classList.add('hidden');
        // Restore background scrolling
        document.body.classList.remove('modal-open');
    }

    updateCategoryFilter() {
        const filterSelect = document.getElementById('filterByCategory');
        filterSelect.innerHTML = '<option value="">All Categories</option>';
        
        const categories = new Set();
        this.paperDetails.forEach(paper => categories.add(paper.category));
        
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            filterSelect.appendChild(option);
        });
    }

    updateAvailablePapersList() {
        const container = document.getElementById('availablePapersList');
        const filterValue = document.getElementById('filterByCategory').value;
        
        // Get unassigned papers
        const unassignedPapers = Array.from(this.paperDetails.values()).filter(paper => {
            const isAssigned = Array.from(this.paperAssignments.values()).some(assignments => 
                assignments.includes(paper.id));
            const matchesFilter = !filterValue || paper.category === filterValue;
            return !isAssigned && matchesFilter;
        });

        if (unassignedPapers.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-check-circle text-3xl mb-2"></i>
                    <p>All papers are assigned!</p>
                </div>
            `;
        } else {
            let papersHTML = '';
            unassignedPapers.forEach(paper => {
                const categoryColor = this.getCategoryColor(paper.category);
                papersHTML += `
                    <div class="paper-item bg-white border border-gray-200 rounded-md p-3 mb-2 cursor-move hover:shadow-md transition-shadow"
                         draggable="true" 
                         data-paper-id="${paper.id}"
                         ondragstart="calculator.handlePaperDragStart(event)"
                         ondragend="calculator.handlePaperDragEnd(event)">
                        <div class="flex items-start justify-between">
                            <div class="flex-1">
                                <div class="flex items-center mb-1">
                                    <div class="w-3 h-3 rounded-full bg-${categoryColor}-500 mr-2"></div>
                                    <div class="font-medium text-sm text-gray-900 line-clamp-2">${paper.title}</div>
                                </div>
                                <div class="text-xs text-gray-600">
                                    <div><i class="fas fa-user mr-1"></i>${paper.student}</div>
                                    <div><i class="fas fa-university mr-1"></i>${paper.school}</div>
                                    <div><i class="fas fa-tag mr-1"></i>${paper.category}</div>
                                </div>
                            </div>
                            <div class="ml-2">
                                <i class="fas fa-grip-vertical text-gray-400"></i>
                            </div>
                        </div>
                    </div>
                `;
            });
            container.innerHTML = papersHTML;
        }

        // Update count
        document.getElementById('availablePapersCount').textContent = `${unassignedPapers.length} papers`;
    }

    updateSessionsList() {
        const container = document.getElementById('sessionsList');
        
        if (!this.currentResults || !this.currentResults.sessionDistribution.sessions) {
            container.innerHTML = '<div class="text-center py-8 text-gray-500">No sessions available</div>';
            return;
        }

        const paperSessions = this.currentResults.sessionDistribution.sessions.filter(s => s.type === 'paper');
        
        let sessionsHTML = '';
        paperSessions.forEach(session => {
            const assignedPapers = this.paperAssignments.get(session.id.toString()) || [];
            const assignedPaperDetails = assignedPapers.map(paperId => this.paperDetails.get(paperId)).filter(Boolean);
            
            const categoryColor = this.getCategoryColor(session.category);
            const sessionCapacity = session.paperCount;
            const remainingSlots = sessionCapacity - assignedPaperDetails.length;

            sessionsHTML += `
                <div class="session-dropzone bg-white border-2 border-dashed border-${categoryColor}-200 rounded-lg p-4 mb-4 min-h-24"
                     data-session-id="${session.id}"
                     ondrop="calculator.handlePaperDrop(event)"
                     ondragover="calculator.handleDragOver(event)"
                     ondragenter="calculator.handleDragEnter(event)"
                     ondragleave="calculator.handleDragLeave(event)">
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center">
                            <div class="w-4 h-4 rounded-full bg-${categoryColor}-500 mr-2"></div>
                            <h5 class="font-medium text-gray-800">${session.title}</h5>
                        </div>
                        <div class="text-sm text-gray-600">
                            ${assignedPaperDetails.length}/${sessionCapacity} papers
                        </div>
                    </div>
                    
                    <div class="space-y-2">
                        ${assignedPaperDetails.map(paper => `
                            <div class="flex items-start justify-between bg-${categoryColor}-50 border border-${categoryColor}-200 rounded p-2">
                                <div class="flex-1">
                                    <div class="font-medium text-xs text-gray-900">${paper.title}</div>
                                    <div class="text-xs text-gray-600">${paper.student} - ${paper.school}</div>
                                </div>
                                <button onclick="calculator.removePaperFromSession('${session.id}', '${paper.id}')" 
                                        class="text-red-500 hover:text-red-700 ml-2">
                                    <i class="fas fa-times text-xs"></i>
                                </button>
                            </div>
                        `).join('')}
                        
                        ${remainingSlots > 0 ? `
                            <div class="text-center py-2 text-sm text-gray-500 border-2 border-dashed border-gray-300 rounded">
                                <i class="fas fa-plus mr-1"></i>
                                Drop papers here (${remainingSlots} slot${remainingSlots !== 1 ? 's' : ''} remaining)
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        container.innerHTML = sessionsHTML;
        document.getElementById('totalSessionsCount').textContent = `${paperSessions.length} sessions`;
    }

    handlePaperDragStart(event) {
        event.dataTransfer.setData('text/plain', event.target.dataset.paperId);
        event.target.style.opacity = '0.5';
        
        // Add visual feedback to all drop zones
        const dropZones = document.querySelectorAll('.session-dropzone');
        dropZones.forEach(zone => {
            zone.classList.add('drag-active');
            zone.style.borderColor = '#3b82f6';
            zone.style.backgroundColor = '#eff6ff';
        });
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDragEnter(event) {
        event.preventDefault();
        const dropZone = event.target.closest('.session-dropzone');
        if (dropZone) {
            dropZone.classList.add('drag-over');
        }
    }

    handleDragLeave(event) {
        const dropZone = event.target.closest('.session-dropzone');
        if (dropZone && !dropZone.contains(event.relatedTarget)) {
            dropZone.classList.remove('drag-over');
        }
    }

    handlePaperDrop(event) {
        event.preventDefault();
        const paperId = event.dataTransfer.getData('text/plain');
        const dropZone = event.target.closest('.session-dropzone');
        
        if (dropZone) {
            const sessionId = dropZone.dataset.sessionId;
            this.assignPaperToSession(paperId, sessionId);
        }
        
        // Reset all styles
        this.resetDragStyles();
        if (dropZone) {
            dropZone.classList.remove('drag-over');
        }
        const draggedElement = document.querySelector(`[data-paper-id="${paperId}"]`);
        if (draggedElement) {
            draggedElement.style.opacity = '1';
        }
    }

    resetDragStyles() {
        const dropZones = document.querySelectorAll('.session-dropzone');
        dropZones.forEach(zone => {
            zone.classList.remove('drag-active');
            zone.style.borderColor = '';
            zone.style.backgroundColor = '';
        });
    }

    handlePaperDragEnd(event) {
        // Clean up all drag styles regardless of whether drop was successful
        event.target.style.opacity = '1';
        this.resetDragStyles();
    }



    assignPaperToSession(paperId, sessionId) {
        // Check if session has capacity
        const session = this.currentResults.sessionDistribution.sessions.find(s => s.id.toString() === sessionId);
        if (!session) return false;

        const currentAssignments = this.paperAssignments.get(sessionId) || [];
        if (currentAssignments.length >= session.paperCount) {
            alert('This session is already full!');
            return false;
        }

        // Remove paper from any other session
        this.paperAssignments.forEach((assignments, sId) => {
            const index = assignments.indexOf(paperId);
            if (index > -1) {
                assignments.splice(index, 1);
            }
        });

        // Add to new session
        if (!this.paperAssignments.has(sessionId)) {
            this.paperAssignments.set(sessionId, []);
        }
        this.paperAssignments.get(sessionId).push(paperId);

        // Update displays
        this.updateAvailablePapersList();
        this.updateSessionsList();
        this.updateAssignmentCounts();
        
        return true;
    }

    removePaperFromSession(sessionId, paperId) {
        const assignments = this.paperAssignments.get(sessionId);
        if (assignments) {
            const index = assignments.indexOf(paperId);
            if (index > -1) {
                assignments.splice(index, 1);
                this.updateAvailablePapersList();
                this.updateSessionsList();
                this.updateAssignmentCounts();
            }
        }
    }

    autoAssignPapers() {
        if (confirm('This will automatically assign papers to sessions based on categories. Continue?')) {
            // Clear existing assignments
            this.paperAssignments.clear();
            
            // Get available sessions
            const paperSessions = this.currentResults.sessionDistribution.sessions.filter(s => s.type === 'paper');
            
            // Group papers by category
            const papersByCategory = {};
            this.paperDetails.forEach(paper => {
                if (!papersByCategory[paper.category]) {
                    papersByCategory[paper.category] = [];
                }
                papersByCategory[paper.category].push(paper.id);
            });

            // Assign papers to matching sessions
            paperSessions.forEach(session => {
                const categoryPapers = papersByCategory[session.category] || [];
                const papersToAssign = categoryPapers.splice(0, session.paperCount);
                
                if (papersToAssign.length > 0) {
                    this.paperAssignments.set(session.id.toString(), papersToAssign);
                }
            });

            this.updateAvailablePapersList();
            this.updateSessionsList();
            this.updateAssignmentCounts();
        }
    }

    clearAllAssignments() {
        if (confirm('This will remove all paper assignments. Continue?')) {
            this.paperAssignments.clear();
            this.updateAvailablePapersList();
            this.updateSessionsList();
            this.updateAssignmentCounts();
        }
    }

    updateAssignmentCounts() {
        let totalAssigned = 0;
        this.paperAssignments.forEach(assignments => {
            totalAssigned += assignments.length;
        });
        
        document.getElementById('assignedPapersCount').textContent = totalAssigned;
    }

    savePaperAssignments() {
        // Apply assignments to session distribution
        if (this.currentResults && this.currentResults.sessionDistribution) {
            this.currentResults.sessionDistribution.sessions.forEach(session => {
                if (session.type === 'paper') {
                    const assignedPaperIds = this.paperAssignments.get(session.id.toString()) || [];
                    session.papers = assignedPaperIds.map(id => this.paperDetails.get(id)).filter(Boolean);
                    session.hasSpecificPapers = session.papers.length > 0;
                }
            });
        }

        this.closePaperAssignmentModal();
        
        // Regenerate the breakdown to show updated assignments
        this.generateDetailedBreakdown(this.currentResults);
        
        alert('Paper assignments saved successfully!');
    }

    // Room Management Functions
    initializeRoomManagementEventListeners() {
        document.getElementById('manageRoomsBtn').addEventListener('click', () => {
            this.openRoomModal();
        });

        document.getElementById('closeRoomModal').addEventListener('click', () => {
            this.closeRoomModal();
        });

        document.getElementById('cancelRoomEdit').addEventListener('click', () => {
            this.closeRoomModal();
        });

        document.getElementById('saveRoomNames').addEventListener('click', () => {
            this.saveRoomNames();
        });

        document.getElementById('resetRoomNames').addEventListener('click', () => {
            this.resetRoomNames();
        });
    }

    openRoomModal() {
        this.generateRoomNameInputs();
        document.getElementById('roomModal').classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeRoomModal() {
        document.getElementById('roomModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
    }

    generateRoomNameInputs() {
        const data = this.getFormData();
        const container = document.getElementById('roomNamesContainer');
        let inputsHTML = '';

        for (let i = 1; i <= data.availableRooms; i++) {
            const currentName = this.roomNames.get(i) || '';
            inputsHTML += `
                <div class="flex items-center space-x-3">
                    <div class="w-16 text-sm font-medium text-gray-700">Room ${i}:</div>
                    <input type="text" 
                           id="roomName_${i}" 
                           placeholder="e.g., Conference Hall A, Auditorium, Room 101" 
                           value="${currentName}"
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm">
                </div>
            `;
        }

        container.innerHTML = inputsHTML;
    }

    saveRoomNames() {
        const data = this.getFormData();
        
        // Clear existing room names
        this.roomNames.clear();
        
        // Save new room names
        for (let i = 1; i <= data.availableRooms; i++) {
            const input = document.getElementById(`roomName_${i}`);
            const customName = input.value.trim();
            if (customName) {
                this.roomNames.set(i, customName);
            }
        }
        
        // Update room preview
        this.updateRoomPreview();
        
        // Refresh the schedule if it exists
        if (this.currentResults) {
            this.generateSessionBreakdown(this.currentResults);
        }
        
        this.closeRoomModal();
    }

    resetRoomNames() {
        if (confirm('Are you sure you want to reset all room names to defaults?')) {
            this.roomNames.clear();
            this.generateRoomNameInputs();
            this.updateRoomPreview();
            
            // Refresh the schedule if it exists
            if (this.currentResults) {
                this.generateSessionBreakdown(this.currentResults);
            }
        }
    }

    updateRoomPreview() {
        const data = this.getFormData();
        const summary = document.getElementById('roomSummary');
        const customRoomCount = this.roomNames.size;
        
        if (customRoomCount === 0) {
            summary.textContent = 'Using default room numbering (Room 1, Room 2, etc.)';
        } else {
            const examples = [];
            let count = 0;
            for (let i = 1; i <= data.availableRooms && count < 3; i++) {
                const customName = this.roomNames.get(i);
                if (customName) {
                    examples.push(customName);
                    count++;
                }
            }
            
            let text = `${customRoomCount} custom room name${customRoomCount > 1 ? 's' : ''} defined`;
            if (examples.length > 0) {
                text += ` (e.g., ${examples.join(', ')})`;
            }
            summary.textContent = text;
        }
    }

    getRoomName(roomNumber) {
        return this.roomNames.get(roomNumber) || `Room ${roomNumber}`;
    }

    // Moderator Management Functions
    initializeModeratorManagementEventListeners() {
        document.getElementById('manageModeratorsBtn').addEventListener('click', () => {
            this.openModeratorModal();
        });

        document.getElementById('closeModeratorModal').addEventListener('click', () => {
            this.closeModeratorModal();
        });

        document.getElementById('cancelModeratorEdit').addEventListener('click', () => {
            this.closeModeratorModal();
        });

        document.getElementById('addModeratorBtn').addEventListener('click', () => {
            this.addModerator();
        });

        // Moderator dropdown change handler
        document.getElementById('editModeratorSelect').addEventListener('change', (e) => {
            this.handleModeratorSelection(e.target.value);
        });
    }

    openModeratorModal() {
        this.updateModeratorsList();
        document.getElementById('moderatorModal').classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeModeratorModal() {
        document.getElementById('moderatorModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
        this.clearModeratorForm();
    }

    addModerator() {
        const name = document.getElementById('newModeratorName').value.trim();
        const school = document.getElementById('newModeratorSchool').value.trim();
        const email = document.getElementById('newModeratorEmail').value.trim();
        const bio = document.getElementById('newModeratorBio').value.trim();

        if (!name) {
            alert('Please enter a moderator name.');
            return;
        }

        const id = Date.now().toString();
        this.moderators.set(id, {
            id: id,
            name: name,
            school: school,
            email: email,
            bio: bio
        });

        this.clearModeratorForm();
        this.updateModeratorsList();
        this.updateModeratorPreview();
    }

    deleteModerator(id) {
        if (confirm('Are you sure you want to delete this moderator?')) {
            this.moderators.delete(id);
            this.updateModeratorsList();
            this.updateModeratorPreview();
        }
    }

    clearModeratorForm() {
        document.getElementById('newModeratorName').value = '';
        document.getElementById('newModeratorSchool').value = '';
        document.getElementById('newModeratorEmail').value = '';
        document.getElementById('newModeratorBio').value = '';
    }

    updateModeratorsList() {
        const container = document.getElementById('moderatorsList');
        
        if (this.moderators.size === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-user-tie text-3xl mb-2"></i>
                    <p>No moderators added yet.</p>
                </div>
            `;
            return;
        }

        let listHTML = '';
        this.moderators.forEach((moderator) => {
            listHTML += `
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${moderator.name}</div>
                            <div class="text-sm text-gray-600">${moderator.school || 'No institution specified'}</div>
                            ${moderator.email ? `<div class="text-xs text-gray-500">${moderator.email}</div>` : ''}
                            ${moderator.bio ? `<div class="text-xs text-gray-500 mt-1">${moderator.bio}</div>` : ''}
                        </div>
                        <button onclick="calculator.deleteModerator('${moderator.id}')" 
                                class="text-red-500 hover:text-red-700 ml-4">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = listHTML;
    }

    updateModeratorPreview() {
        const summary = document.getElementById('moderatorSummary');
        const count = this.moderators.size;
        
        if (count === 0) {
            summary.textContent = 'No moderators defined yet.';
        } else {
            const examples = Array.from(this.moderators.values()).slice(0, 3).map(m => m.name);
            let text = `${count} moderator${count > 1 ? 's' : ''} defined`;
            if (examples.length > 0) {
                text += ` (${examples.join(', ')})`;
            }
            summary.textContent = text;
        }
    }

    populateModeratorDropdown() {
        const select = document.getElementById('editModeratorSelect');
        select.innerHTML = '<option value="">Select moderator or enter custom...</option>';
        
        this.moderators.forEach((moderator) => {
            const option = document.createElement('option');
            option.value = moderator.id;
            option.textContent = `${moderator.name} - ${moderator.school || 'No institution'}`;
            select.appendChild(option);
        });
        
        // Add custom option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Enter custom moderator...';
        select.appendChild(customOption);
    }

    handleModeratorSelection(value) {
        const customInputs = document.getElementById('customModeratorInputs');
        const nameInput = document.getElementById('editModeratorName');
        const schoolInput = document.getElementById('editModeratorSchool');
        
        if (value === 'custom') {
            customInputs.classList.remove('hidden');
            nameInput.value = '';
            schoolInput.value = '';
        } else if (value && this.moderators.has(value)) {
            customInputs.classList.add('hidden');
            const moderator = this.moderators.get(value);
            nameInput.value = moderator.name;
            schoolInput.value = moderator.school || '';
        } else {
            customInputs.classList.add('hidden');
            nameInput.value = '';
            schoolInput.value = '';
        }
    }

    // Chair Management Functions
    initializeChairManagementEventListeners() {
        document.getElementById('manageChairsBtn').addEventListener('click', () => {
            this.openChairModal();
        });

        document.getElementById('closeChairModal').addEventListener('click', () => {
            this.closeChairModal();
        });

        document.getElementById('cancelChairEdit').addEventListener('click', () => {
            this.closeChairModal();
        });

        document.getElementById('addChairBtn').addEventListener('click', () => {
            this.addChair();
        });

        // Chair dropdown change handler
        document.getElementById('editChairSelect').addEventListener('change', (e) => {
            this.handleChairSelection(e.target.value);
        });
    }

    openChairModal() {
        this.updateChairsList();
        document.getElementById('chairModal').classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeChairModal() {
        document.getElementById('chairModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
        this.clearChairForm();
    }

    addChair() {
        const name = document.getElementById('newChairName').value.trim();
        const school = document.getElementById('newChairSchool').value.trim();
        const email = document.getElementById('newChairEmail').value.trim();
        const bio = document.getElementById('newChairBio').value.trim();

        if (!name) {
            alert('Please enter a chair name.');
            return;
        }

        const id = Date.now().toString();
        this.chairs.set(id, {
            id: id,
            name: name,
            school: school,
            email: email,
            bio: bio
        });

        this.clearChairForm();
        this.updateChairsList();
        this.updateChairPreview();
    }

    deleteChair(id) {
        if (confirm('Are you sure you want to delete this chair?')) {
            this.chairs.delete(id);
            this.updateChairsList();
            this.updateChairPreview();
        }
    }

    clearChairForm() {
        document.getElementById('newChairName').value = '';
        document.getElementById('newChairSchool').value = '';
        document.getElementById('newChairEmail').value = '';
        document.getElementById('newChairBio').value = '';
    }

    updateChairsList() {
        const container = document.getElementById('chairsList');
        
        if (this.chairs.size === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-user-graduate text-3xl mb-2"></i>
                    <p>No chairs added yet.</p>
                </div>
            `;
            return;
        }

        let listHTML = '';
        this.chairs.forEach((chair) => {
            listHTML += `
                <div class="bg-white border border-gray-200 rounded-lg p-4">
                    <div class="flex items-start justify-between">
                        <div class="flex-1">
                            <div class="font-medium text-gray-900">${chair.name}</div>
                            <div class="text-sm text-gray-600">${chair.school || 'No institution specified'}</div>
                            ${chair.email ? `<div class="text-xs text-gray-500">${chair.email}</div>` : ''}
                            ${chair.bio ? `<div class="text-xs text-gray-500 mt-1">${chair.bio}</div>` : ''}
                        </div>
                        <button onclick="calculator.deleteChair('${chair.id}')" 
                                class="text-red-500 hover:text-red-700 ml-4">
                            <i class="fas fa-trash text-sm"></i>
                        </button>
                    </div>
                </div>
            `;
        });

        container.innerHTML = listHTML;
    }

    updateChairPreview() {
        const summary = document.getElementById('chairSummary');
        const count = this.chairs.size;
        
        if (count === 0) {
            summary.textContent = 'No chairs defined yet.';
        } else {
            const examples = Array.from(this.chairs.values()).slice(0, 3).map(c => c.name);
            let text = `${count} chair${count > 1 ? 's' : ''} defined`;
            if (examples.length > 0) {
                text += ` (${examples.join(', ')})`;
            }
            summary.textContent = text;
        }
    }

    populateChairDropdown() {
        const select = document.getElementById('editChairSelect');
        select.innerHTML = '<option value="">Select chair or enter custom...</option>';
        
        this.chairs.forEach((chair) => {
            const option = document.createElement('option');
            option.value = chair.id;
            option.textContent = `${chair.name} - ${chair.school || 'No institution'}`;
            select.appendChild(option);
        });
        
        // Add custom option
        const customOption = document.createElement('option');
        customOption.value = 'custom';
        customOption.textContent = 'Enter custom chair...';
        select.appendChild(customOption);
    }

    handleChairSelection(value) {
        const customInputs = document.getElementById('customChairInputs');
        const nameInput = document.getElementById('editChairName');
        const schoolInput = document.getElementById('editChairSchool');
        
        if (value === 'custom') {
            customInputs.classList.remove('hidden');
            nameInput.value = '';
            schoolInput.value = '';
        } else if (value && this.chairs.has(value)) {
            customInputs.classList.add('hidden');
            const chair = this.chairs.get(value);
            nameInput.value = chair.name;
            schoolInput.value = chair.school || '';
        } else {
            customInputs.classList.add('hidden');
            nameInput.value = '';
            schoolInput.value = '';
        }
    }

    // Supabase Integration Methods
    async loadDataFromSupabase() {
        if (!window.supabaseConfig) {
            console.log('Supabase not configured, skipping data load');
            return;
        }

        try {
            // Load convention data
            const conventionData = await window.supabaseConfig.loadConvention();
            if (conventionData) {
                this.populateFormFromData(conventionData);
            }

            // Load room names
            const roomNames = await window.supabaseConfig.loadRoomNames();
            this.roomNames = roomNames;
            this.updateRoomPreview();

            // Load papers
            const papers = await window.supabaseConfig.loadPapers();
            this.paperDetails = papers;
            this.updatePaperPreview();

            // Load moderators
            const moderators = await window.supabaseConfig.loadModerators();
            this.moderators = moderators;
            this.updateModeratorPreview();

            // Load chairs
            const chairs = await window.supabaseConfig.loadChairs();
            this.chairs = chairs;
            this.updateChairPreview();

            // Load sessions
            const sessions = await window.supabaseConfig.loadSessions();
            this.customSessions = sessions;

            // Load paper assignments
            const assignments = await window.supabaseConfig.loadPaperAssignments();
            this.paperAssignments = assignments;

            console.log('Data loaded from Supabase successfully');
        } catch (error) {
            console.error('Error loading data from Supabase:', error);
        }
    }

    async saveDataToSupabase() {
        if (!window.supabaseConfig) {
            console.log('Supabase not configured, skipping data save');
            return;
        }

        try {
            // Save convention data
            const formData = this.getFormData();
            await window.supabaseConfig.saveConvention({
                name: `Convention ${new Date().toLocaleDateString()}`,
                days: formData.conventionDays,
                time_slots_per_day: formData.timeSlotsPerDay,
                available_rooms: formData.availableRooms,
                sessions_per_time_slot: formData.sessionsPerTimeSlot,
                total_papers: formData.totalPapers,
                papers_per_session: formData.papersPerSession,
                min_papers_per_session: formData.minPapersPerSession,
                max_papers_per_session: formData.maxPapersPerSession,
                total_round_tables: formData.totalRoundTables,
                round_table_duration: formData.roundTableDuration
            });

            // Save room names
            await window.supabaseConfig.saveRoomNames(this.roomNames);

            // Save sessions
            for (let [sessionKey, sessionData] of this.customSessions) {
                await window.supabaseConfig.saveSession(sessionKey, {
                    session_type: sessionData.type || 'paper',
                    day: sessionData.day,
                    time_slot: sessionData.timeSlot,
                    session_number: sessionData.sessionNumber,
                    paper_count: sessionData.paperCount,
                    category: sessionData.category,
                    preferred_room: sessionData.preferredRoom,
                    notes: sessionData.notes,
                    moderator_name: sessionData.moderatorName,
                    moderator_school: sessionData.moderatorSchool,
                    chair_name: sessionData.chairName,
                    chair_school: sessionData.chairSchool,
                    is_customized: sessionData.isCustomized
                });
            }

            // Save paper assignments
            await window.supabaseConfig.savePaperAssignments(this.paperAssignments);

            console.log('Data saved to Supabase successfully');
        } catch (error) {
            console.error('Error saving data to Supabase:', error);
        }
    }

    populateFormFromData(data) {
        document.getElementById('conventionDays').value = data.days || 3;
        document.getElementById('timeSlotsPerDay').value = data.time_slots_per_day || 4;
        document.getElementById('availableRooms').value = data.available_rooms || 10;
        document.getElementById('sessionsPerTimeSlot').value = data.sessions_per_time_slot || 3;
        document.getElementById('totalPapers').value = data.total_papers || 0;
        document.getElementById('papersPerSession').value = data.papers_per_session || 4;
        document.getElementById('minPapersPerSession').value = data.min_papers_per_session || 2;
        document.getElementById('maxPapersPerSession').value = data.max_papers_per_session || 6;
        document.getElementById('totalRoundTables').value = data.total_round_tables || 0;
        document.getElementById('roundTableDuration').value = data.round_table_duration || 1;
    }

    // Override existing methods to include Supabase saves
    async addPaper() {
        const title = document.getElementById('newPaperTitle').value.trim();
        const student = document.getElementById('newStudentName').value.trim();
        const school = document.getElementById('newSchoolName').value.trim();
        const category = document.getElementById('newPaperCategory').value;

        if (!title || !student) {
            alert('Please enter at least a paper title and student name.');
            return;
        }

        try {
            // Save to Supabase first
            if (window.supabaseConfig) {
                await window.supabaseConfig.savePaper({
                    title: title,
                    student_name: student,
                    school: school,
                    category: category
                });
            }

            // Then add to local data (existing logic)
            const id = Date.now().toString();
            this.paperDetails.set(id, {
                id: id,
                title: title,
                student: student,
                school: school,
                category: category
            });

            this.clearPaperForm();
            this.updatePapersList();
            this.updatePaperPreview();
        } catch (error) {
            console.error('Error adding paper:', error);
            alert('Error saving paper. Please try again.');
        }
    }

    async saveSessionEdit() {
        // ... existing session edit logic ...
        if (!this.currentEditingSession) return;
        
        const sessionKey = this.currentEditingSession.key;
        const paperCount = parseInt(document.getElementById('editPaperCount').value) || 4;
        
        let category = document.getElementById('editCategorySelect').value;
        if (category === 'custom') {
            category = document.getElementById('editCategoryCustom').value.trim() || 'Custom';
        }
        
        const preferredRoom = document.getElementById('editRoom').value.trim();
        const notes = document.getElementById('editNotes').value.trim();
        
        // Get moderator and chair information
        const moderatorName = document.getElementById('editModeratorName').value.trim();
        const moderatorSchool = document.getElementById('editModeratorSchool').value.trim();
        const chairName = document.getElementById('editChairName').value.trim();
        const chairSchool = document.getElementById('editChairSchool').value.trim();
        
        const sessionData = {
            ...this.currentEditingSession.data,
            paperCount: paperCount,
            category: category,
            preferredRoom: preferredRoom,
            notes: notes,
            moderatorName: moderatorName,
            moderatorSchool: moderatorSchool,
            chairName: chairName,
            chairSchool: chairSchool,
            isCustomized: true
        };

        // Save custom session data
        this.customSessions.set(sessionKey, sessionData);
        
        // Save to Supabase (auto-save current work)
        await this.saveDataToSupabase();
        
        this.closeEditModal();
        
        // Regenerate the breakdown to show changes
        this.generateDetailedBreakdown(this.currentResults);
        this.updateCustomizationSummary();
    }

    // Custom Time Slots Management Functions
    initializeCustomTimeSlotsEventListeners() {
        document.getElementById('customizeTimeSlotsBtn').addEventListener('click', () => {
            this.openCustomTimeSlotsModal();
        });

        document.getElementById('closeCustomTimeSlotsModal').addEventListener('click', () => {
            this.closeCustomTimeSlotsModal();
        });

        document.getElementById('cancelCustomTimeSlots').addEventListener('click', () => {
            this.closeCustomTimeSlotsModal();
        });

        document.getElementById('applyCustomTimeSlots').addEventListener('click', () => {
            this.applyCustomTimeSlots();
        });

        document.getElementById('resetTimeSlotsBtn').addEventListener('click', () => {
            this.resetToStandardTimeSlots();
        });
    }

    openCustomTimeSlotsModal() {
        this.generateCustomTimeSlotsInputs();
        document.getElementById('customTimeSlotsModal').classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeCustomTimeSlotsModal() {
        document.getElementById('customTimeSlotsModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
    }

    generateCustomTimeSlotsInputs() {
        const conventionDays = parseInt(document.getElementById('conventionDays').value) || 3;
        const standardSlots = parseInt(document.getElementById('timeSlotsPerDay').value) || 4;
        const standardRooms = parseInt(document.getElementById('availableRooms').value) || 10;
        const standardSessionsPerSlot = parseInt(document.getElementById('sessionsPerTimeSlot').value) || 3;
        const container = document.getElementById('customDailyConfigContainer');
        
        let inputsHTML = '';
        
        for (let day = 1; day <= conventionDays; day++) {
            const currentSlots = this.customTimeSlots.get(day) || standardSlots;
            const currentRooms = this.customRoomsPerDay.get(day) || standardRooms;
            const currentSessionsPerSlot = this.customSessionsPerSlot.get(day) || standardSessionsPerSlot;
            
            inputsHTML += `
                <div class="border border-gray-200 rounded-lg p-4">
                    <h4 class="font-medium text-gray-800 mb-3 flex items-center">
                        <i class="fas fa-calendar-day text-blue-600 mr-2"></i>
                        Day ${day} Configuration
                    </h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <!-- Time Slots -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Time Slots</label>
                            <div class="flex items-center space-x-2">
                                <input type="number" 
                                       id="customSlots_${day}" 
                                       value="${currentSlots}" 
                                       min="0" 
                                       max="12" 
                                       class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                <span class="text-xs text-gray-500">slots</span>
                            </div>
                        </div>
                        
                        <!-- Available Rooms -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Available Rooms</label>
                            <div class="flex items-center space-x-2">
                                <input type="number" 
                                       id="customRooms_${day}" 
                                       value="${currentRooms}" 
                                       min="0" 
                                       max="50" 
                                       class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                <span class="text-xs text-gray-500">rooms</span>
                            </div>
                        </div>
                        
                        <!-- Sessions per Time Slot -->
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Sessions per Slot</label>
                            <div class="flex items-center space-x-2">
                                <input type="number" 
                                       id="customSessionsPerSlot_${day}" 
                                       value="${currentSessionsPerSlot}" 
                                       min="1" 
                                       max="20" 
                                       class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                                <span class="text-xs text-gray-500">sessions</span>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Day Summary -->
                    <div class="mt-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                        <span class="font-medium">Capacity:</span> 
                        <span id="dayCapacity_${day}">${currentSlots * currentRooms} total room-slots, ${currentSlots * currentSessionsPerSlot} max sessions</span>
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = inputsHTML;
        
        // Add event listeners for real-time capacity updates
        for (let day = 1; day <= conventionDays; day++) {
            const slotsInput = document.getElementById(`customSlots_${day}`);
            const roomsInput = document.getElementById(`customRooms_${day}`);
            const sessionsInput = document.getElementById(`customSessionsPerSlot_${day}`);
            const capacitySpan = document.getElementById(`dayCapacity_${day}`);
            
            const updateCapacity = () => {
                const slots = parseInt(slotsInput.value) || 0;
                const rooms = parseInt(roomsInput.value) || 0;
                const sessions = parseInt(sessionsInput.value) || 0;
                capacitySpan.textContent = `${slots * rooms} total room-slots, ${slots * sessions} max sessions`;
            };
            
            slotsInput.addEventListener('input', updateCapacity);
            roomsInput.addEventListener('input', updateCapacity);
            sessionsInput.addEventListener('input', updateCapacity);
        }
    }

    applyCustomTimeSlots() {
        const conventionDays = parseInt(document.getElementById('conventionDays').value) || 3;
        const standardSlots = parseInt(document.getElementById('timeSlotsPerDay').value) || 4;
        const standardRooms = parseInt(document.getElementById('availableRooms').value) || 10;
        const standardSessionsPerSlot = parseInt(document.getElementById('sessionsPerTimeSlot').value) || 3;
        
        // Clear existing customizations
        this.customTimeSlots.clear();
        this.customRoomsPerDay.clear();
        this.customSessionsPerSlot.clear();
        
        let hasCustomization = false;
        
        for (let day = 1; day <= conventionDays; day++) {
            const slots = parseInt(document.getElementById(`customSlots_${day}`).value) || 0;
            const rooms = parseInt(document.getElementById(`customRooms_${day}`).value) || 0;
            const sessionsPerSlot = parseInt(document.getElementById(`customSessionsPerSlot_${day}`).value) || 0;
            
            // Check if any values differ from standard
            if (slots !== standardSlots) {
                hasCustomization = true;
                this.customTimeSlots.set(day, slots);
            }
            
            if (rooms !== standardRooms) {
                hasCustomization = true;
                this.customRoomsPerDay.set(day, rooms);
            }
            
            if (sessionsPerSlot !== standardSessionsPerSlot) {
                hasCustomization = true;
                this.customSessionsPerSlot.set(day, sessionsPerSlot);
            }
        }
        
        // If no customization was found, ensure all maps are cleared
        if (!hasCustomization) {
            this.customTimeSlots.clear();
            this.customRoomsPerDay.clear();
            this.customSessionsPerSlot.clear();
        }
        
        this.updateCustomTimeSlotsPreview();
        this.closeCustomTimeSlotsModal();
        this.calculateRequirements(); // Recalculate with new configuration
    }

    resetToStandardTimeSlots() {
        if (confirm('Reset to standard daily configuration? This will remove all custom per-day settings.')) {
            this.customTimeSlots.clear();
            this.customRoomsPerDay.clear();
            this.customSessionsPerSlot.clear();
            this.updateCustomTimeSlotsPreview();
            this.calculateRequirements();
        }
    }

    updateCustomTimeSlotsPreview() {
        const previewDiv = document.getElementById('customTimeSlotsPreview');
        const breakdownDiv = document.getElementById('timeSlotsBreakdown');
        
        const hasCustomConfig = this.customTimeSlots.size > 0 || this.customRoomsPerDay.size > 0 || this.customSessionsPerSlot.size > 0;
        
        if (!hasCustomConfig) {
            previewDiv.classList.add('hidden');
            return;
        }
        
        previewDiv.classList.remove('hidden');
        
        const conventionDays = parseInt(document.getElementById('conventionDays').value) || 3;
        const standardSlots = parseInt(document.getElementById('timeSlotsPerDay').value) || 4;
        const standardRooms = parseInt(document.getElementById('availableRooms').value) || 10;
        const standardSessionsPerSlot = parseInt(document.getElementById('sessionsPerTimeSlot').value) || 3;
        
        let breakdownHTML = '';
        let totalSlots = 0;
        let totalCapacity = 0;
        
        for (let day = 1; day <= conventionDays; day++) {
            const slots = this.customTimeSlots.get(day) || standardSlots;
            const rooms = this.customRoomsPerDay.get(day) || standardRooms;
            const sessionsPerSlot = this.customSessionsPerSlot.get(day) || standardSessionsPerSlot;
            
            totalSlots += slots;
            totalCapacity += slots * sessionsPerSlot;
            
            breakdownHTML += `<div class="text-xs mb-1">
                <span class="font-medium">Day ${day}:</span> 
                ${slots} slots × ${rooms} rooms × ${sessionsPerSlot} sessions = <span class="font-medium">${slots * sessionsPerSlot} session capacity</span>
            </div>`;
        }
        
        breakdownHTML += `<div class="text-sm font-bold mt-2 pt-2 border-t border-blue-300">
            Total: ${totalSlots} time slots, ${totalCapacity} max sessions
        </div>`;
        
        breakdownDiv.innerHTML = breakdownHTML;
    }

    // Time Slot Labels Management Functions
    initializeTimeSlotLabelsEventListeners() {
        document.getElementById('closeTimeSlotLabelsModal').addEventListener('click', () => {
            this.closeTimeSlotLabelsModal();
        });

        document.getElementById('cancelTimeSlotLabels').addEventListener('click', () => {
            this.closeTimeSlotLabelsModal();
        });

        document.getElementById('saveTimeSlotLabels').addEventListener('click', () => {
            this.saveTimeSlotLabels();
        });

        document.getElementById('resetTimeSlotLabels').addEventListener('click', () => {
            this.resetTimeSlotLabels();
        });

        // Close modal when clicking overlay
        document.getElementById('timeSlotLabelsModal').addEventListener('click', (e) => {
            if (e.target.id === 'timeSlotLabelsModal') {
                this.closeTimeSlotLabelsModal();
            }
        });
    }

    openTimeSlotLabelsModal() {
        this.generateTimeSlotLabelsInputs();
        document.getElementById('timeSlotLabelsModal').classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeTimeSlotLabelsModal() {
        document.getElementById('timeSlotLabelsModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
    }

    generateTimeSlotLabelsInputs() {
        const data = this.getFormData();
        const container = document.getElementById('timeSlotLabelsContainer');
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        
        let inputsHTML = '';
        
        for (let day = 1; day <= data.conventionDays; day++) {
            const dayIndex = day - 1;
            const timeSlotsThisDay = data.timeSlotsPerDayArray ? data.timeSlotsPerDayArray[dayIndex] : data.timeSlotsPerDay;
            const dayLabels = this.customTimeSlotLabels.get(day) || [];
            
            inputsHTML += `
                <div class="border border-cyan-200 rounded-lg p-4">
                    <h4 class="font-medium text-cyan-800 mb-3 flex items-center">
                        <i class="fas fa-calendar-day text-cyan-600 mr-2"></i>
                        Day ${day} (${timeSlotsThisDay} time slots)
                    </h4>
                    
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            `;
            
            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const defaultLabel = timeSlotLabels[slot] || `Slot ${slot + 1}`;
                const customLabel = dayLabels[slot] || '';
                
                inputsHTML += `
                    <div class="flex items-center space-x-3">
                        <div class="w-16 text-sm font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded text-center">
                            ${defaultLabel}
                        </div>
                        <input type="text" 
                               id="timeSlotLabel_${day}_${slot}" 
                               placeholder="e.g., Opening Keynote, Morning Session"
                               value="${customLabel}"
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm">
                    </div>
                `;
            }
            
            inputsHTML += `
                    </div>
                </div>
            `;
        }
        
        container.innerHTML = inputsHTML;
    }

    saveTimeSlotLabels() {
        const data = this.getFormData();
        
        // Clear existing labels
        this.customTimeSlotLabels.clear();
        
        // Save new labels
        for (let day = 1; day <= data.conventionDays; day++) {
            const dayIndex = day - 1;
            const timeSlotsThisDay = data.timeSlotsPerDayArray ? data.timeSlotsPerDayArray[dayIndex] : data.timeSlotsPerDay;
            const dayLabels = [];
            
            for (let slot = 0; slot < timeSlotsThisDay; slot++) {
                const input = document.getElementById(`timeSlotLabel_${day}_${slot}`);
                const customLabel = input.value.trim();
                dayLabels.push(customLabel);
            }
            
            // Only save if there are custom labels
            if (dayLabels.some(label => label !== '')) {
                this.customTimeSlotLabels.set(day, dayLabels);
            }
        }
        
        this.updateTimeSlotLabelsPreview();
        this.closeTimeSlotLabelsModal();

        // Refresh displays if schedule exists
        if (this.currentResults) {
            this.generateDetailedBreakdown(this.currentResults);
        }
    }

    resetTimeSlotLabels() {
        if (confirm('Reset all time slot labels to default (A, B, C, etc.)?')) {
            this.customTimeSlotLabels.clear();
            this.generateTimeSlotLabelsInputs();
            this.updateTimeSlotLabelsPreview();
        }
    }

    updateTimeSlotLabelsPreview() {
        const summary = document.getElementById('timeSlotLabelsSummary');
        const customCount = this.customTimeSlotLabels.size;
        
        if (customCount === 0) {
            summary.textContent = 'Using default slot labels (A, B, C, etc.)';
        } else {
            let totalCustomLabels = 0;
            this.customTimeSlotLabels.forEach(dayLabels => {
                totalCustomLabels += dayLabels.filter(label => label !== '').length;
            });
            
            summary.textContent = `${totalCustomLabels} custom time slot label${totalCustomLabels > 1 ? 's' : ''} defined across ${customCount} day${customCount > 1 ? 's' : ''}`;
        }
    }

    getTimeSlotLabel(day, slotIndex) {
        const dayLabels = this.customTimeSlotLabels.get(day);
        if (dayLabels && dayLabels[slotIndex] && dayLabels[slotIndex].trim() !== '') {
            return dayLabels[slotIndex];
        }
        
        // Fall back to default labels
        const timeSlotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
        return timeSlotLabels[slotIndex] || `Slot ${slotIndex + 1}`;
    }

    // Session Labels Management Functions
    initializeSessionLabelsEventListeners() {
        document.getElementById('closeSessionLabelsModal').addEventListener('click', () => {
            this.closeSessionLabelsModal();
        });

        document.getElementById('cancelSessionLabels').addEventListener('click', () => {
            this.closeSessionLabelsModal();
        });

        document.getElementById('saveSessionLabels').addEventListener('click', () => {
            this.saveSessionLabels();
        });

        document.getElementById('resetSessionLabels').addEventListener('click', () => {
            this.resetSessionLabels();
        });

        // Close modal when clicking overlay
        document.getElementById('sessionLabelsModal').addEventListener('click', (e) => {
            if (e.target.id === 'sessionLabelsModal') {
                this.closeSessionLabelsModal();
            }
        });
    }

    openSessionLabelsModal() {
        // Always recalculate to ensure we have the latest session counts
        this.calculateRequirements();
        
        if (!this.currentResults) {
            alert('Please calculate the schedule first to see available sessions.');
            return;
        }
        
        this.generateSessionLabelsInputs();
        document.getElementById('sessionLabelsModal').classList.remove('hidden');
        document.body.classList.add('modal-open');
    }

    closeSessionLabelsModal() {
        document.getElementById('sessionLabelsModal').classList.add('hidden');
        document.body.classList.remove('modal-open');
    }

    generateSessionLabelsInputs() {
        if (!this.currentResults) return;

        const paperContainer = document.getElementById('paperSessionLabelsContainer');
        const roundTableContainer = document.getElementById('roundTableLabelsContainer');
        
        // Generate paper session inputs based on total possible sessions
        let paperHTML = '';
        
        // Calculate maximum number of possible paper sessions based on current parameters
        const formData = this.getFormData();
        let totalPossibleSessions = 0;
        
        for (let day = 1; day <= formData.conventionDays; day++) {
            const dayIndex = day - 1;
            const timeSlotsThisDay = formData.timeSlotsPerDayArray ? formData.timeSlotsPerDayArray[dayIndex] : formData.timeSlotsPerDay;
            const sessionsPerSlotThisDay = formData.sessionsPerSlotPerDayArray ? formData.sessionsPerSlotPerDayArray[dayIndex] : formData.sessionsPerTimeSlot;
            totalPossibleSessions += timeSlotsThisDay * sessionsPerSlotThisDay;
        }
        
        // Subtract round table sessions to get paper session capacity
        const maxPaperSessions = Math.max(0, totalPossibleSessions - formData.totalRoundTables);
        
        // Generate inputs for all possible paper sessions (up to a reasonable limit)
        const sessionLimit = Math.max(maxPaperSessions, this.currentResults.paperSessions || 0, 10); // At least 10 or current count
        
        for (let i = 1; i <= sessionLimit; i++) {
            const sessionKey = `paper_session_${i}`;
            const customLabel = this.customSessionLabels.get(sessionKey) || '';
            
            // Get paper count from existing session data if available
            let paperCount = 4; // default
            if (this.currentResults.sessionDistribution && this.currentResults.sessionDistribution.sessions) {
                const existingSession = this.currentResults.sessionDistribution.sessions.find(s => s.id === i);
                if (existingSession) {
                    paperCount = existingSession.paperCount;
                }
            }
            
            paperHTML += `
                <div class="flex items-center space-x-3">
                    <div class="w-20 text-sm font-medium text-gray-700 bg-green-100 px-2 py-1 rounded text-center">
                        Session ${i}
                    </div>
                    <input type="text" 
                           id="sessionLabel_${sessionKey}" 
                           placeholder="e.g., Medieval Poetry Panel, Contemporary Voices"
                           value="${customLabel}"
                           class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm">
                    <div class="text-xs text-gray-500 w-16">
                        ${i <= (this.currentResults.paperSessions || 0) ? `${paperCount} papers` : 'unused'}
                    </div>
                </div>
            `;
        }
        
        if (paperHTML === '') {
            paperHTML = '<div class="text-sm text-gray-500 italic">No paper sessions to customize</div>';
        }
        
        paperContainer.innerHTML = paperHTML;
        
        // Generate round table session inputs based on current form data
        let roundTableHTML = '';
        const currentRoundTables = formData.totalRoundTables;
        
        if (currentRoundTables > 0) {
            for (let i = 1; i <= currentRoundTables; i++) {
                const sessionKey = `round_table_${i}`;
                const customLabel = this.customSessionLabels.get(sessionKey) || '';
                
                roundTableHTML += `
                    <div class="flex items-center space-x-3">
                        <div class="w-20 text-sm font-medium text-gray-700 bg-purple-100 px-2 py-1 rounded text-center">
                            Table ${i}
                        </div>
                        <input type="text" 
                               id="sessionLabel_${sessionKey}" 
                               placeholder="e.g., Graduate Showcase, Faculty Forum"
                               value="${customLabel}"
                               class="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500 text-sm">
                    </div>
                `;
            }
        }
        
        if (roundTableHTML === '') {
            roundTableHTML = '<div class="text-sm text-gray-500 italic">No round table sessions to customize</div>';
        }
        
        roundTableContainer.innerHTML = roundTableHTML;
    }

    saveSessionLabels() {
        if (!this.currentResults) return;

        // Save paper session labels
        if (this.currentResults.sessionDistribution && this.currentResults.sessionDistribution.sessions) {
            this.currentResults.sessionDistribution.sessions.forEach((session) => {
                const sessionKey = `paper_session_${session.id}`;
                const input = document.getElementById(`sessionLabel_${sessionKey}`);
                if (input) {
                    const customLabel = input.value.trim();
                    if (customLabel !== '') {
                        this.customSessionLabels.set(sessionKey, customLabel);
                    } else {
                        this.customSessionLabels.delete(sessionKey);
                    }
                }
            });
        }
        
        // Save round table labels
        for (let i = 1; i <= this.currentResults.roundTableSessions; i++) {
            const sessionKey = `round_table_${i}`;
            const input = document.getElementById(`sessionLabel_${sessionKey}`);
            if (input) {
                const customLabel = input.value.trim();
                if (customLabel !== '') {
                    this.customSessionLabels.set(sessionKey, customLabel);
                } else {
                    this.customSessionLabels.delete(sessionKey);
                }
            }
        }

        this.updateSessionLabelsPreview();
        this.closeSessionLabelsModal();

        // Refresh displays
        this.generateDetailedBreakdown(this.currentResults);
        this.updateCustomizationSummary();
    }

    resetSessionLabels() {
        if (confirm('Reset all session names to default numbering?')) {
            this.customSessionLabels.clear();
            this.generateSessionLabelsInputs();
            this.updateSessionLabelsPreview();
        }
    }

    updateSessionLabelsPreview() {
        const summary = document.getElementById('sessionLabelsSummary');
        const customCount = this.customSessionLabels.size;
        
        if (customCount === 0) {
            summary.textContent = 'Using default session numbering (Session 1, Session 2, etc.)';
        } else {
            summary.textContent = `${customCount} custom session name${customCount > 1 ? 's' : ''} defined`;
        }
    }

    getSessionLabel(sessionType, sessionId) {
        const sessionKey = `${sessionType}_${sessionId}`;
        const customLabel = this.customSessionLabels.get(sessionKey);
        
        if (customLabel && customLabel.trim() !== '') {
            return customLabel;
        }
        
        // Fall back to default labels
        if (sessionType === 'paper_session') {
            return `Paper Session ${sessionId}`;
        } else if (sessionType === 'round_table') {
            return `Round Table ${sessionId}`;
        }
        
        return `Session ${sessionId}`;
    }

    // Convention Management Methods
    async saveCurrentConvention() {
        let defaultName = `Convention ${new Date().toLocaleDateString()}`;
        
        // Try to get current convention name as default
        try {
            const existingConvention = await window.supabaseConfig.loadConvention();
            if (existingConvention && existingConvention.name) {
                defaultName = existingConvention.name;
            }
        } catch (error) {
            // Ignore error, use date-based default
        }
        
        const conventionName = prompt('Enter a name for this convention:', defaultName);
        
        if (!conventionName) return;
        
        try {
            // Always update current convention rather than creating new one
            await this.updateCurrentConventionWithName(conventionName);
            this.showNotification(`Convention "${conventionName}" saved successfully!`, 'success');
        } catch (error) {
            console.error('Error saving convention:', error);
            this.showNotification('Error saving convention. Please try again.', 'error');
        }
    }

    async saveConventionWithName(conventionName) {
        if (!window.supabaseConfig) {
            console.log('Supabase not configured, skipping convention save');
            return;
        }

        const formData = this.getFormData();
        
        // Serialize all the complex data structures
        const sessionAssignmentsData = {};
        this.roundTableAssignments.forEach((assignment, roundTableId) => {
            sessionAssignmentsData[`roundtable_${roundTableId}`] = assignment;
        });
        
        const paperAssignmentsData = {};
        this.paperSessionAssignments.forEach((session, positionKey) => {
            paperAssignmentsData[positionKey] = session;
        });
        
        const customSessionsData = {};
        this.customSessions.forEach((session, sessionKey) => {
            customSessionsData[sessionKey] = session;
        });
        
        const customLabelsData = {};
        this.customSessionLabels.forEach((label, sessionKey) => {
            customLabelsData[sessionKey] = label;
        });
        
        const conventionData = {
            name: conventionName,
            days: formData.conventionDays,
            time_slots_per_day: formData.timeSlotsPerDay,
            available_rooms: formData.availableRooms,
            sessions_per_time_slot: formData.sessionsPerTimeSlot,
            total_papers: formData.totalPapers,
            papers_per_session: formData.papersPerSession,
            min_papers_per_session: formData.minPapersPerSession,
            max_papers_per_session: formData.maxPapersPerSession,
            total_round_tables: formData.totalRoundTables,
            round_table_duration: formData.roundTableDuration,
            // Save the complex session data as JSON
            round_table_assignments: JSON.stringify(sessionAssignmentsData),
            paper_session_assignments: JSON.stringify(paperAssignmentsData),
            custom_sessions: JSON.stringify(customSessionsData),
            custom_session_labels: JSON.stringify(customLabelsData),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        // Save to Supabase with the specific name and session data
        const conventionId = await window.supabaseConfig.saveNamedConvention(conventionData);
        
        // Switch to this new convention ID permanently (this becomes our current convention)
        window.supabaseConfig.currentConventionId = conventionId;
        localStorage.setItem('currentConventionId', conventionId);
        
        // Save all related data (papers, room names, etc.) under the new convention ID
        await this.saveDataToSupabase();
    }

    async openConventionListModal() {
        if (!window.supabaseConfig) {
            this.showNotification('Database not configured. Cannot load conventions.', 'error');
            return;
        }

        try {
            const conventions = await window.supabaseConfig.loadAllConventions();
            this.showConventionListModal(conventions);
        } catch (error) {
            console.error('Error loading conventions:', error);
            this.showNotification('Error loading conventions. Please try again.', 'error');
        }
    }

    showConventionListModal(conventions) {
        let conventionsHTML = '';
        
        if (conventions.length === 0) {
            conventionsHTML = `
                <div class="text-center py-8 text-gray-500">
                    <i class="fas fa-folder-open text-3xl mb-2"></i>
                    <p>No saved conventions found.</p>
                    <p class="text-sm mt-2">Create your first convention by working on a schedule and clicking "Save Convention".</p>
                </div>
            `;
        } else {
            conventionsHTML = conventions.map(conv => `
                <div class="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div class="flex-1">
                        <div class="font-medium text-gray-900">${conv.name}</div>
                        <div class="text-sm text-gray-600">
                            ${conv.days} days • ${conv.total_papers} papers • ${conv.total_round_tables} round tables
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                            Last updated: ${new Date(conv.updated_at).toLocaleDateString()}
                        </div>
                    </div>
                    <div class="flex items-center space-x-2 ml-4">
                        <button onclick="calculator.loadConvention('${conv.id}')" 
                                class="px-3 py-2 bg-blue-500 text-white text-sm rounded-md hover:bg-blue-600 transition-colors">
                            Load
                        </button>
                        <button onclick="calculator.deleteConvention('${conv.id}', '${conv.name}')" 
                                class="px-3 py-2 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            `).join('');
        }

        const modalHTML = `
            <div id="conventionListModal" class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4" onclick="calculator.closeConventionListModal()">
                <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
                    <div class="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-4 flex-shrink-0">
                        <div class="flex items-center justify-between">
                            <div>
                                <h3 class="text-lg font-semibold flex items-center">
                                    <i class="fas fa-folder-open mr-2"></i>
                                    Load Convention
                                </h3>
                                <p class="text-sm text-blue-100 mt-1">Select a convention to load or manage your saved conventions</p>
                            </div>
                            <button onclick="calculator.closeConventionListModal()" 
                                    class="text-white hover:text-blue-200 transition-colors ml-4">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                        </div>
                    </div>
                    <div class="p-6 flex-1 overflow-y-auto">
                        <div class="space-y-3">
                            ${conventionsHTML}
                        </div>
                    </div>
                    <div class="bg-gray-50 px-6 py-4 flex justify-between flex-shrink-0">
                        <div class="text-sm text-gray-600">
                            <i class="fas fa-info-circle mr-1"></i>
                            Loading a convention will replace your current work
                        </div>
                        <button onclick="calculator.closeConventionListModal()" 
                                class="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('conventionListModal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }

    closeConventionListModal() {
        const modal = document.getElementById('conventionListModal');
        if (modal) {
            modal.remove();
        }
    }

    async loadConvention(conventionId) {
        if (!window.supabaseConfig) return;

        try {
            // Load the specific convention
            const conventionData = await window.supabaseConfig.loadConventionById(conventionId);
            if (conventionData) {
                // Clear existing data first
                this.customSessions.clear();
                this.roundTableAssignments.clear();
                this.paperSessionAssignments.clear();
                this.customSessionLabels.clear();
                
                // Populate form with basic data
                this.populateFormFromData(conventionData);
                
                // Restore session assignments and customizations
                if (conventionData.round_table_assignments) {
                    try {
                        const roundTableData = JSON.parse(conventionData.round_table_assignments);
                        Object.entries(roundTableData).forEach(([key, assignment]) => {
                            const roundTableId = parseInt(key.replace('roundtable_', ''));
                            this.roundTableAssignments.set(roundTableId, assignment);
                        });
                    } catch (e) {
                        console.error('Error parsing round table assignments:', e);
                    }
                }
                
                if (conventionData.paper_session_assignments) {
                    try {
                        const paperSessionData = JSON.parse(conventionData.paper_session_assignments);
                        Object.entries(paperSessionData).forEach(([positionKey, session]) => {
                            this.paperSessionAssignments.set(positionKey, session);
                        });
                    } catch (e) {
                        console.error('Error parsing paper session assignments:', e);
                    }
                }
                
                if (conventionData.custom_sessions) {
                    try {
                        const customSessionData = JSON.parse(conventionData.custom_sessions);
                        Object.entries(customSessionData).forEach(([sessionKey, session]) => {
                            this.customSessions.set(sessionKey, session);
                        });
                    } catch (e) {
                        console.error('Error parsing custom sessions:', e);
                    }
                }
                
                if (conventionData.custom_session_labels) {
                    try {
                        const customLabelsData = JSON.parse(conventionData.custom_session_labels);
                        Object.entries(customLabelsData).forEach(([sessionKey, label]) => {
                            this.customSessionLabels.set(sessionKey, label);
                        });
                    } catch (e) {
                        console.error('Error parsing custom session labels:', e);
                    }
                }
                
                // Load all related data (papers, room names, etc.)
                await this.loadDataFromSupabase();
                
                // Recalculate and regenerate the display
                this.calculateRequirements();
                
                this.closeConventionListModal();
                this.showNotification(`Convention "${conventionData.name}" loaded successfully!`, 'success');
            }
        } catch (error) {
            console.error('Error loading convention:', error);
            this.showNotification('Error loading convention. Please try again.', 'error');
        }
    }

    async deleteConvention(conventionId, conventionName) {
        if (!confirm(`Are you sure you want to delete "${conventionName}"? This action cannot be undone.`)) {
            return;
        }

        try {
            await window.supabaseConfig.deleteConvention(conventionId);
            this.showNotification(`Convention "${conventionName}" deleted successfully.`, 'success');
            // Refresh the convention list
            this.openConventionListModal();
        } catch (error) {
            console.error('Error deleting convention:', error);
            this.showNotification('Error deleting convention. Please try again.', 'error');
        }
    }

    createNewConvention() {
        if (!this.hasUnsavedChanges() || confirm('Creating a new convention will clear your current work. Continue?')) {
            // Reset all data to defaults
            this.customSessions.clear();
            this.roundTableAssignments.clear();
            this.paperSessionAssignments.clear();
            this.timeSlotSchedule.clear();
            this.sessionCategories.clear();
            this.paperDetails.clear();
            this.paperAssignments.clear();
            this.roomNames.clear();
            this.moderators.clear();
            this.chairs.clear();
            this.customTimeSlots.clear();
            this.customRoomsPerDay.clear();
            this.customSessionsPerSlot.clear();
            this.customTimeSlotLabels.clear();
            this.customSessionLabels.clear();

            // Reset form to defaults
            document.getElementById('conventionDays').value = 3;
            document.getElementById('timeSlotsPerDay').value = 4;
            document.getElementById('availableRooms').value = 10;
            document.getElementById('sessionsPerTimeSlot').value = 3;
            document.getElementById('totalPapers').value = 0;
            document.getElementById('papersPerSession').value = 4;
            document.getElementById('minPapersPerSession').value = 2;
            document.getElementById('maxPapersPerSession').value = 6;
            document.getElementById('totalRoundTables').value = 0;
            document.getElementById('roundTableDuration').value = 1;

            // Hide detailed breakdown
            this.detailedBreakdown.classList.add('hidden');
            this.currentResults = null;

            // Update all previews
            this.updateTimeSlotPreview();
            this.updateRoomPreview();
            this.updateModeratorPreview();
            this.updateChairPreview();
            this.updateCategoryPreview();
            this.updatePaperPreview();

            this.showNotification('New convention created. Start by setting up your basic parameters.', 'success');
        }
    }

    hasUnsavedChanges() {
        // Simple check - if there are any sessions or custom data, consider it as having changes
        return this.customSessions.size > 0 || 
               this.roundTableAssignments.size > 0 || 
               this.paperSessionAssignments.size > 0 ||
               this.paperDetails.size > 0 ||
               parseInt(document.getElementById('totalPapers').value) > 0 ||
               parseInt(document.getElementById('totalRoundTables').value) > 0;
    }

    async saveToCurrentConvention() {
        if (!window.supabaseConfig) return;
        
        try {
            // Update the current convention with session data
            const formData = this.getFormData();
            
            // Serialize all the complex data structures
            const sessionAssignmentsData = {};
            this.roundTableAssignments.forEach((assignment, roundTableId) => {
                sessionAssignmentsData[`roundtable_${roundTableId}`] = assignment;
            });
            
            const paperAssignmentsData = {};
            this.paperSessionAssignments.forEach((session, positionKey) => {
                paperAssignmentsData[positionKey] = session;
            });
            
            const customSessionsData = {};
            this.customSessions.forEach((session, sessionKey) => {
                customSessionsData[sessionKey] = session;
            });
            
            const customLabelsData = {};
            this.customSessionLabels.forEach((label, sessionKey) => {
                customLabelsData[sessionKey] = label;
            });

            await window.supabaseConfig.updateCurrentConvention({
                days: formData.conventionDays,
                time_slots_per_day: formData.timeSlotsPerDay,
                available_rooms: formData.availableRooms,
                sessions_per_time_slot: formData.sessionsPerTimeSlot,
                total_papers: formData.totalPapers,
                papers_per_session: formData.papersPerSession,
                min_papers_per_session: formData.minPapersPerSession,
                max_papers_per_session: formData.maxPapersPerSession,
                total_round_tables: formData.totalRoundTables,
                round_table_duration: formData.roundTableDuration,
                round_table_assignments: JSON.stringify(sessionAssignmentsData),
                paper_session_assignments: JSON.stringify(paperAssignmentsData),
                custom_sessions: JSON.stringify(customSessionsData),
                custom_session_labels: JSON.stringify(customLabelsData),
                updated_at: new Date().toISOString()
            });
            
            // Also save related data
            await this.saveDataToSupabase();
        } catch (error) {
            console.error('Error auto-saving to current convention:', error);
        }
    }

    async updateCurrentConventionWithName(conventionName) {
        if (!window.supabaseConfig) return;

        const formData = this.getFormData();
        
        // Serialize all the complex data structures
        const sessionAssignmentsData = {};
        this.roundTableAssignments.forEach((assignment, roundTableId) => {
            sessionAssignmentsData[`roundtable_${roundTableId}`] = assignment;
        });
        
        const paperAssignmentsData = {};
        this.paperSessionAssignments.forEach((session, positionKey) => {
            paperAssignmentsData[positionKey] = session;
        });
        
        const customSessionsData = {};
        this.customSessions.forEach((session, sessionKey) => {
            customSessionsData[sessionKey] = session;
        });
        
        const customLabelsData = {};
        this.customSessionLabels.forEach((label, sessionKey) => {
            customLabelsData[sessionKey] = label;
        });

        await window.supabaseConfig.updateCurrentConvention({
            name: conventionName,
            days: formData.conventionDays,
            time_slots_per_day: formData.timeSlotsPerDay,
            available_rooms: formData.availableRooms,
            sessions_per_time_slot: formData.sessionsPerTimeSlot,
            total_papers: formData.totalPapers,
            papers_per_session: formData.papersPerSession,
            min_papers_per_session: formData.minPapersPerSession,
            max_papers_per_session: formData.maxPapersPerSession,
            total_round_tables: formData.totalRoundTables,
            round_table_duration: formData.roundTableDuration,
            round_table_assignments: JSON.stringify(sessionAssignmentsData),
            paper_session_assignments: JSON.stringify(paperAssignmentsData),
            custom_sessions: JSON.stringify(customSessionsData),
            custom_session_labels: JSON.stringify(customLabelsData),
            updated_at: new Date().toISOString()
        });
        
        // Also save related data
        await this.saveDataToSupabase();
    }
}

// Initialize the calculator when the page loads
let calculator;
document.addEventListener('DOMContentLoaded', () => {
    calculator = new ConventionRoomCalculator();
    window.calculator = calculator; // Make it globally accessible for debugging
});
