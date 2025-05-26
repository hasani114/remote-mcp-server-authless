import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Define our MCP agent with tools
export class MyMCP extends McpAgent {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool(
			"add",
			{ a: z.number(), b: z.number() },
			async ({ a, b }) => ({
				content: [{ type: "text", text: String(a + b) }],
			})
		);

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			}
		);
		// Chicken crossing joke tool
		this.server.tool(
			"joke",
			{},
			async () => ({
				content: [
					{ type: "text", text: "Why did the chicken cross the road? To get to the other side!" },
				],
			})
		);

		// Gemini Audio Transcription tool
		this.server.tool(
			"transcribeAudio",
			{
				base64Audio: z.string(),
				mimeType: z.string(),
			},
			async ({ base64Audio, mimeType }) => {
				const API_KEY = "YOUR_GEMINI_API_KEY_HERE"; // Hardcoded as requested
				const genAI = new GoogleGenerativeAI(API_KEY);
				const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

				const contents = [
					{
						inlineData: {
							mimeType: mimeType,
							data: base64Audio,
						},
					},
				];

				try {
					const result = await model.generateContent({ contents });
					const response = result.response;
					const text = response.text();
					return { content: [{ type: "text", text: text }] };
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error transcribing audio: ${error.message}`,
							},
						],
					};
				}
			}
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			// @ts-ignore
			return MyMCP.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			// @ts-ignore
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
