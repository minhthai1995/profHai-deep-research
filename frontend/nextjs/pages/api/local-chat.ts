import type { NextApiRequest, NextApiResponse } from 'next';

interface LocalChatRequest {
    message: string;
    chatHistory: Array<{
        id: string;
        type: 'user' | 'assistant';
        content: string;
    }>;
}

interface LocalChatResponse {
    response: string;
    status: string;
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<LocalChatResponse>
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ response: 'Method not allowed', status: 'error' });
    }

    try {
        const { message, chatHistory }: LocalChatRequest = req.body;

        if (!message || !message.trim()) {
            return res.status(400).json({
                response: 'Message is required',
                status: 'error'
            });
        }

        // Forward request to Python backend
        const backendResponse = await fetch('http://127.0.0.1:8000/api/local-chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: message.trim(),
                chatHistory: chatHistory || []
            }),
        });

        if (!backendResponse.ok) {
            throw new Error(`Backend responded with status: ${backendResponse.status}`);
        }

        const data: LocalChatResponse = await backendResponse.json();

        return res.status(200).json(data);

    } catch (error) {
        console.error('Error in local chat API:', error);
        return res.status(500).json({
            response: 'Sorry, I encountered an error while processing your message. Please make sure you have uploaded documents and try again.',
            status: 'error'
        });
    }
} 