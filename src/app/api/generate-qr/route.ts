import { type NextRequest, NextResponse } from "next/server"
import { signPayload, generateQRCodeDataURL, type QRPayload } from "@/lib/qr-utils"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assetId, userAddress, eventId, eventName } = body

    // Validate required fields
    if (!assetId || !userAddress || !eventId || !eventName) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get the private signing key from environment variable
    const privateKey = process.env.TICKET_SIGNING_PRIVATE_KEY
    if (!privateKey) {
      console.error("Missing TICKET_SIGNING_PRIVATE_KEY environment variable")
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 })
    }

    // Create the ticket data
    const ticketData = {
      assetId: Number(assetId),
      userAddress,
      eventId,
      timestamp: new Date().toISOString(),
      eventName,
    }

    // Sign the payload using SHA-256
    const signature = await signPayload(ticketData, privateKey)

    // Create the QR payload
    const qrPayload: QRPayload = {
      payload: ticketData,
      signature,
    }

    // Generate the QR code
    const qrDataUrl = await generateQRCodeDataURL(JSON.stringify(qrPayload))

    return NextResponse.json({
      success: true,
      qrCode: qrDataUrl,
      payload: qrPayload,
    })
  } catch (error) {
    console.error("Error generating QR code:", error)
    return NextResponse.json(
      { error: `Failed to generate QR code: ${error instanceof Error ? error.message : String(error)}` },
      { status: 500 },
    )
  }
}
