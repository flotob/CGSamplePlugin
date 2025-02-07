
export async function POST(req: Request) {
    const body = await req.json();
    console.log("message", body);
    return Response.json({ success: true });
}