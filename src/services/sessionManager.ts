interface ConversationTurn {
    role: 'user' | 'model';
    content: string;
    timestamp: Date;
}

interface ChatSession {
    sessionId: string;
    history: ConversationTurn[];
    createdAt: Date;
    lastActivity: Date;
}

export class SessionManager {
    private sessions: Map<string, ChatSession> = new Map();
    private readonly maxHistoryLength = 5; // Keep last 5 Q&A pairs (10 turns)
    private readonly sessionTimeout = 30 * 60 * 1000; // 30 minutes

    constructor() {
        // Clean up expired sessions every 10 minutes
        setInterval(() => this.cleanupExpiredSessions(), 10 * 60 * 1000);
    }

    getOrCreateSession(sessionId: string): ChatSession {
        let session = this.sessions.get(sessionId);
        
        if (!session) {
            session = {
                sessionId,
                history: [],
                createdAt: new Date(),
                lastActivity: new Date()
            };
            this.sessions.set(sessionId, session);
        } else {
            session.lastActivity = new Date();
        }
        
        return session;
    }

    addToHistory(sessionId: string, userQuery: string, modelResponse: string): void {
        const session = this.getOrCreateSession(sessionId);
        
        // Add user query
        session.history.push({
            role: 'user',
            content: userQuery,
            timestamp: new Date()
        });
        
        // Add model response
        session.history.push({
            role: 'model',
            content: modelResponse,
            timestamp: new Date()
        });
        
        // Keep only the last N Q&A pairs (2N turns)
        const maxTurns = this.maxHistoryLength * 2;
        if (session.history.length > maxTurns) {
            session.history = session.history.slice(-maxTurns);
        }
        
        session.lastActivity = new Date();
    }

    getConversationHistory(sessionId: string): ConversationTurn[] {
        const session = this.sessions.get(sessionId);
        return session ? [...session.history] : [];
    }

    formatHistoryForGemini(sessionId: string): Array<{ role: string; parts: Array<{ text: string }> }> {
        const history = this.getConversationHistory(sessionId);
        
        return history.map(turn => ({
            role: turn.role,
            parts: [{ text: turn.content }]
        }));
    }

    clearSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }

    private cleanupExpiredSessions(): void {
        const now = new Date();
        const expiredSessions: string[] = [];
        
        for (const [sessionId, session] of this.sessions.entries()) {
            if (now.getTime() - session.lastActivity.getTime() > this.sessionTimeout) {
                expiredSessions.push(sessionId);
            }
        }
        
        expiredSessions.forEach(sessionId => {
            this.sessions.delete(sessionId);
            console.log(`Cleaned up expired session: ${sessionId}`);
        });
        
        if (expiredSessions.length > 0) {
            console.log(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }

    getSessionStats(): { totalSessions: number; activeSessions: number } {
        const now = new Date();
        let activeSessions = 0;
        
        for (const session of this.sessions.values()) {
            if (now.getTime() - session.lastActivity.getTime() <= this.sessionTimeout) {
                activeSessions++;
            }
        }
        
        return {
            totalSessions: this.sessions.size,
            activeSessions
        };
    }
}