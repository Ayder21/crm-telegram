
import OpenAI from 'openai';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function main() {
    console.log("Testing OpenAI API...");
    try {
        const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: "Hello" }],
        });
        console.log("Success! Response:", completion.choices[0].message.content);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : "unknown_error";
        console.error("OpenAI Error:", message);
        if (typeof error === "object" && error !== null && "code" in error) {
            console.error("Error Code:", (error as { code?: unknown }).code);
        }
        if (typeof error === "object" && error !== null && "type" in error) {
            console.error("Error Type:", (error as { type?: unknown }).type);
        }
    }
}

main();
