import { Langbase, getRunner } from 'langbase';

const getLangbase = () => {
    const apiKey = process.env.NEXT_PUBLIC_LANGBASE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing Langbase API Key. Check your .env.local file.");
    }
    return new Langbase({ apiKey });
};

const langbase = getLangbase();


interface Message {
    role: "user" | "assistant";
    content: string;
}

const plainMessage: Message[] = [];
let threadId: string | undefined;
export const chatWithLangbase = async (message: string,description:string) => {
    try {
        console.log("Sending message to Langbase:", message);
        const fullMessage=message+description
        plainMessage.push({ role: "user", content: fullMessage });
 
        const response = await langbase.pipe.run({
            name: "resume-analyzer",
            stream: true,
            messages: plainMessage,
            ...(threadId && { threadId }) 
        });

        if (!threadId && response.threadId) {
            threadId = response.threadId; 
        }

        const { stream } = response;
        const runner = getRunner(stream);

        let result = "";
        await new Promise<void>((resolve) => {
            runner.on("content", (content) => {
                result += content;
            });
            runner.on("end", () => {
                resolve();
            });
        });

        return result;
    } catch (error) {
        console.error("Langbase Chat Error:", error);
        throw new Error("Failed to chat with Langbase."); //langbase error
    }
};
