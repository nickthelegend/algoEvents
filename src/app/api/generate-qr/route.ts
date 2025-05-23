import { type NextRequest, NextResponse } from "next/server"
import { type QRPayload, generateQRCodeDataURL, signPayload } from "@/lib/qr-utils"

export async function POST(request: NextRequest) {
  try {
    const { ticketData } = await request.json()

    if (!ticketData) {
      return NextResponse.json({ error: "Missing ticket data" }, { status: 400 })
    }

    // Validate required fields
    if (!ticketData.assetId || !ticketData.userAddress || !ticketData.eventId) {
      return NextResponse.json({ error: "Missing required ticket data fields" }, { status: 400 })
    }

    // Get the private signing key from server environment
    const signingKey = process.env.TICKET_SIGNING_PRIVATE_KEY
    if (!signingKey) {
      console.error("Missing TICKET_SIGNING_PRIVATE_KEY environment variable")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Sign the payload using the private key
    const signature = await signPayload(ticketData, signingKey)

    // Create the QR payload with the nested structure
    const qrPayload: QRPayload = {
      payload: ticketData,
      signature,
    }

    // Generate the QR code data URL
    const qrDataUrl = await generateQRCodeDataURL(JSON.stringify(qrPayload))

    if (!qrDataUrl) {
      return NextResponse.json({ error: "Failed to generate QR code" }, { status: 500 })
    }

    return NextResponse.json({ qrDataUrl })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
