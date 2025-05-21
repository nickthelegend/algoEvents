import { NextResponse } from "next/server"
import { Resend } from "resend"
import * as QRCode from "qrcode"
import crypto from "crypto"
const resend = new Resend(process.env.RESEND_API_KEY)

// Types for our data structures
type TicketData = {
  assetId: number
  userAddress: string
  eventId: string | number
  timestamp: string
  eventName: string
}

type QRPayload = {
  payload: TicketData
  signature: string
}

type Event = {
  event_name: string
  description?: string
  location?: string
  venue?: string
  event_date?: string
}

type TicketDetails = {
  assetId: number
  userAddress: string
  eventId: string | number
}

// Function to sign the payload
function signPayload(payload: TicketData, privateKey: string): string {
  const payloadString = JSON.stringify(payload)
  const sign = crypto.createSign("SHA256")
  sign.update(payloadString)
  sign.end()
  return sign.sign(privateKey, "hex")
}

// Function to generate QR code as data URL
async function generateQRCodeBase64(data: string): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      errorCorrectionLevel: "H",
      margin: 4,
      width: 400,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    })
  } catch (err) {
    console.error("Error generating QR code:", err)
    throw new Error("Failed to generate QR code")
  }
}

export async function POST(request: Request) {
  try {
    const { email, audienceId, event, ticketDetails, subject, htmlContent } = await request.json()

    // Add contact to audience if audienceId is provided
    if (audienceId) {
      await resend.contacts.create({
        email,
        unsubscribed: false,
        audienceId,
      })
    }

    // If subject and htmlContent are provided, send a custom email
    if (subject && htmlContent) {
      await resend.emails.send({
        from: "Events <events@nickthelegend.tech>",
        to: email,
        subject: subject,
        html: htmlContent,
      })

      return NextResponse.json({ success: true, message: "Custom email sent successfully" })
    }
    // Generate and send ticket email if ticketDetails are provided
    else if (ticketDetails && event) {
      // Generate ticket email with QR code
      const ticketData: TicketData = {
        assetId: ticketDetails.assetId,
        userAddress: ticketDetails.userAddress,
        eventId: ticketDetails.eventId,
        timestamp: new Date().toISOString(),
        eventName: event.event_name,
      }

      // Sign the data
      const signature = signPayload(ticketData, process.env.TICKET_SIGNING_PRIVATE_KEY || "")

      // Create QR payload
      const qrPayload: QRPayload = {
        payload: ticketData,
        signature,
      }

      // Generate QR code
      const qrDataUrl = await generateQRCodeBase64(JSON.stringify(qrPayload))

      // Extract base64 data from Data URL
      const base64Data = qrDataUrl.split(",")[1]

      // Generate HTML content for ticket email
      const ticketEmailContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
          <h1 style="color: #6366f1; text-align: center; margin-bottom: 20px;">Your Ticket for ${event.event_name}</h1>
          
          <div style="background-color: #f8f9fa; border-radius: 8px; padding: 20px; margin-bottom: 20px;">
            <h2 style="margin-top: 0;">Event Details</h2>
            <p><strong>Event:</strong> ${event.event_name}</p>
            ${event.event_date ? `<p><strong>Date:</strong> ${new Date(event.event_date).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>` : ""}
            ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ""}
            ${event.venue ? `<p><strong>Venue:</strong> ${event.venue}</p>` : ""}
          </div>
          
          <div style="text-align: center; margin-bottom: 20px;">
            <h2>Your Ticket QR Code</h2>
            <p>Present this QR code at the event entrance for check-in</p>
            <img src="cid:qrcode" alt="Ticket QR Code" style="max-width: 300px; border-radius: 8px; border: 1px solid #ddd;" />
          </div>
          
          <div style="background-color: #f0f4ff; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
            <h3 style="margin-top: 0; color: #6366f1;">Ticket Information</h3>
            <p><strong>Asset ID:</strong> ${ticketDetails.assetId}</p>
            <p><strong>Wallet Address:</strong> ${ticketDetails.userAddress}</p>
            <p><strong>Issued:</strong> ${new Date().toLocaleString()}</p>
          </div>
          
          <div style="text-align: center; color: #666; font-size: 14px;">
            <p>This ticket is non-transferable and linked to your wallet address.</p>
            <p>For any questions, please contact the event organizer.</p>
          </div>
        </div>
      `

      await resend.emails.send({
        from: "Events <events@nickthelegend.tech>",
        to: email,
        subject: `Your Ticket for ${event.event_name} is Confirmed! 🎉`,
        html: ticketEmailContent,
        attachments: [
          {
            content: base64Data,
            filename: "qrcode.png",
            contentType: "image/png",
            disposition: "inline",
            contentId: "qrcode",
          },
        ],
      })

      return NextResponse.json({ success: true, message: "Ticket email sent successfully" })
    } else {
      return NextResponse.json({ error: "Invalid request parameters" }, { status: 400 })
    }
  } catch (error) {
    console.error("Resend API Error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
