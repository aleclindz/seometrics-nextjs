import { NextRequest, NextResponse } from 'next/server';
import { AgentMemory, MemoryType } from '@/services/agent/agent-memory';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Get agent memory for a website
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    const memoryType = searchParams.get('memoryType') as MemoryType;
    const memoryKey = searchParams.get('memoryKey');
    
    if (!userToken || !websiteToken) {
      return NextResponse.json(
        { error: 'User token and website token required' }, 
        { status: 400 }
      );
    }

    const agentMemory = new AgentMemory(websiteToken, userToken);

    if (memoryKey && memoryType) {
      // Get specific memory entry
      const memory = await agentMemory.getMemory(memoryType, memoryKey);
      return NextResponse.json({
        success: true,
        memory
      });
    } else if (memoryType) {
      // Get all memories of a type
      const memories = await agentMemory.getMemoriesByType(memoryType);
      return NextResponse.json({
        success: true,
        memories
      });
    } else {
      // Get full website context
      const context = await agentMemory.getWebsiteContext();
      return NextResponse.json({
        success: true,
        context
      });
    }

  } catch (error) {
    console.error('[AGENT MEMORY API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent memory' }, 
      { status: 500 }
    );
  }
}

// Store agent memory
export async function POST(request: NextRequest) {
  try {
    const { 
      userToken, 
      websiteToken, 
      memoryType, 
      memoryKey, 
      memoryData,
      confidenceScore,
      expiresIn,
      metadata
    } = await request.json();
    
    if (!userToken || !websiteToken || !memoryType || !memoryKey || !memoryData) {
      return NextResponse.json(
        { error: 'User token, website token, memory type, key, and data required' }, 
        { status: 400 }
      );
    }

    const agentMemory = new AgentMemory(websiteToken, userToken);
    
    const success = await agentMemory.storeMemory(
      memoryType as MemoryType,
      memoryKey,
      memoryData,
      {
        confidenceScore,
        expiresIn,
        metadata
      }
    );

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'Memory stored successfully'
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to store memory' }, 
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('[AGENT MEMORY API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to store agent memory' }, 
      { status: 500 }
    );
  }
}

// Update website context (batch operation)
export async function PUT(request: NextRequest) {
  try {
    const { userToken, websiteToken, contextUpdates } = await request.json();
    
    if (!userToken || !websiteToken || !contextUpdates) {
      return NextResponse.json(
        { error: 'User token, website token, and context updates required' }, 
        { status: 400 }
      );
    }

    const agentMemory = new AgentMemory(websiteToken, userToken);
    let successCount = 0;
    
    // Store each context update as a separate memory entry
    for (const [key, value] of Object.entries(contextUpdates)) {
      const success = await agentMemory.storeMemory('context', key, { [key]: value });
      if (success) successCount++;
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${successCount} context entries`
    });

  } catch (error) {
    console.error('[AGENT MEMORY API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent memory' }, 
      { status: 500 }
    );
  }
}

// Clean up old memories
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userToken = searchParams.get('userToken');
    const websiteToken = searchParams.get('websiteToken');
    
    if (!userToken || !websiteToken) {
      return NextResponse.json(
        { error: 'User token and website token required' }, 
        { status: 400 }
      );
    }

    const agentMemory = new AgentMemory(websiteToken, userToken);
    const cleanedCount = await agentMemory.cleanup();

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedCount} expired memories`
    });

  } catch (error) {
    console.error('[AGENT MEMORY API] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Failed to clean up agent memory' }, 
      { status: 500 }
    );
  }
}