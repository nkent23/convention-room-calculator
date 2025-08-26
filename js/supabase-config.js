// Supabase Configuration
class SupabaseConfig {
    constructor() {
        // These will be set via environment variables in production
        this.supabaseUrl = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_URL) || 'https://pygjrxofwyxnxywzkozx.supabase.co';
        this.supabaseAnonKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB5Z2pyeG9md3l4bnh5d3prb3p4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwOTIyMDYsImV4cCI6MjA3MTY2ODIwNn0.cVTxbp2GXvBp_LujnIzSkd2RbFS-iwnOnAeWqu-z2HM';
        
        // Initialize Supabase client
        this.supabase = supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);
        
        // Current convention ID (you can enhance this with URL params or user sessions)
        this.currentConventionId = this.getOrCreateConventionId();
    }

    getOrCreateConventionId() {
        // For now, use localStorage. In production, you might use user sessions
        let conventionId = localStorage.getItem('currentConventionId');
        if (!conventionId) {
            conventionId = this.generateUUID();
            localStorage.setItem('currentConventionId', conventionId);
        }
        return conventionId;
    }

    generateUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    async saveConvention(conventionData) {
        const { data, error } = await this.supabase
            .from('conventions')
            .upsert([{
                id: this.currentConventionId,
                ...conventionData,
                updated_at: new Date().toISOString()
            }]);
        
        if (error) {
            console.error('Error saving convention:', error);
            throw error;
        }
        return data;
    }

    async loadConvention() {
        const { data, error } = await this.supabase
            .from('conventions')
            .select('*')
            .eq('id', this.currentConventionId)
            .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
            console.error('Error loading convention:', error);
            throw error;
        }
        return data;
    }

    async saveRoomNames(roomNames) {
        // Delete existing room names for this convention
        await this.supabase
            .from('room_names')
            .delete()
            .eq('convention_id', this.currentConventionId);

        // Insert new room names
        if (roomNames.size > 0) {
            const roomNamesArray = Array.from(roomNames.entries()).map(([roomNumber, customName]) => ({
                convention_id: this.currentConventionId,
                room_number: parseInt(roomNumber),
                custom_name: customName
            }));

            const { error } = await this.supabase
                .from('room_names')
                .insert(roomNamesArray);

            if (error) {
                console.error('Error saving room names:', error);
                throw error;
            }
        }
    }

    async loadRoomNames() {
        const { data, error } = await this.supabase
            .from('room_names')
            .select('*')
            .eq('convention_id', this.currentConventionId);

        if (error) {
            console.error('Error loading room names:', error);
            throw error;
        }

        const roomNamesMap = new Map();
        data.forEach(room => {
            roomNamesMap.set(room.room_number, room.custom_name);
        });
        return roomNamesMap;
    }

    async savePaper(paperData) {
        const { data, error } = await this.supabase
            .from('papers')
            .insert([{
                convention_id: this.currentConventionId,
                ...paperData
            }]);

        if (error) {
            console.error('Error saving paper:', error);
            throw error;
        }
        return data;
    }

    async loadPapers() {
        const { data, error } = await this.supabase
            .from('papers')
            .select('*')
            .eq('convention_id', this.currentConventionId);

        if (error) {
            console.error('Error loading papers:', error);
            throw error;
        }

        const papersMap = new Map();
        data.forEach(paper => {
            papersMap.set(paper.id, {
                id: paper.id,
                title: paper.title,
                student: paper.student_name,
                school: paper.school,
                category: paper.category,
                email: paper.email
            });
        });
        return papersMap;
    }

    async deletePaper(paperId) {
        const { error } = await this.supabase
            .from('papers')
            .delete()
            .eq('id', paperId);

        if (error) {
            console.error('Error deleting paper:', error);
            throw error;
        }
    }

    async saveModerator(moderatorData) {
        const { data, error } = await this.supabase
            .from('moderators')
            .insert([{
                convention_id: this.currentConventionId,
                ...moderatorData
            }]);

        if (error) {
            console.error('Error saving moderator:', error);
            throw error;
        }
        return data;
    }

    async loadModerators() {
        const { data, error } = await this.supabase
            .from('moderators')
            .select('*')
            .eq('convention_id', this.currentConventionId);

        if (error) {
            console.error('Error loading moderators:', error);
            throw error;
        }

        const moderatorsMap = new Map();
        data.forEach(moderator => {
            moderatorsMap.set(moderator.id, moderator);
        });
        return moderatorsMap;
    }

    async deleteModerator(moderatorId) {
        const { error } = await this.supabase
            .from('moderators')
            .delete()
            .eq('id', moderatorId);

        if (error) {
            console.error('Error deleting moderator:', error);
            throw error;
        }
    }

    async saveChair(chairData) {
        const { data, error } = await this.supabase
            .from('chairs')
            .insert([{
                convention_id: this.currentConventionId,
                ...chairData
            }]);

        if (error) {
            console.error('Error saving chair:', error);
            throw error;
        }
        return data;
    }

    async loadChairs() {
        const { data, error } = await this.supabase
            .from('chairs')
            .select('*')
            .eq('convention_id', this.currentConventionId);

        if (error) {
            console.error('Error loading chairs:', error);
            throw error;
        }

        const chairsMap = new Map();
        data.forEach(chair => {
            chairsMap.set(chair.id, chair);
        });
        return chairsMap;
    }

    async deleteChair(chairId) {
        const { error } = await this.supabase
            .from('chairs')
            .delete()
            .eq('id', chairId);

        if (error) {
            console.error('Error deleting chair:', error);
            throw error;
        }
    }

    async saveSession(sessionKey, sessionData) {
        const { data, error } = await this.supabase
            .from('sessions')
            .upsert([{
                convention_id: this.currentConventionId,
                session_key: sessionKey,
                ...sessionData,
                updated_at: new Date().toISOString()
            }]);

        if (error) {
            console.error('Error saving session:', error);
            throw error;
        }
        return data;
    }

    async loadSessions() {
        const { data, error } = await this.supabase
            .from('sessions')
            .select('*')
            .eq('convention_id', this.currentConventionId);

        if (error) {
            console.error('Error loading sessions:', error);
            throw error;
        }

        const sessionsMap = new Map();
        data.forEach(session => {
            sessionsMap.set(session.session_key, {
                sessionType: session.session_type,
                day: session.day,
                timeSlot: session.time_slot,
                sessionNumber: session.session_number,
                paperCount: session.paper_count,
                category: session.category,
                preferredRoom: session.preferred_room,
                notes: session.notes,
                moderatorName: session.moderator_name,
                moderatorSchool: session.moderator_school,
                chairName: session.chair_name,
                chairSchool: session.chair_school,
                isCustomized: session.is_customized
            });
        });
        return sessionsMap;
    }

    async savePaperAssignments(assignments) {
        // Delete existing assignments for this convention
        await this.supabase
            .from('paper_assignments')
            .delete()
            .eq('convention_id', this.currentConventionId);

        // Insert new assignments
        const assignmentsArray = [];
        assignments.forEach((paperIds, sessionId) => {
            paperIds.forEach(paperId => {
                assignmentsArray.push({
                    convention_id: this.currentConventionId,
                    session_id: sessionId,
                    paper_id: paperId
                });
            });
        });

        if (assignmentsArray.length > 0) {
            const { error } = await this.supabase
                .from('paper_assignments')
                .insert(assignmentsArray);

            if (error) {
                console.error('Error saving paper assignments:', error);
                throw error;
            }
        }
    }

    async loadPaperAssignments() {
        const { data, error } = await this.supabase
            .from('paper_assignments')
            .select('*')
            .eq('convention_id', this.currentConventionId);

        if (error) {
            console.error('Error loading paper assignments:', error);
            throw error;
        }

        const assignmentsMap = new Map();
        data.forEach(assignment => {
            if (!assignmentsMap.has(assignment.session_id)) {
                assignmentsMap.set(assignment.session_id, []);
            }
            assignmentsMap.get(assignment.session_id).push(assignment.paper_id);
        });
        return assignmentsMap;
    }
}

// Global instance
window.supabaseConfig = new SupabaseConfig();
