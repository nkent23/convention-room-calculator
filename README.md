# Convention Room Calculator

A comprehensive web-based tool for calculating optimal room allocation for academic conventions with paper presentations and round table discussions.

## 🎯 Project Overview

This calculator helps convention organizers determine the feasibility of their event by analyzing:
- Number of available rooms at the venue
- Total papers and round table sessions to accommodate
- Convention duration and daily time slots
- Room utilization and optimization suggestions

## ✨ Currently Completed Features

### Core Functionality
- **Room Requirement Calculation**: Determines minimum rooms needed based on sessions and time constraints
- **Feasibility Analysis**: Indicates whether the convention can be accommodated with available resources
- **Real-time Updates**: Calculations update automatically as inputs change

### Input Parameters
- Convention duration (days)
- Time slots per day (standard or custom per day)
- Available rooms at hotel
- Total number of papers to present
- Papers per session
- Number of round table discussions
- Sessions per round table

### Results Display
- **Status Dashboard**: Clear feasible/not feasible indication with utilization percentage
- **Key Metrics**: Minimum rooms needed, total sessions required
- **Session Breakdown**: Detailed count of paper sessions vs. round table sessions
- **Daily Planning**: Sessions per day, rooms used per day, buffer rooms available

### Advanced Analytics
- **Detailed Schedule Table**: Day-by-day breakdown of room usage and utilization with variable time slots support
- **Interactive Chart**: Visual representation of daily room utilization showing custom slot configurations
- **Session Breakdown Grid**: Complete schedule with continuous alphabet time slots (A, B, C, D, E, F...)
- **Prioritized Session Distribution**: Paper sessions scheduled first, followed by round tables at the end of the convention
- **Custom Time Slots**: Flexible per-day time slot configuration (e.g., Day 1: 1 slot, Day 2-3: 4 slots each)
- **PDF Export**: Professional schedule export with full session details including leadership and custom time slots
- **Optimization Suggestions**: Recommendations when configuration is not feasible

### Session Leadership Management
- **Moderator Database**: Create and manage a database of potential moderators with contact details
- **Chair Database**: Maintain a roster of session chairs with institutional affiliations
- **Smart Assignment**: Dropdown selection from pre-defined moderators and chairs
- **Custom Entry**: Option to enter custom leadership for one-time assignments
- **Comprehensive Profiles**: Store names, institutions, emails, and biographical information
- **Easy Management**: Add, edit, and delete moderators and chairs through dedicated modals
- **Visual Display**: Leadership information appears directly in schedule breakdown
- **PDF Integration**: Moderator and chair details included in exported schedules
- **Flexible Assignment**: Either or both roles can be assigned per session

### Paper Management System
- **Paper Database**: Add, edit, and manage individual paper details (title, student, school, category)
- **CSV Import/Export**: Bulk import/export of paper data for easy management
- **Category System**: Organize papers by English literature categories (Poetry, Drama, Fiction, etc.)
- **Paper Assignment Modal**: Interactive drag-and-drop interface for assigning papers to sessions
- **Scrollable Interface**: Optimized scrollbar functionality for large paper collections
- **Assignment Tracking**: Real-time counters for assigned vs. unassigned papers
- **Schedule Integration**: Assigned papers display directly underneath their sessions in the schedule breakdown
- **Visual Paper Display**: Each session shows individual paper titles, students, and schools when papers are assigned

### Room Management System
- **Custom Room Names**: Replace generic "Room 1", "Room 2" with actual venue names
- **Flexible Naming**: Use descriptive names like "Conference Hall A", "Auditorium", "Meeting Room 101"
- **Real-time Updates**: Room name changes apply immediately to all schedules and exports
- **Easy Management**: Simple modal interface to manage all room names at once
- **Smart Defaults**: Automatically falls back to numbered rooms if no custom name is provided
- **Export Integration**: Custom room names appear in PDF exports and all schedule displays

### Custom Naming System
- **Time Slot Labels**: Replace generic "A", "B", "C" with meaningful names like "Opening Keynote", "Morning Session", "Lunch Break"
- **Session Names**: Customize session titles from "Session 1" to descriptive names like "Medieval Poetry Panel", "Graduate Showcase"
- **Per-Day Customization**: Different time slot names for each day (e.g., Day 1: "Opening", "Welcome"; Day 2: "Morning", "Afternoon")
- **Smart Fallbacks**: Automatically uses default labels when custom names aren't provided
- **Complete Integration**: Custom names appear throughout the interface, schedule breakdown, and PDF exports
- **Easy Management**: User-friendly modals for managing time slot and session labels
- **Real-time Updates**: Name changes immediately reflect in all displays and calculations
- **Flexible Assignment**: Mix custom and default names as needed for different parts of the schedule

### Comprehensive Daily Configuration Management
- **Per-Day Customization**: Configure time slots, available rooms, and sessions per time slot for each day independently
- **Flexible Hotel Availability**: Account for different room availability per day (e.g., banquet rooms only available certain days)
- **Variable Session Capacity**: Adjust concurrent sessions per time slot based on daily requirements and room configurations
- **Real-time Calculations**: All calculations automatically adjust to accommodate per-day variations
- **Intelligent Capacity Planning**: System calculates total convention capacity based on each day's individual configuration
- **Visual Configuration Interface**: User-friendly modal with per-day inputs and real-time capacity calculations
- **Complete Integration**: Schedule tables, charts, and PDF exports all reflect custom daily configurations
- **Smart Distribution**: Sessions distributed optimally across days based on each day's actual capacity
- **Consistent Time Slot Labeling**: Each day uses A, B, C, D... labeling independently (Day 1: A,B,C; Day 2: A,B,C,D etc.)
- **Accurate Time Display**: Time slot scheduling properly accounts for variable slots per day
- **Easy Reset**: One-click reset to standard configuration if customization is no longer needed
- **Example Use Cases**: 
  - **Day 1 (Opening)**: 1 time slot, 5 rooms available, 12 sessions (limited venue access for setup)
  - **Day 2-3 (Main Conference)**: 4 time slots, 10 rooms available, 3 sessions per slot (full venue access)
  - **Day 4 (Closing)**: 2 time slots, 8 rooms available, 2 sessions per slot (partial venue for wrap-up)
- **Realistic Hotel Scenarios**: Handle real-world constraints where different meeting spaces are available on different days

### User Interface
- **Responsive Design**: Works on desktop, tablet, and mobile devices
- **Modern Styling**: Clean, professional interface with Tailwind CSS
- **Real-time Validation**: Instant feedback on input changes
- **Visual Indicators**: Color-coded status and utilization metrics
- **Modal Overlays**: Professional modal interfaces with proper scrolling and interaction

## 🚀 Functional Entry Points

### Main Interface (`index.html`)
**Path**: `/` or `/index.html`

**Key Sections**:
- **Input Form**: Convention details configuration
- **Room Management**: Customize room names and manage venue details
- **Paper Management**: Add, edit, and assign individual papers to sessions
- **Results Panel**: Real-time calculation display
- **Detailed Breakdown**: Advanced analytics and scheduling with room assignments
- **Planning Tips**: Best practices guidance

**Input Parameters**:
- `conventionDays`: Number of days (default: 3)
- `timeSlotsPerDay`: Time slots per day - standard value (default: 4)
- `availableRooms`: Hotel rooms available - standard value (default: 10)
- `sessionsPerTimeSlot`: Concurrent sessions per time slot - standard value (default: 3)
- `customDailyConfig`: Optional per-day configuration:
  - `customTimeSlots`: Time slots per specific day (overrides standard)
  - `customRoomsPerDay`: Available rooms per specific day (overrides standard)
  - `customSessionsPerSlot`: Sessions per time slot per specific day (overrides standard)
- `totalPapers`: Papers to present (default: 60)
- `papersPerSession`: Papers per session (default: 4)
- `papersPerRoom`: Papers per room concurrent presentations (default: 1)
- `totalRoundTables`: Round table discussions (default: 12)
- `roundTableDuration`: Sessions per round table (default: 1)

## 🔧 Technical Implementation

### Technologies Used
- **HTML5**: Semantic structure and accessibility
- **Tailwind CSS**: Modern responsive styling
- **Vanilla JavaScript**: Core calculation logic and DOM manipulation
- **Chart.js**: Interactive utilization charts
- **jsPDF**: PDF generation for schedules and reports
- **Font Awesome**: Professional iconography
- **Drag & Drop API**: Native HTML5 drag-and-drop for paper assignment
- **CSS Grid & Flexbox**: Advanced layout for modal interfaces

### Key Algorithms
- **Session Calculation**: `paperSessions = ceil(totalPapers / papersPerSession)`
- **Room Requirements**: 
  - Standard: `minRooms = ceil(totalSessions / totalTimeSlots)`
  - Custom Daily Config: `minRooms = max(concurrentSessionsPerDay across all days)`
- **Feasibility Check**: `totalSessions <= totalSessionCapacity`
- **Utilization Rate**: `(totalSessions / totalSessionCapacity) × 100`

### Files Structure
```
/
├── index.html              # Main application interface
├── js/
│   └── calculator.js       # Core calculation logic and UI management
└── README.md              # Project documentation
```

## 📊 Calculation Logic

### Session Requirements
1. **Paper Sessions**: Total papers ÷ Papers per session (rounded up)
2. **Round Table Sessions**: Number of tables × Sessions per table
3. **Total Sessions**: Paper sessions + Round table sessions

### Room Analysis
1. **Total Time Slots**: Convention days × Time slots per day
2. **Total Room Slots**: Total time slots × Available rooms
3. **Minimum Rooms**: Total sessions ÷ Total time slots (rounded up)
4. **Feasibility**: Total sessions ≤ Total room slots

### Utilization Metrics
- **Overall Utilization**: (Total sessions ÷ Total room slots) × 100%
- **Daily Utilization**: Sessions per day ÷ (Time slots × Available rooms) × 100%
- **Room Distribution**: Sessions distributed evenly across days when possible

## 🎨 Features Not Yet Implemented

### Potential Enhancements
- **Session Type Priorities**: Different scheduling priorities for papers vs. round tables
- **Room Capacity Management**: Consider room sizes and audience capacity
- **Time Slot Customization**: Variable duration slots and break periods
- **Conflict Resolution**: Handle presenter availability and scheduling conflicts
- **Export Functionality**: Generate PDF schedules and reports
- **Session Categories**: Track different academic tracks or themes
- **Equipment Requirements**: Room setup and technical needs tracking
- **Historical Data**: Save and compare different convention scenarios

### Advanced Features
- **Room Capacity Management**: Consider different room sizes and capacities
- **Multi-venue Support**: Handle sessions across multiple locations
- **Presenter Management**: Track individual presenter schedules
- **Attendance Forecasting**: Predict room capacity needs
- **Budget Integration**: Cost calculation for room usage
- **Advanced Export Options**: Excel, CSV, and calendar integration

## 🌐 Production Deployment

### **Live Database & Domain Setup**

This application now supports **Supabase + Vercel** deployment for production use with persistent data storage.

#### **Quick Deploy**
1. **Database**: Set up free Supabase project (2 minutes)
2. **Hosting**: Deploy to Vercel with custom domain (5 minutes)
3. **Total Cost**: ~$10-15/year for domain (database & hosting free)

#### **Features with Database**
- ✅ **Persistent Data**: All conventions, papers, and assignments saved
- ✅ **Multi-User Ready**: Support multiple conventions simultaneously
- ✅ **Real-time Sync**: Data syncs across sessions and devices
- ✅ **Professional URLs**: Custom domain with SSL certificate
- ✅ **Scalable Architecture**: Handles growing usage automatically

#### **Deployment Guide**
See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete step-by-step instructions.

## 🚀 Future Enhancements

### Phase 1: Multi-User Features
1. **User Authentication**: Individual user accounts and permissions
2. **Team Collaboration**: Multiple organizers per convention
3. **Access Control**: Public/private convention settings

### Phase 2: Advanced Features
4. **Email Integration**: Automated notifications to moderators/chairs
5. **Calendar Export**: iCal/Google Calendar integration
6. **Advanced Analytics**: Usage statistics and optimization insights

### Phase 3: Enterprise Features
7. **API Access**: REST API for external integrations
8. **Bulk Operations**: CSV import/export for large datasets
9. **Custom Branding**: White-label solutions for institutions

## 🎯 Usage Examples

### Small Conference (Default)
- **60 papers** over **3 days** with **4 time slots/day**
- **3 sessions per time slot**, **4 papers per session**
- **12 round tables**, **1 session each**
- **Result**: Feasible with balanced distribution

### Large Convention
- **200 papers** over **5 days** with **6 time slots/day**
- **5 sessions per time slot**, **5 papers per session**
- **30 round tables**, **2 sessions each**
- **Result**: Requires careful room management but feasible

## 📋 Complete Convention Planning Workflow

### Step-by-Step Process
1. **Configure Convention**: Set basic days, time slots, and available rooms
2. **Customize Daily Configuration** (Optional): Use "Configure" button to set per-day time slots, room availability, and session capacity
3. **Customize Room Names**: Use "Manage Rooms" to replace generic room numbers with actual venue names
4. **Customize Labels** (Optional): Use "Customize Labels" and "Customize Names" to replace generic time slot and session names with meaningful titles
5. **Build Leadership Database**: Use "Manage Moderators" and "Manage Chairs" to create rosters of potential session leadership
6. **Add Papers**: Use "Manage Papers" to add individual paper details
7. **Calculate Schedule**: Generate the basic session structure based on daily configurations
8. **Assign Papers**: Use "Assign Papers to Sessions" for detailed assignment
9. **Assign Leadership**: Click individual sessions to select moderators and chairs from dropdowns or enter custom ones
10. **Review Schedule**: View assigned papers, leadership, and room assignments in the detailed breakdown with custom names
11. **Export Results**: Generate comprehensive PDF with all assignments, leadership, custom room names, custom time slot labels, and session names

### Assignment Features
- **Drag-and-Drop Interface**: Intuitive paper assignment to sessions
- **Category Filtering**: Filter papers by English literature categories
- **Real-time Validation**: Prevent over-assignment beyond session capacity
- **Visual Feedback**: See paper counts and assignments immediately
- **Schedule Integration**: Assigned papers appear in the detailed schedule breakdown

### Session Customization Features
- **Editable Sessions**: Click any session in the schedule to customize details
- **Leadership Assignment**: Select moderators and chairs from pre-built databases or enter custom ones
- **Room Preferences**: Override automatic room assignments with specific venues
- **Category Management**: Customize session categories and academic tracks
- **Special Notes**: Add equipment needs, special requirements, or other details
- **Paper Count Adjustment**: Modify number of papers per session as needed

### Database Management Features
- **Moderator Database**: Store potential moderators with names, institutions, emails, and bios
- **Chair Database**: Maintain session chairs with complete contact and background information
- **Reusable Assignments**: Pre-define leadership for quick assignment across multiple sessions
- **Contact Management**: Store email addresses and biographical details for comprehensive records
- **Easy Maintenance**: Add, edit, and delete entries through user-friendly interfaces
- **Smart Integration**: Automatic population of session assignments from database selections

## 📄 PDF Export Features

The calculator now includes comprehensive PDF export functionality:

### PDF Contents
- **Convention Overview**: Days, time slots, room count, utilization
- **Complete Schedule**: Day-by-day breakdown with custom time slot labels and session names
- **Session Details**: Paper sessions with custom names, categories, paper counts, and room assignments
- **Leadership Information**: Moderators and chairs with institutional affiliations
- **Custom Room Names**: Actual venue names instead of generic room numbers
- **Custom Time Slots**: Meaningful time slot names like "Opening Keynote" instead of "Time Slot A"
- **Custom Session Names**: Descriptive session titles like "Medieval Poetry Panel" instead of "Paper Session 1"
- **Organized Layout**: Clear hierarchy with proper spacing and line breaks
- **Professional Formatting**: Multi-page layout with automatic page breaks

### Enhanced Formatting
- **Category Display**: Session categories prominently displayed for each paper session
- **Leadership Section**: Dedicated sections for moderators and chairs with school affiliations
- **Clear Hierarchy**: Indented structure for easy reading and reference
- **No Overlapping**: Proper line spacing prevents text overlap and ensures readability
- **Multi-page Support**: Automatic page breaks when content exceeds page limits

### Export Options
- **Automatic Filename**: Includes convention duration and generation date
- **Complete Documentation**: Ready for distribution to organizers and participants
- **Print-Ready Format**: Professional layout suitable for conference programs

## 📈 Performance Metrics

- **Real-time Calculation**: Instant results on input change
- **Responsive Design**: Optimized for all device sizes
- **Accessibility**: WCAG compliant interface elements
- **Browser Support**: Modern browsers with ES6+ support

## 🚀 Quick Start

### **Local Development**
```bash
# Clone the repository
git clone https://github.com/yourusername/convention-room-calculator.git
cd convention-room-calculator

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your Supabase credentials

# Start development server
npm run dev
```

### **Production Deployment**
```bash
# Follow the deployment guide
open DEPLOYMENT.md

# Or run the setup script
node setup.js
```

---

**Built for academic conference organizers** | **Production-ready with Supabase + Vercel** | **Open for enhancements and customization**
