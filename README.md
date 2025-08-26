# Convention Room Calculator

A comprehensive web application for planning and organizing academic conference room scheduling with drag-and-drop functionality for manual round table placement.

## 🎯 Currently Completed Features

### Core Functionality
- **Dynamic Room Calculation**: Calculates required rooms, sessions, and scheduling based on papers and round tables
- **Multi-day Convention Support**: Handles conventions spanning multiple days with flexible time slot configurations
- **Real-time Updates**: All calculations update automatically when input parameters change
- **PDF Export**: Generate comprehensive PDF schedules with all session details

### Session Management
- **Paper Sessions**: Automatic distribution based on paper count and session constraints
- **Round Table Sessions**: Manual drag-and-drop placement into specific time slots
- **Category-based Organization**: Support for custom paper categories (e.g., Medieval Literature, Modern Literature)
- **Session Customization**: Edit individual sessions with custom names, moderators, chairs, rooms, and notes

### Advanced Scheduling Features
- **Manual Position Control**: All session positions start empty for complete manual control
- **Mixed Session Scheduling**: Full support for combining round tables and paper sessions within the same time slot
- **Position-Specific Placement**: Individual control over each session position within time slots (Position 1, 2, 3, etc.)
- **Interactive Session Assignment**: Click any empty position to choose between round table or paper session
- **Session Modification**: Edit or remove any assigned session with built-in action buttons
- **Auto-Populate Option**: Optional intelligent auto-population with round tables placed in end positions
- **Multi-level Modal System**: Step-by-step session type selection and specific assignment process
- **Real-time Visual Feedback**: Clear positioning indicators and session status updates
- **Position-based Validation**: Prevents conflicts by tracking assignments at the individual position level
- **Round Table Customization**: Full customization of round table names and participant details (up to 7 participants per table)

### Paper and Participant Management
- **Individual Paper Tracking**: Add specific papers with titles, authors, schools, and categories
- **Paper-to-Session Assignment**: Drag-and-drop interface for assigning specific papers to specific sessions
- **CSV Import/Export**: Bulk import papers from CSV files and export for external use
- **Moderator Management**: Database of moderators with contact information and bio
- **Chair Management**: Database of session chairs with institutional affiliations

### Customization Options
- **Custom Room Names**: Replace default room numbering with meaningful names (e.g., "Auditorium A", "Conference Hall")
- **Time Slot Scheduling**: Set specific times for each time slot (e.g., "9:00 AM", "10:30 AM")
- **Custom Time Slot Labels**: Replace default labels (A, B, C) with descriptive names (e.g., "Opening Keynote", "Morning Session")
- **Custom Session Labels**: Personalize session names beyond default numbering
- **Per-Day Configuration**: Different numbers of time slots, rooms, and sessions per day
- **Category Color Coding**: Visual organization with color-coded session categories
- **Round Table Participant Management**: 
  - Custom round table names (e.g., "Innovation Strategies", "Technology Trends")
  - Up to 7 participants per round table with full name and institutional affiliation
  - Modal-based editing interface for easy participant management

### Data Persistence
- **Supabase Integration**: Automatic saving and loading of all configuration data
- **Session State Management**: Maintains round table assignments, customizations, and preferences
- **Cross-session Continuity**: Data persists across browser sessions

## 🔄 Current Functional Entry URIs (Paths and Parameters)

### Main Interface
- **`/index.html`** - Primary calculator interface with all functionality
- **Form Parameters**:
  - `conventionDays` - Number of convention days (default: 3)
  - `timeSlotsPerDay` - Time slots per day (default: 4) 
  - `availableRooms` - Total available rooms (default: 10)
  - `sessionsPerTimeSlot` - Concurrent sessions per slot (default: 3)
  - `totalPapers` - Total number of papers (default: 0)
  - `totalRoundTables` - Total number of round tables (default: 0)

### Interactive Features
- **Position-Specific Assignment**:
  - `.session-position-slot` - Clickable empty position slots for session assignment
  - `onclick="calculator.openPositionAssignmentModal(day, slot, position)"` - Position-specific assignment modals
  - Individual session positions numbered 1, 2, 3, etc. within each time slot

- **Round Table Assignment**:
  - `.round-table-clickable` - Clickable round table cards for placement selection
  - `.drop-zone-placeholder` - Legacy time slot areas (still supported for backward compatibility)
  - Dual-path assignment: choose session type first, then specific round table

- **Modal Interfaces**:
  - **Position Assignment Modal**: Choose between round table or paper session for specific position
  - **Round Table Selection Modal**: Choose specific round table after selecting round table option
  - Session editing modals for customization (round table vs paper session specific fields)
  - Paper management modals for bulk operations
  - Category management for organizational structure
  - Room, moderator, and chair management interfaces

## 🚧 Features Not Yet Implemented

### Enhanced User Experience
- **Round Table Selection Dialog**: Pop-up to choose specific round table when dropping into slots
- **Conflict Resolution**: Automatic handling of scheduling conflicts
- **Capacity Warnings**: Alert system for over-capacity situations
- **Undo/Redo Functionality**: Action history for easy mistake correction

### Advanced Scheduling
- **Auto-scheduling Algorithms**: Intelligent automatic placement suggestions
- **Presenter Availability**: Integration of presenter time constraints
- **Room Equipment Matching**: Match sessions to rooms based on equipment needs
- **Multi-track Conferences**: Support for parallel conference tracks

### Reporting and Analytics
- **Utilization Analytics**: Detailed room and time slot utilization reports
- **Conflict Reports**: Automated detection and reporting of scheduling conflicts
- **Attendance Projections**: Capacity planning based on expected attendance
- **Resource Optimization**: Suggestions for better resource utilization

### Integration Features
- **Calendar Export**: iCal/Google Calendar integration
- **Email Notifications**: Automated participant notifications
- **QR Code Generation**: Quick access codes for session information
- **Mobile App**: Companion mobile application for participants

## 🎯 Recommended Next Steps for Development

### Priority 1: User Experience Enhancements ✅ COMPLETED
1. **Round Table Selection System** ✅
   - ✅ Implemented click-to-select modal system
   - ✅ Shows available time slots with capacity information
   - ✅ Dual-direction selection (click round table OR click time slot)
   - ✅ Eliminated long-distance dragging requirement

2. **Round Table Customization** ✅
   - ✅ Custom round table naming system
   - ✅ Participant management (up to 7 participants per table)
   - ✅ Full name and school/institution tracking
   - ✅ Modal-based editing interface with conditional field display
   - ✅ Data persistence and session state management

3. **Manual Position Control System** ✅
   - ✅ All positions start empty for complete manual control
   - ✅ Click-to-assign interface for each individual position
   - ✅ Session modification with edit/remove buttons on each assigned session
   - ✅ Mixed round table and paper sessions within same time slot
   - ✅ Auto-populate option with intelligent placement (round tables at end positions)
   - ✅ Real-time position tracking and conflict prevention

3. **Enhanced Visual Feedback**
   - Improve drag-and-drop visual indicators for paper assignments
   - Add animation for successful drops
   - Implement color-coded status indicators

### Priority 2: Advanced Scheduling Features
1. **Conflict Detection System**
   - Real-time conflict detection during manual placement
   - Visual indicators for potential conflicts
   - Automated conflict resolution suggestions

2. **Smart Auto-placement**
   - Algorithm to suggest optimal round table placement
   - Category-based placement suggestions
   - Load balancing across time slots

### Priority 3: Data Management
1. **Advanced Import/Export**
   - Support for multiple file formats (Excel, JSON)
   - Template generation for data entry
   - Batch operations for large datasets

2. **Backup and Versioning**
   - Configuration version history
   - Automatic backup system
   - Data recovery mechanisms

## 🏗️ Project Architecture

### Frontend Technologies
- **HTML5 + CSS3**: Modern web standards with responsive design
- **Tailwind CSS**: Utility-first CSS framework via CDN
- **Vanilla JavaScript**: ES6+ features for interactivity
- **Chart.js**: Data visualization for utilization charts
- **jsPDF**: Client-side PDF generation

### Data Storage
- **Supabase**: Backend-as-a-Service for data persistence
- **Local Storage**: Browser-based temporary storage
- **CSV Import/Export**: Standard data exchange format

### Key JavaScript Classes and Functions
- **`ConventionRoomCalculator`**: Main application class
- **`generateSessionBreakdown()`**: Core scheduling logic
- **`attachRoundTableDragListeners()`**: Drag-and-drop functionality
- **`generateUnassignedRoundTablesSection()`**: Round table pool management

## 🌐 Public URLs

### Production Environment
- **Main Application**: `[To be deployed via Publish tab]`
- **API Endpoints**: `[Supabase endpoints - configured via environment]`

### Development Environment
- **Local Development**: `file://[project-path]/index.html`
- **Live Preview**: Available through development server

## 💾 Data Models and Storage Services

### Supabase Tables
- **`conventions`**: Main convention configuration data
- **`papers`**: Individual paper details and metadata
- **`sessions`**: Custom session configurations and assignments
- **`room_names`**: Custom room naming mappings
- **`moderators`**: Moderator contact information and profiles
- **`chairs`**: Session chair details and affiliations

### Local Storage Models
- **Session State**: `roundTableAssignments`, `customSessions`, `paperAssignments`
- **UI Preferences**: Custom labels, time slots, categories
- **Temporary Data**: Form state, calculation results, user interactions

### Data Relationships
- Papers → Sessions (many-to-one assignment)
- Round Tables → Time Slots (manual assignment)
- Sessions → Rooms (automatic + manual assignment)
- Categories → Papers (organizational grouping)

## 🚀 Getting Started

1. **Open the Application**: Navigate to `index.html` in a web browser
2. **Configure Basic Settings**: Set convention days, time slots, and available rooms
3. **Add Papers**: Use the "Manage Papers" button to add individual papers or import from CSV
4. **Set Up Round Tables**: Configure the number of round tables needed
5. **Calculate Schedule**: The system automatically generates the initial schedule
6. **Manual Placement**: All positions start empty. Click any position to assign session type, or use "Auto-Populate" for intelligent assignment with round tables at end positions. Full modification capabilities available.
7. **Customize Sessions**: Click on any session to edit details, assign moderators, or add notes
8. **Export Results**: Generate PDF schedules or export data for external use

## 🔧 Technical Requirements

- **Modern Web Browser**: Chrome, Firefox, Safari, or Edge (ES6+ support required)
- **Internet Connection**: Required for Tailwind CSS CDN and Supabase integration
- **JavaScript Enabled**: Full functionality requires JavaScript

## 📝 Notes

- **Reserved Slots**: The system automatically reserves at least one slot per time slot for round table placement when round tables exist and multiple sessions per slot are configured
- **Data Persistence**: All configuration data is automatically saved to Supabase when available
- **Mobile Responsive**: Interface adapts to different screen sizes for tablet and mobile use
- **Real-time Validation**: Form inputs are validated in real-time with immediate feedback

This project provides a comprehensive solution for academic conference planning with particular strength in manual session scheduling and round table management.
