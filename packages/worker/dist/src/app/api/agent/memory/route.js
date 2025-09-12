"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.GET = GET;
exports.POST = POST;
exports.PUT = PUT;
exports.DELETE = DELETE;
const server_1 = require("next/server");
const agent_memory_1 = require("@/services/agent/agent-memory");
// Force dynamic rendering
exports.dynamic = 'force-dynamic';
// Get agent memory for a website
async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteToken = searchParams.get('websiteToken');
        const memoryType = searchParams.get('memoryType');
        const memoryKey = searchParams.get('memoryKey');
        if (!userToken || !websiteToken) {
            return server_1.NextResponse.json({ error: 'User token and website token required' }, { status: 400 });
        }
        const agentMemory = new agent_memory_1.AgentMemory(websiteToken, userToken);
        if (memoryKey && memoryType) {
            // Get specific memory entry
            const memory = await agentMemory.getMemory(memoryType, memoryKey);
            return server_1.NextResponse.json({
                success: true,
                memory
            });
        }
        else if (memoryType) {
            // Get all memories of a type
            const memories = await agentMemory.getMemoriesByType(memoryType);
            return server_1.NextResponse.json({
                success: true,
                memories
            });
        }
        else {
            // Get full website context
            const context = await agentMemory.getWebsiteContext();
            return server_1.NextResponse.json({
                success: true,
                context
            });
        }
    }
    catch (error) {
        console.error('[AGENT MEMORY API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to fetch agent memory' }, { status: 500 });
    }
}
// Store agent memory
async function POST(request) {
    try {
        const { userToken, websiteToken, memoryType, memoryKey, memoryData, confidenceScore, expiresIn, metadata } = await request.json();
        if (!userToken || !websiteToken || !memoryType || !memoryKey || !memoryData) {
            return server_1.NextResponse.json({ error: 'User token, website token, memory type, key, and data required' }, { status: 400 });
        }
        const agentMemory = new agent_memory_1.AgentMemory(websiteToken, userToken);
        const success = await agentMemory.storeMemory(memoryType, memoryKey, memoryData, {
            confidenceScore,
            expiresIn,
            metadata
        });
        if (success) {
            return server_1.NextResponse.json({
                success: true,
                message: 'Memory stored successfully'
            });
        }
        else {
            return server_1.NextResponse.json({ error: 'Failed to store memory' }, { status: 500 });
        }
    }
    catch (error) {
        console.error('[AGENT MEMORY API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to store agent memory' }, { status: 500 });
    }
}
// Update website context (batch operation)
async function PUT(request) {
    try {
        const { userToken, websiteToken, contextUpdates } = await request.json();
        if (!userToken || !websiteToken || !contextUpdates) {
            return server_1.NextResponse.json({ error: 'User token, website token, and context updates required' }, { status: 400 });
        }
        const agentMemory = new agent_memory_1.AgentMemory(websiteToken, userToken);
        let successCount = 0;
        // Store each context update as a separate memory entry
        for (const [key, value] of Object.entries(contextUpdates)) {
            const success = await agentMemory.storeMemory('context', key, { [key]: value });
            if (success)
                successCount++;
        }
        return server_1.NextResponse.json({
            success: true,
            message: `Updated ${successCount} context entries`
        });
    }
    catch (error) {
        console.error('[AGENT MEMORY API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to update agent memory' }, { status: 500 });
    }
}
// Clean up old memories
async function DELETE(request) {
    try {
        const { searchParams } = new URL(request.url);
        const userToken = searchParams.get('userToken');
        const websiteToken = searchParams.get('websiteToken');
        if (!userToken || !websiteToken) {
            return server_1.NextResponse.json({ error: 'User token and website token required' }, { status: 400 });
        }
        const agentMemory = new agent_memory_1.AgentMemory(websiteToken, userToken);
        const cleanedCount = await agentMemory.cleanup();
        return server_1.NextResponse.json({
            success: true,
            message: `Cleaned up ${cleanedCount} expired memories`
        });
    }
    catch (error) {
        console.error('[AGENT MEMORY API] Unexpected error:', error);
        return server_1.NextResponse.json({ error: 'Failed to clean up agent memory' }, { status: 500 });
    }
}
