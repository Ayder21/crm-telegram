
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
    } catch (error: any) {
        console.error("OpenAI Error:", error.message);
        if (error.code) console.error("Error Code:", error.code);
        if (error.type) console.error("Error Type:", error.type);
    }
}

main();
