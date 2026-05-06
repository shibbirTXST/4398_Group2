import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });


export async function getGenresFromMood(userPrompt) {
    const prompt = `
    You are an empathetic, friendly anime recommendation bot. 
    A user will describe their mood. Your job is to:
    1. Acknowledge their feeling in a short, friendly, and natural sentence.
    2. Map their request to 1 or 2 Jikan API genre IDs.
    
    Valid Jikan Genre IDs:
    Action = 1, Adventure = 2, Comedy = 4, Drama = 8, Fantasy = 10, 
    Horror = 14, Romance = 22, Sci-Fi = 24, Slice of Life = 36, Supernatural = 37
    
    User Request: "${userPrompt}"    
    
    You MUST respond with only a JSON object in this format, and absolutely nothing else. Do not use markdown backticks:
    {
       "friendly_message": "Oh no, I'm sorry you're feeling down! A good laugh always helps me feel better.",
       "genres": [id1, id2]
    }
`;

    try {
        const response = await ai.models.generateContent({

            model: "gemini-3-flash-preview",
            contents: prompt
        });

        const responseText = response.text;
        const parsedData = JSON.parse(responseText.trim());

        return parsedData;
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw new Error("Failed to interpret your mood")
    }
}