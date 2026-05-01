import { NextResponse } from "next/server";

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        const sarvamKey = process.env.NEXT_PUBLIC_SARVAM_API_KEY || process.env.SARVAM_API_KEY;
        if (!sarvamKey) {
            return NextResponse.json({ error: "No Sarvam API Key configuration found." }, { status: 500 });
        }

        const res = await fetch("https://api.sarvam.ai/text-to-speech", {
            method: "POST",
            headers: {
                "api-subscription-key": sarvamKey,
                "Content-Type": "application/json"
            },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errText = await res.text();
            return NextResponse.json({ error: errText }, { status: res.status });
        }

        const data = await res.json();
        return NextResponse.json(data);
    } catch (error: any) {
        console.error("TTS Proxy Error:", error);
        return NextResponse.json({ error: "Failed to process TTS request" }, { status: 500 });
    }
}
