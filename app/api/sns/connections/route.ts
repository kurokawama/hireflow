import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/authz";
import {
  listSNSConnections,
  revokeSNSConnection,
  deleteSNSConnection,
} from "@/lib/actions/sns-connections";

// GET /api/sns/connections — List all connections
export async function GET() {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const connections = await listSNSConnections();

    // Mask access tokens for security
    const maskedConnections = connections.map((conn) => ({
      ...conn,
      access_token: conn.access_token.substring(0, 8) + "***",
      refresh_token: conn.refresh_token
        ? conn.refresh_token.substring(0, 8) + "***"
        : null,
    }));

    return NextResponse.json({ data: maskedConnections });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error && error.message === "Forbidden") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    console.error("List connections error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/sns/connections — Revoke or delete a connection
export async function DELETE(request: NextRequest) {
  try {
    await requireAuth(["admin", "hq_staff"]);
    const { connectionId, permanent } = await request.json();

    if (!connectionId) {
      return NextResponse.json(
        { error: "connectionId is required" },
        { status: 400 }
      );
    }

    let success: boolean;
    if (permanent) {
      success = await deleteSNSConnection(connectionId);
    } else {
      success = await revokeSNSConnection(connectionId);
    }

    if (!success) {
      return NextResponse.json(
        { error: "Failed to disconnect" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Delete connection error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
