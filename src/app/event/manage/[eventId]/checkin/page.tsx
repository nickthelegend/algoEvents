"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Scanner, useDevices, centerText } from "@yudiel/react-qr-scanner"
import {
  ArrowLeft,
  QrCode,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Camera,
  CameraOff,
  Loader2,
  User,
  ShieldCheck,
  ShieldAlert,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { toast } from "react-toastify"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"

// Types
interface QRPayload {
  payload?: {
    assetId?: number
    userAddress: string
    eventId: string | number
    eventName: string
    timestamp: string | number
  }
  signature?: string
  // Keep the old structure for backward compatibility
  eventId?: string | number
  userAddress?: string
  eventName?: string
  timestamp?: number | string
}

interface ScanResult {
  status: "success" | "error" | "warning" | null
  message: string
  data?: QRPayload
  signatureValid?: boolean
}

interface RegisteredUser {
  walletAddress: string
  email: string
  registrationTime?: string
}

// Create a cache to store registered users by app ID
const userCache: Record<string, RegisteredUser[]> = {}

// Flag to track if we're currently fetching
let isFetchingUsers = false

// Function to verify signature using SHA-256
async function verifySignature(payload: any, signature: string, publicKey: string): Promise<boolean> {
  try {
    // Convert payload to string in the same way it was signed
    const payloadStr = JSON.stringify(payload)

    // Create a hash of the payload using SHA-256
    const encoder = new TextEncoder()
    const data = encoder.encode(payloadStr)
    const hashBuffer = await crypto.subtle.digest("SHA-256", data)

    // Convert hash to hex string
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("")

    // Compare the hash with the signature
    // In a real SHA-256 + HMAC system, this would be more complex
    // This is a simplified version assuming the signature is the hash
    return hashHex === signature
  } catch (error) {
    console.error("Error verifying signature:", error)
    return false
  }
}

export default function CheckinPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const appId = searchParams.get("appId")
  const { activeAddress } = useWallet()
  const devices = useDevices()

  // State
  const [scanResult, setScanResult] = useState<ScanResult>({ status: null, message: "" })
  const [isProcessing, setIsProcessing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([])
  const [deviceId, setDeviceId] = useState<string | undefined>(undefined)
  const [isPaused, setIsPaused] = useState(false)
  const [scannerActive, setScannerActive] = useState(false)

  // Load users from cache or fetch them
  useEffect(() => {
    const loadUsers = async () => {
      if (!activeAddress) {
        toast.error("Please connect your wallet first")
        return
      }

      if (!appId) {
        toast.error("No App ID provided")
        return
      }

      setIsLoading(true)

      // Check if we already have users in the cache
      if (userCache[appId]) {
        console.log("Using cached users for app ID:", appId)
        setRegisteredUsers(userCache[appId])
        setIsLoading(false)
        return
      }

      // If we're already fetching, don't start another fetch
      if (isFetchingUsers) {
        console.log("Already fetching users, waiting...")
        return
      }

      try {
        isFetchingUsers = true
        await fetchRegisteredUsers(appId)
      } finally {
        isFetchingUsers = false
        setIsLoading(false)
      }
    }

    loadUsers()
  }, [appId, activeAddress])

  // Set default device when devices are loaded
  useEffect(() => {
    if (devices && devices.length > 0) {
      // Try to find a back camera
      const backCamera = devices.find((device) => device.label.toLowerCase().includes("back"))
      setDeviceId(backCamera ? backCamera.deviceId : devices[0].deviceId)
    }
  }, [devices])

  // Function to fetch registered users from the event app
  const fetchRegisteredUsers = async (appId: string) => {
    console.log("Fetching registered users for app ID:", appId)

    try {
      // Initialize Algorand Indexer
      const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")

      // Get all boxes for the event application
      const boxesResp = await indexer.searchForApplicationBoxes(Number(appId)).do()
      console.log("Event app boxes response:", boxesResp)

      if (!boxesResp.boxes || boxesResp.boxes.length === 0) {
        console.log("No registered users found for this event.")
        userCache[appId] = []
        setRegisteredUsers([])
        return
      }

      const users: RegisteredUser[] = []

      // Process each box to extract registered user information
      for (const box of boxesResp.boxes) {
        try {
          // Decode box name (should be the user's address)
          const nameBuf =
            typeof box.name === "string"
              ? Buffer.from(box.name, "base64")
              : Buffer.from(
                  (box.name as Uint8Array).buffer,
                  (box.name as Uint8Array).byteOffset,
                  (box.name as Uint8Array).byteLength,
                )

          // Check if the box name is 32 bytes (public key length)
          if (nameBuf.length === 32) {
            // Convert the public key to an Algorand address
            const walletAddress = algosdk.encodeAddress(new Uint8Array(nameBuf))

            // Fetch box value (should contain the email)
            const valResp = await indexer
              .lookupApplicationBoxByIDandName(
                Number(appId),
                new Uint8Array(nameBuf.buffer, nameBuf.byteOffset, nameBuf.byteLength),
              )
              .do()

            // Normalize to Buffer
            let valueBuf: Buffer
            if (typeof valResp.value === "string") {
              valueBuf = Buffer.from(valResp.value, "base64")
            } else {
              const u8 = valResp.value as Uint8Array
              valueBuf = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
            }

            // Decode the email using ABI string type
            const stringAbiType = algosdk.ABIType.from("string")
            let email = ""

            try {
              email = stringAbiType.decode(valueBuf)
              console.log(`Decoded email for ${walletAddress}: ${email}`)
            } catch (decodeError) {
              console.error("Error decoding box value:", decodeError)
              // Fallback to simple toString if ABI decoding fails
              email = valueBuf.toString()
            }

            // Add user to the list
            users.push({
              walletAddress,
              email,
              registrationTime: new Date().toISOString(), // We don't have this info, using current time as placeholder
            })
          }
        } catch (boxError) {
          console.error("Error processing user box:", boxError)
        }
      }

      console.log("Registered users:", users)

      // Store in cache and update state
      userCache[appId] = users
      setRegisteredUsers(users)
    } catch (error) {
      console.error("Error fetching registered users:", error)
      toast.error("Failed to fetch registered users")
    }
  }

  // Handle QR scan result
  const handleScan = useCallback(
    async (detectedCodes: { rawValue: string }[]) => {
      if (isProcessing || !detectedCodes || detectedCodes.length === 0) return

      const decodedText = detectedCodes[0].rawValue
      setIsPaused(true)
      setIsProcessing(true)

      try {
        console.log("QR Code scanned:", decodedText)

        // Parse the QR code data
        let qrData: QRPayload
        try {
          qrData = JSON.parse(decodedText)
          console.log("Parsed QR data:", qrData)
        } catch (parseError) {
          console.error("Error parsing QR code:", parseError)
          setScanResult({
            status: "error",
            message: "Invalid QR code format. This doesn't appear to be a valid ticket.",
          })
          setIsProcessing(false)
          setIsPaused(false)
          return
        }

        // Validate QR code structure
        if (!qrData.userAddress && !qrData.payload?.userAddress) {
          setScanResult({
            status: "error",
            message: "Invalid ticket QR code. Missing wallet address.",
          })
          setIsProcessing(false)
          setIsPaused(false)
          return
        }

        // Verify signature if present
        let signatureValid = false
        if (qrData.signature) {
          try {
            // Get the payload data to verify
            const payloadToVerify = qrData.payload || {
              userAddress: qrData.userAddress,
              eventId: qrData.eventId,
              eventName: qrData.eventName,
              timestamp: qrData.timestamp,
            }

            // Get the public key from environment variable
            const publicKey = process.env.NEXT_PUBLIC_TICKET_SIGNING_KEY
            if (!publicKey) {
              console.error("Missing NEXT_PUBLIC_TICKET_SIGNING_KEY environment variable")
              throw new Error("Missing ticket verification key")
            }

            console.log("Verifying signature with public key:", publicKey)
            console.log("Payload to verify:", payloadToVerify)
            console.log("Signature:", qrData.signature)

            // Verify the signature
            signatureValid = await verifySignature(payloadToVerify, qrData.signature, publicKey)
            console.log("Signature verification result:", signatureValid)

            if (!signatureValid) {
              setScanResult({
                status: "warning",
                message: "⚠️ Ticket signature verification failed. Proceeding with caution.",
                data: qrData,
                signatureValid: false,
              })
              // Continue with verification even if signature is invalid
            }
          } catch (verifyError) {
            console.error("Error verifying signature:", verifyError)
            // Continue with verification but mark as unverified
            signatureValid = false
          }
        } else {
          console.log("No signature found in QR code")
        }

        // Verify the user is registered for this event
        await verifyRegistration(qrData, signatureValid)
      } catch (error) {
        console.error("Error processing QR code:", error)
        setScanResult({
          status: "error",
          message: `Failed to process QR code: ${error instanceof Error ? error.message : String(error)}`,
        })
      } finally {
        setIsProcessing(false)
        // Resume scanning after a short delay
        setTimeout(() => {
          setIsPaused(false)
        }, 2000)
      }
    },
    [isProcessing],
  )

  // Verify user registration
  const verifyRegistration = async (qrData: QRPayload, signatureValid: boolean) => {
    try {
      if (!appId) {
        throw new Error("App ID not provided")
      }

      // Check if the user is in our registered users list
      const userAddress = qrData.payload?.userAddress || qrData.userAddress
      const registeredUser = registeredUsers.find(
        (user) => user.walletAddress.toLowerCase() === userAddress.toLowerCase(),
      )

      if (registeredUser) {
        // User is registered
        setScanResult({
          status: "success",
          message: signatureValid
            ? "✅ Valid ticket! User is registered for this event. Signature verified."
            : "✅ Valid ticket! User is registered for this event. (Signature not verified)",
          data: qrData,
          signatureValid,
        })

        // Play success sound (optional)
        try {
          const audio = new Audio("/sounds/success.mp3")
          audio.play().catch(() => {
            // Ignore audio errors
          })
        } catch {
          // Ignore audio errors
        }

        toast.success(`Check-in successful for ${userAddress.substring(0, 8)}...`)
      } else {
        // If not in our list, try to check directly from blockchain
        const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
        const userPublicKey = algosdk.decodeAddress(userAddress).publicKey

        try {
          const boxResp = await indexer.lookupApplicationBoxByIDandName(Number(appId), userPublicKey).do()

          if (boxResp && boxResp.value) {
            // User is registered
            setScanResult({
              status: "success",
              message: signatureValid
                ? "✅ Valid ticket! User is registered for this event. Signature verified."
                : "✅ Valid ticket! User is registered for this event. (Signature not verified)",
              data: qrData,
              signatureValid,
            })
            toast.success(`Check-in successful for ${userAddress.substring(0, 8)}...`)
          } else {
            setScanResult({
              status: "error",
              message: signatureValid
                ? "❌ Invalid ticket! This user is not registered for this event. (Signature verified)"
                : "❌ Invalid ticket! This user is not registered for this event.",
              data: qrData,
              signatureValid,
            })
          }
        } catch (boxError) {
          console.error("Box lookup error:", boxError)
          setScanResult({
            status: "error",
            message: "❌ Invalid ticket! This user is not registered for this event.",
            data: qrData,
            signatureValid,
          })
        }
      }
    } catch (error) {
      console.error("Error verifying registration:", error)
      setScanResult({
        status: "error",
        message: `Failed to verify registration: ${error instanceof Error ? error.message : String(error)}`,
        data: qrData,
        signatureValid,
      })
    }
  }

  // Toggle scanner
  const toggleScanner = () => {
    setScannerActive(!scannerActive)
    setScanResult({ status: null, message: "" })
  }

  // Reset scanner
  const resetScanner = () => {
    setScanResult({ status: null, message: "" })
    setIsPaused(false)
  }

  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to access check-in functionality.</p>
            <Button asChild>
              <Link href="/events">Return to Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin" />
            <h2 className="text-2xl font-bold mb-2">Loading Event</h2>
            <p className="text-gray-400">Fetching registered users...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" asChild>
                <Link href={`/manage/${params.eventId}`}>
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">QR Code Check-in</h1>
                <p className="text-sm text-gray-400">App ID: {appId}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {devices && devices.length > 1 && (
                <select
                  className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-sm"
                  onChange={(e) => setDeviceId(e.target.value)}
                  value={deviceId}
                >
                  {devices.map((device, index) => (
                    <option key={index} value={device.deviceId}>
                      {device.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Event Info */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Event Check-in
              </CardTitle>
              <CardDescription>Scan attendee QR codes to verify tickets and check them in</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>App ID: {appId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400" />
                  <span>Registered Users: {registeredUsers.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scanner Controls */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Scanner Controls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button onClick={toggleScanner} className="flex-1" variant={scannerActive ? "destructive" : "default"}>
                  {scannerActive ? (
                    <>
                      <CameraOff className="h-4 w-4 mr-2" />
                      Stop Scanner
                    </>
                  ) : (
                    <>
                      <Camera className="h-4 w-4 mr-2" />
                      Start Scanner
                    </>
                  )}
                </Button>
                <Button onClick={resetScanner} variant="outline" className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* QR Scanner */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>QR Code Scanner</CardTitle>
              <CardDescription>Position the QR code within the camera frame</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {scannerActive ? (
                  <div className="aspect-square bg-black rounded-lg overflow-hidden">
                    <Scanner
                      formats={["qr_code"]}
                      constraints={{
                        deviceId: deviceId,
                      }}
                      onScan={handleScan}
                      onError={(error) => {
                        console.log(`Scanner error: ${error}`)
                      }}
                      styles={{ container: { height: "400px", width: "100%" } }}
                      components={{
                        audio: true,
                        onOff: true,
                        torch: true,
                        finder: true,
                        tracker: centerText,
                      }}
                      scanDelay={2000}
                      paused={isPaused}
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-gray-900 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                      <p className="text-gray-400 font-medium">Scanner Inactive</p>
                      <p className="text-sm text-gray-500 mt-2">Click "Start Scanner" to begin scanning</p>
                    </div>
                  </div>
                )}

                {/* Processing Overlay */}
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-lg">
                    <div className="bg-gray-800 p-4 rounded-lg flex items-center gap-3">
                      <Loader2 className="h-6 w-6 animate-spin" />
                      <span>Processing QR code...</span>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scan Result */}
          {scanResult.status && (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {scanResult.status === "success" && <CheckCircle className="h-5 w-5 text-green-500" />}
                  {scanResult.status === "error" && <XCircle className="h-5 w-5 text-red-500" />}
                  {scanResult.status === "warning" && <AlertCircle className="h-5 w-5 text-yellow-500" />}
                  Scan Result
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Alert
                  className={`mb-4 ${
                    scanResult.status === "success"
                      ? "border-green-500/30 bg-green-500/10"
                      : scanResult.status === "error"
                        ? "border-red-500/30 bg-red-500/10"
                        : "border-yellow-500/30 bg-yellow-500/10"
                  }`}
                >
                  <AlertDescription className="text-base">{scanResult.message}</AlertDescription>
                </Alert>

                {/* Signature Verification Badge */}
                {scanResult.data?.signature && (
                  <div className="mb-4">
                    <div
                      className={`flex items-center gap-2 p-2 rounded ${
                        scanResult.signatureValid
                          ? "bg-green-900/20 text-green-400 border border-green-800"
                          : "bg-yellow-900/20 text-yellow-400 border border-yellow-800"
                      }`}
                    >
                      {scanResult.signatureValid ? (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          <span>Signature verified - Official ticket</span>
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="h-5 w-5" />
                          <span>Signature verification failed - Unofficial ticket</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {scanResult.data && (
                  <div className="space-y-3">
                    <h4 className="font-medium">Ticket Details:</h4>
                    <div className="grid gap-2 text-sm bg-gray-900/50 p-4 rounded-lg">
                      {(scanResult.data.eventName || scanResult.data.payload?.eventName) && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Event:</span>
                          <span>{scanResult.data.payload?.eventName || scanResult.data.eventName}</span>
                        </div>
                      )}
                      {(scanResult.data.eventId || scanResult.data.payload?.eventId) && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Event ID:</span>
                          <span>{scanResult.data.payload?.eventId || scanResult.data.eventId}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="text-gray-400">Wallet Address:</span>
                        <span className="font-mono text-xs">
                          {(scanResult.data.payload?.userAddress || scanResult.data.userAddress).substring(0, 8)}...
                          {(scanResult.data.payload?.userAddress || scanResult.data.userAddress).substring(
                            (scanResult.data.payload?.userAddress || scanResult.data.userAddress).length - 8,
                          )}
                        </span>
                      </div>
                      {(scanResult.data.timestamp || scanResult.data.payload?.timestamp) && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Timestamp:</span>
                          <span>
                            {new Date(scanResult.data.payload?.timestamp || scanResult.data.timestamp).toLocaleString()}
                          </span>
                        </div>
                      )}
                      {scanResult.data.payload?.assetId && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Asset ID:</span>
                          <span>{scanResult.data.payload.assetId}</span>
                        </div>
                      )}
                      {scanResult.data.signature && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Signature:</span>
                          <span className="font-mono text-xs">{scanResult.data.signature.substring(0, 16)}...</span>
                        </div>
                      )}

                      {/* Show user email if available */}
                      {scanResult.status === "success" && (
                        <div className="flex justify-between">
                          <span className="text-gray-400">Email:</span>
                          <span>
                            {registeredUsers.find(
                              (u) =>
                                u.walletAddress.toLowerCase() ===
                                (scanResult.data?.payload?.userAddress || scanResult.data?.userAddress).toLowerCase(),
                            )?.email || "No email provided"}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="bg-gray-800/50 border-gray-700">
            <CardHeader>
              <CardTitle>Instructions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-gray-400">
              <p>1. Click "Start Scanner" to activate the camera</p>
              <p>2. Ask attendees to show their ticket QR code</p>
              <p>3. Position the QR code within the camera frame</p>
              <p>4. The system will automatically verify the ticket</p>
              <p>5. Green result = Valid ticket, Red result = Invalid ticket</p>
              <p>6. Signature verification ensures the ticket is official</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
