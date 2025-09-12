"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dynamic = void 0;
exports.POST = POST;
const server_1 = require("next/server");
const openai_1 = __importDefault(require("openai"));
const function_caller_1 = require("@/services/chat/function-caller");
const function_schemas_1 = require("@/services/chat/function-schemas");
exports.dynamic = 'force-dynamic';
const openai = new openai_1.default({
    apiKey: process.env.OPENAI_API_KEY
});
const functionCaller = new function_caller_1.FunctionCaller();
// Model routing based on task type
function pickModel(toolName) {
    if (!toolName)
        return 'gpt-4o-mini'; // Default for planning/chat
    // Longform content generation needs quality
    if (['generate_article', 'create_content_strategy'].includes(toolName)) {
        return 'gpt-4o';
    }
    // Everything else can use mini
    return 'gpt-4o-mini';
}
// Helper to estimate token count (simplified)
function estimateTokens(text) {
    return Math.ceil(text.length / 4); // Rough approximation
}
// Trim history to stay under token limits
function trimHistory(history, maxTokens = 8000) {
    let totalTokens = 0;
    const trimmed = [];
    // Keep messages from newest to oldest until we hit the limit
    for (let i = history.length - 1; i >= 0; i--) {
        const message = history[i];
        const messageTokens = estimateTokens(JSON.stringify(message));
        if (totalTokens + messageTokens > maxTokens) {
            break;
        }
        totalTokens += messageTokens;
        trimmed.unshift(message);
    }
    return trimmed;
}
async function POST(request) {
    try {
        const { systemPrompt, history, userMessage, userToken, siteUrl, availableTools = [] } = await request.json();
        if (!userToken || !userMessage) {
            return server_1.NextResponse.json({
                error: 'Missing required fields'
            }, { status: 400 });
        }
        // Trim history to prevent context overflow
        const trimmedHistory = trimHistory(history, 6000);
        // Build messages array
        const messages = [
            { role: 'system', content: systemPrompt },
            ...trimmedHistory,
            { role: 'user', content: userMessage }
        ];
        // Get available function schemas with dynamic filtering
        const filteredSchemas = availableTools.length > 0
            ? (0, function_schemas_1.getFunctionSchemas)({ functionNames: availableTools })
            : (0, function_schemas_1.getFunctionSchemas)();
        let toolResults = {};
        let guard = 0;
        const MAX_TOOL_STEPS = 5;
        const startTime = Date.now();
        const MAX_RUNTIME_MS = 30000; // 30 seconds
        // Multi-turn tool execution loop
        while (guard++ < MAX_TOOL_STEPS) {
            // Check runtime limit
            if (Date.now() - startTime > MAX_RUNTIME_MS) {
                console.warn('[LLM] Runtime limit exceeded');
                break;
            }
            // Determine model based on expected tool usage
            const expectedTool = guard === 1 ? predictLikelyTool(userMessage, filteredSchemas) : undefined;
            const model = pickModel(expectedTool);
            const response = await openai.chat.completions.create({
                model,
                messages,
                tools: filteredSchemas.map(func => ({
                    type: 'function',
                    function: func
                })),
                tool_choice: 'auto',
                temperature: 0.3, // Lower for tool accuracy
                max_tokens: 1200
            });
            const choice = response.choices[0];
            const messageContent = choice.message;
            // If no tool calls, we're done
            if (!messageContent.tool_calls?.length) {
                return server_1.NextResponse.json({
                    success: true,
                    content: messageContent.content || 'Done.',
                    toolResults,
                    steps: guard - 1,
                    model
                });
            }
            // Execute all tool calls in parallel
            await Promise.all(messageContent.tool_calls.map(async (toolCall) => {
                if (toolCall.type !== 'function')
                    return;
                const functionName = toolCall.function.name;
                let functionArgs;
                try {
                    functionArgs = JSON.parse(toolCall.function.arguments || '{}');
                }
                catch (error) {
                    console.error('[LLM] Invalid function arguments JSON:', error);
                    toolResults[toolCall.id] = {
                        success: false,
                        error: 'Invalid function arguments format'
                    };
                    return;
                }
                // Validate arguments with Zod
                const validation = (0, function_schemas_1.validateFunctionArgs)(functionName, functionArgs);
                if (!validation.success) {
                    console.error('[LLM] Argument validation failed:', validation.error);
                    toolResults[toolCall.id] = {
                        success: false,
                        error: `Validation error: ${validation.error}`
                    };
                    return;
                }
                functionArgs = validation.data;
                // Validate site ownership for security
                if (functionArgs.site_url && siteUrl) {
                    const normalizedArg = normalizeSiteUrl(functionArgs.site_url);
                    const normalizedSite = normalizeSiteUrl(siteUrl);
                    if (normalizedArg !== normalizedSite) {
                        console.error('[LLM] Site URL mismatch - potential security issue');
                        toolResults[toolCall.id] = {
                            success: false,
                            error: 'Unauthorized site access'
                        };
                        return;
                    }
                }
                const executionStart = Date.now();
                try {
                    const result = await functionCaller.executeFunction(functionName, functionArgs);
                    const executionTime = Date.now() - executionStart;
                    toolResults[toolCall.id] = result;
                    // Log for observability
                    console.log(`[LLM] Tool executed: ${functionName} in ${executionTime}ms`, {
                        success: result.success,
                        argsHash: hashArgs(functionArgs)
                    });
                    // Record activity asynchronously (non-blocking)
                    recordFunctionCallSafely(userToken, functionName, functionArgs, result, siteUrl);
                }
                catch (error) {
                    console.error(`[LLM] Tool execution failed: ${functionName}`, error);
                    toolResults[toolCall.id] = {
                        success: false,
                        error: error instanceof Error ? error.message : 'Unknown error'
                    };
                }
                // Add tool result to messages
                messages.push({
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(toolResults[toolCall.id])
                });
            }));
            // Add the assistant message that made the tool calls
            messages.push({
                role: 'assistant',
                content: messageContent.content || '',
                tool_calls: messageContent.tool_calls
            });
        }
        return server_1.NextResponse.json({
            success: true,
            content: 'Completed after maximum tool steps.',
            toolResults,
            steps: guard - 1
        });
    }
    catch (error) {
        console.error('[LLM] Error:', error);
        return server_1.NextResponse.json({
            success: false,
            error: error instanceof Error ? error.message : 'LLM processing failed'
        }, { status: 500 });
    }
}
// Helper functions
function normalizeSiteUrl(url) {
    return url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '').toLowerCase();
}
function hashArgs(args) {
    return Buffer.from(JSON.stringify(args)).toString('base64').slice(0, 8);
}
function predictLikelyTool(userMessage, schemas) {
    const msg = userMessage.toLowerCase();
    if (msg.includes('generate') && msg.includes('article'))
        return 'generate_article';
    if (msg.includes('connect') && msg.includes('gsc'))
        return 'connect_gsc';
    if (msg.includes('sync') || msg.includes('update'))
        return 'sync_gsc_data';
    if (msg.includes('audit') || msg.includes('check'))
        return 'audit_site';
    return undefined;
}
async function recordFunctionCallSafely(userToken, functionName, args, result, siteUrl) {
    try {
        // Call our activity recording endpoint instead of direct DB access
        await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/agent/record-activity`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userToken,
                functionName,
                args,
                result,
                siteUrl
            })
        });
    }
    catch (error) {
        console.error('[LLM] Failed to record activity:', error);
    }
}
// Function schemas are now imported from shared location
