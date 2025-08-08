import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  console.log("Signup route called");
  try {
    const body = await request.json();
    console.log("Received body:", body);
    
    // Return a simple success response
    return NextResponse.json(
      { 
        status: "success", 
        message: "Signup endpoint is working",
        receivedData: body
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in signup route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}