"use client"

import React, { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  ArrowLeft,
  Ticket,
  Loader2,
  WalletCards,
  Clock4,
  XCircle,
  Code,
  AlertCircle,
} from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "react-toastify"
import algosdk from "algosdk"
import { UserDetailsDialog } from "@/components/user-details-dialog"
import { type QRPayload, generateQRCodeDataURL, signPayload } from "@/lib/qr-utils"
import { AlgorandClient } from "@algorandfoundation/algokit-utils/types/algorand-client"
import { TicketClient } from "@/contracts/TicketClient"

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Define the EventConfig type with the new EventCost field
type EventConfig = {
  EventID: bigint
  EventName: string
  EventCategory: string
  EventCreator: string
  EventImage: string
  EventCost: bigint
  MaxParticipants: bigint
  Location: string
  StartTime: bigint
  EndTime: bigint
  RegisteredCount: bigint
  EventAppID: bigint
}

type RequestStatus = {
  exists: boolean
  status: "pending" | "approved" | "rejected" | null
  assetId?: number
}

function EventSkeleton() {
  return (
    <div className="min-h-screen bg-gray-900">
      <div className="relative h-[40vh] overflow-hidden">
        <Skeleton className="w-full h-full" />
      </div>

      <div className="container mx-auto px-4 -mt-32 relative">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <div>
              <Skeleton className="h-8 w-24 mb-4" />
              <Skeleton className="h-12 w-3/4 mb-4" />
              <div className="flex flex-wrap gap-6">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-8 w-32" />
                ))}
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr,300px] gap-8">
              <div className="space-y-8">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <Skeleton className="h-8 w-40 mb-2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-64" />
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-[200px] w-full" />
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <Skeleton className="h-8 w-40 mb-2" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <div className="flex justify-between items-center">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-6 w-16" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params)
  const router = useRouter()
  const { activeAddress, algodClient, transactionSigner } = useWallet()
  const [event, setEvent] = useState<any>(null)
  const [blockchainEvent, setBlockchainEvent] = useState<EventConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [requestStatus, setRequestStatus] = useState<RequestStatus>({ exists: false, status: null, assetId: undefined })
  const [availableTickets, setAvailableTickets] = useState<number>(0)
  const [showUserDetailsDialog, setShowUserDetailsDialog] = useState(false)
  const [userDetailsSubmitted, setUserDetailsSubmitted] = useState(false)
  const [user_id, setUserId] = useState<string | null>(null)
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [asset_id, setAssetID] = useState<bigint| null>(null)

  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  // Add userDetails state to store email from dialog
  const [userDetails, setUserDetails] = useState<{ email: string; firstName: string; lastName: string } | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true)
        setError(null)
        console.log("Fetching data for event ID:", resolvedParams.id)

        // Fetch event details from blockchain
        const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
        const appId = 739825314 // App ID

        // Updated ABI type with all fields including EventCost
        const abiType = algosdk.ABIType.from(
          "(uint64,string,string,address,string,uint64,uint64,string,uint64,uint64,uint64,uint64)",
        )

        // Get all boxes for the application
        const boxesResp = await indexer.searchForApplicationBoxes(appId).do()
        console.log("Boxes response:", boxesResp)

        // Store debug info
        setDebugInfo({
          appId,
          eventId: resolvedParams.id,
          boxCount: boxesResp.boxes.length,
          timestamp: new Date().toISOString(),
        })

        // Flag to track if we found the event
        let eventFound = false

        for (const box of boxesResp.boxes) {
          try {
            // Decode box.name
            const nameBuf =
              typeof box.name === "string"
                ? Buffer.from(box.name, "base64")
                : Buffer.from(
                    (box.name as Uint8Array).buffer,
                    (box.name as Uint8Array).byteOffset,
                    (box.name as Uint8Array).byteLength,
                  )

            // Fetch box value
            const valResp = await indexer
              .lookupApplicationBoxByIDandName(
                appId,
                new Uint8Array(nameBuf.buffer, nameBuf.byteOffset, nameBuf.byteLength),
              )
              .do()

            // Normalize to Buffer
            let buf: Buffer
            if (typeof valResp.value === "string") {
              buf = Buffer.from(valResp.value, "base64")
            } else {
              const u8 = valResp.value as Uint8Array
              buf = Buffer.from(u8.buffer, u8.byteOffset, u8.byteLength)
            }

            // ABI Decode with updated tuple structure
            const decodedTuple = abiType.decode(buf) as [
              bigint, // 0: EventID
              string, // 1: EventName
              string, // 2: EventCategory
              string, // 3: EventCreator (address)
              string, // 4: EventImage
              bigint, // 5: EventCost (new field)
              bigint, // 6: MaxParticipants
              string, // 7: Location
              bigint, // 8: StartTime
              bigint, // 9: EndTime
              bigint, // 10: RegisteredCount
              bigint, // 11: EventAppID
            ]

            // Map to EventConfig with the new EventCost field
            const eventConfig: EventConfig = {
              EventID: decodedTuple[0],
              EventName: decodedTuple[1],
              EventCategory: decodedTuple[2],
              EventCreator: decodedTuple[3],
              EventImage: decodedTuple[4],
              EventCost: decodedTuple[5], // New field
              MaxParticipants: decodedTuple[6],
              Location: decodedTuple[7],
              StartTime: decodedTuple[8],
              EndTime: decodedTuple[9],
              RegisteredCount: decodedTuple[10],
              EventAppID: decodedTuple[11],
            }

            console.log("Decoded event:", eventConfig)
            console.log("Event ID from config:", Number(eventConfig.EventID), "Looking for:", Number(resolvedParams.id))

            // Check if this is the event we're looking for
            if (Number(eventConfig.EventID) === Number(resolvedParams.id)) {
              console.log("Found matching event:", eventConfig)
              setBlockchainEvent(eventConfig)
              eventFound = true

              // Create event object from blockchain data
              const eventObj = {
                event_id: Number(eventConfig.EventID),
                event_name: eventConfig.EventName,
                description: "Event on Algorand blockchain", // Default description
                location: eventConfig.Location,
                venue: eventConfig.Location,
                event_date: new Date(Number(eventConfig.StartTime) * 1000).toISOString(),
                max_tickets: Number(eventConfig.MaxParticipants),
                ticket_price: Number(eventConfig.EventCost),
                image_url: eventConfig.EventImage,
                category: eventConfig.EventCategory.toLowerCase(),
                created_by: eventConfig.EventCreator,
                app_id: Number(eventConfig.EventAppID),
              }

              setEvent(eventObj)

              // Get count of available tickets (max - registered)
              const availableCount = Number(eventConfig.MaxParticipants) - Number(eventConfig.RegisteredCount)
              setAvailableTickets(Math.max(0, availableCount))

              break
            }
          } catch (boxError) {
            console.error("Error processing box:", boxError)
          }
        }

        if (!eventFound) {
          console.error("Event not found in blockchain data:", resolvedParams.id)
          setError(`Event with ID ${resolvedParams.id} not found in blockchain data.`)
        }

        // If wallet is connected, check for existing requests
        if (activeAddress) {
          console.log("Checking requests for wallet:", activeAddress)

          const { data: existingRequest, error } = await supabase
            .from("requests")
            .select("request_status, asset_id")
            .eq("event_id", resolvedParams.id)
            .eq("wallet_address", activeAddress)
            .order("requested_at", { ascending: false })
            .limit(1)
            .single()

          console.log("Existing request:", existingRequest, "Error:", error)

          if (existingRequest) {
            setRequestStatus({
              exists: true,
              status: existingRequest.request_status,
              assetId: existingRequest.asset_id,
            })
          } else {
            setRequestStatus({ exists: false, status: null, assetId: undefined })
          }
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(`Failed to fetch event data: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [resolvedParams.id, activeAddress])

  useEffect(() => {
    const generateQR = async () => {
      if (requestStatus.status === "approved" && event && activeAddress && requestStatus.assetId) {
        setIsGeneratingQR(true)
        try {
          console.log("Generating QR code with:", {
            assetId: requestStatus.assetId,
            userAddress: activeAddress,
            eventId: event.event_id,
          })

          const ticketData = {
            assetId: requestStatus.assetId,
            userAddress: activeAddress,
            eventId: event.event_id,
            timestamp: new Date().toISOString(),
            eventName: event.event_name,
          }

          const signature = await signPayload(ticketData, process.env.NEXT_PUBLIC_TICKET_SIGNING_KEY || "")
          const qrPayload: QRPayload = {
            payload: ticketData,
            signature,
          }

          const qrDataUrl = await generateQRCodeDataURL(JSON.stringify(qrPayload))
          console.log("QR code generated successfully:", qrDataUrl ? "success" : "failed")
          setQrCode(qrDataUrl)
        } catch (error) {
          console.error("Error generating QR code:", error)
          toast.error("Failed to generate ticket QR code")
        } finally {
          setIsGeneratingQR(false)
        }
      }
    }

    generateQR()
  }, [requestStatus.status, requestStatus.assetId, event, activeAddress])

  // Update the handleUserDetailsSubmit function
  const handleUserDetailsSubmit = async (details: { email: string; firstName: string; lastName: string }) => {
    try {
      setUserDetails(details)
      setUserDetailsSubmitted(true)
      setShowUserDetailsDialog(false)

      // Continue with the purchase process
      handlePurchaseTicket()
    } catch (error) {
      console.error("Error saving user details:", error)
      toast.error("Failed to save user details. Please try again.")
    }
  }

  // Replace the handlePurchaseTicket function with this updated version
  const handlePurchaseTicket = async () => {
    if (!activeAddress || !event || !algodClient || !transactionSigner) {
      toast.error("Please connect your wallet first")
      return
    }

    try {
      setIsPurchasing(true)

      // Get or create user and get their user_id
      if (!userDetailsSubmitted) {
        setShowUserDetailsDialog(true)
        return
      }

      // Get the app ID from the event
      const appID = event.app_id || blockchainEvent?.EventAppID

      if (!appID) {
        toast.error("Invalid application ID")
        return
      }


      const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")

      const appInfo = await indexer.lookupApplications(739832941).do();
        if(!appInfo.application){
          throw error
        }
        const globalState = appInfo.application.params['globalState'];
        if(!globalState){
          throw error
        }
        const assetIdEntry = globalState.find((entry) => {
          // Decode the key:
          let keyStr: string;
          if (typeof entry.key === 'string') {
            // entry.key is base64-encoded string
            keyStr = Buffer.from(entry.key, 'base64').toString();
          } else {
            // entry.key is Uint8Array
            keyStr = Buffer.from(entry.key).toString();
          }
          return keyStr === 'assetID';
        });
        
        if (assetIdEntry) {
          const assetID = assetIdEntry.value.uint ?? assetIdEntry.value.bytes;
          console.log('assetID:', assetID);
          setAssetID(assetID);
        } else {
          console.log('assetID not found in global state');
        }




      // Define the ABI method for registerEvent
      const METHODS = [
        new algosdk.ABIMethod({ name: "registerEvent", desc: "", args: [{ type: "string", name: "email", desc: "" }], returns: { type: "void", desc: "" } }),
      ]

      // Get transaction parameters
      const suggestedParams = await algodClient.getTransactionParams().do()

      const algorand = AlgorandClient.fromConfig({
        algodConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
        indexerConfig: {
          server: "https://testnet-api.algonode.cloud",
          port: "",
          token: "",
        },
      })

      if(!userDetails?.email){
        throw error;
      }

      // const client2 = algorand.client.getTypedAppClientById(TicketClient, {
      //   appId: BigInt(appID),
      //   defaultSender: activeAddress,
      //   defaultSigner: transactionSigner
      // });
      //       await algorand
      //   .newGroup()
      //   .addAssetOptIn({sender: activeAddress, assetId: BigInt(739833494), signer: transactionSigner} )
      //   .addAppCallMethodCall(await client2.params.registerEvent({args: { email: userDetails?.email}}))
      //   .send({populateAppCallResources: true });     

      // Create the application transaction
      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: Number(appID),
        appArgs: [
          algosdk.getMethodByName(METHODS, "registerEvent").getSelector(),
          algosdk.coerceToBytes(userDetails?.email || ""), // User email
        ],
        suggestedParams: { ...suggestedParams },
        boxes: [{ appIndex: 0, name: algosdk.decodeAddress(activeAddress).publicKey }],
      })
      if(!asset_id){
        throw error;
      }
      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: activeAddress,
        assetIndex: BigInt(asset_id),
        amount: 0,
        suggestedParams,
      })
      // Sign and send the transaction
      const signedTxns = await transactionSigner([optInTxn,txn,], [0])
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do()

      // Wait for confirmation
      const result = await algosdk.waitForConfirmation(algodClient, txid, 4)
      console.log("Transaction confirmed:", result)

      // Update local state to reflect the new request
      setRequestStatus({ exists: true, status: "pending" })
      setAvailableTickets((prev) => Math.max(0, prev - 1))

      toast.success("Ticket request submitted successfully!")
      router.refresh()
    } catch (error) {
      console.error("Error purchasing ticket:", error)
      toast.error(`Failed to purchase ticket: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return <EventSkeleton />
  }

  const renderTicketActionContent = () => {
    if (!activeAddress) {
      return (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              <WalletCards className="h-8 w-8 mb-2 mx-auto text-gray-400" />
              <p className="text-sm text-gray-400 mb-4">Please connect your wallet to purchase tickets</p>
            </div>
          </CardContent>
        </Card>
      )
    }

    if (requestStatus.exists) {
      return (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              {requestStatus.status === "pending" ? (
                <>
                  <Clock4 className="h-8 w-8 mb-2 mx-auto text-yellow-500" />
                  <p className="text-sm text-gray-400 mb-4">Your ticket request is pending approval</p>
                </>
              ) : requestStatus.status === "approved" ? (
                <div className="mt-4">
                  <p className="text-sm text-gray-400 mb-2 text-center">Your Ticket QR Code</p>
                  {isGeneratingQR ? (
                    <div className="flex justify-center items-center h-[300px]">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : qrCode ? (
                    <img
                      src={qrCode || "/placeholder.svg"}
                      alt="Ticket QR Code"
                      className="w-full max-w-[300px] mx-auto rounded-lg"
                    />
                  ) : (
                    <p className="text-sm text-red-400 text-center">Failed to generate QR code</p>
                  )}
                </div>
              ) : (
                <>
                  <XCircle className="h-8 w-8 mb-2 mx-auto text-red-500" />
                  <p className="text-sm text-gray-400 mb-4">Your ticket request was rejected</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )
    }

    return (
      <Button className="w-full" size="lg" disabled={isPast || isPurchasing} onClick={handlePurchaseTicket}>
        {isPurchasing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Ticket className="w-4 h-4 mr-2" />
            {isPast ? "Event Ended" : "Purchase Tickets"}
          </>
        )}
      </Button>
    )
  }

  if (error || (!event && !blockchainEvent)) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6">
            <div className="flex flex-col items-center text-center">
              <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
              <h2 className="text-xl font-semibold mb-2">Event Not Found</h2>
              <p className="text-gray-400 mb-6">{error || "This event doesn't exist or has been removed."}</p>
              <div className="space-y-4 w-full">
                <Button asChild className="w-full">
                  <Link href="/events">Browse All Events</Link>
                </Button>

                {/* Debug Information */}
                <div className="mt-8 border border-gray-700 rounded-md p-4 bg-gray-800/50">
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Debug Information</h3>
                  <div className="text-xs text-gray-400 font-mono space-y-1 text-left">
                    <p>Event ID: {resolvedParams.id}</p>
                    <p>App ID: {debugInfo.appId || "N/A"}</p>
                    <p>Box Count: {debugInfo.boxCount || "N/A"}</p>
                    <p>Timestamp: {debugInfo.timestamp || new Date().toISOString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Use blockchain event data if available, otherwise use database event
  const displayEvent = event || {
    event_name: blockchainEvent?.EventName,
    event_date: new Date(Number(blockchainEvent?.StartTime || 0) * 1000).toISOString(),
    description: "Event on Algorand blockchain",
    location: blockchainEvent?.Location,
    venue: blockchainEvent?.Location,
    max_tickets: Number(blockchainEvent?.MaxParticipants || 0),
    ticket_price: Number(blockchainEvent?.EventCost || 0),
    image_url: blockchainEvent?.EventImage,
    app_id: Number(blockchainEvent?.EventAppID || 0),
  }

  const eventDate = new Date(displayEvent.event_date)
  const isPast = eventDate < new Date()

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="relative h-[40vh] overflow-hidden">
        <img
          src={displayEvent.image_url?.replace("ipfs://", "https://ipfs.io/ipfs/") || "/placeholder.svg"}
          alt={displayEvent.event_name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-transparent" />
        <Link
          href="/events"
          className="absolute top-4 left-4 inline-flex items-center text-white hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Events
        </Link>
      </div>

      <div className="container mx-auto px-4 -mt-32 relative">
        <div className="max-w-4xl mx-auto">
          <div className="space-y-8">
            <div>
              <Badge variant={isPast ? "secondary" : "default"} className="mb-4">
                {isPast ? "Past Event" : "Upcoming Event"}
              </Badge>
              <h1 className="text-4xl font-bold text-white mb-4">{displayEvent.event_name}</h1>
              <div className="flex flex-wrap gap-6 text-gray-300">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 mr-2" />
                  {format(eventDate, "MMMM d, yyyy")}
                </div>
                <div className="flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {format(eventDate, "h:mm a")}
                </div>
                <div className="flex items-center">
                  <MapPin className="w-5 h-5 mr-2" />
                  {displayEvent.location}
                </div>
                <div className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  {displayEvent.max_tickets} tickets available
                </div>
                {displayEvent.app_id && (
                  <div className="flex items-center">
                    <Code className="w-5 h-5 mr-2" />
                    App ID: {displayEvent.app_id}
                  </div>
                )}
              </div>
            </div>

            <div className="grid md:grid-cols-[1fr,300px] gap-8">
              <div className="space-y-8">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle>About this event</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-300 whitespace-pre-wrap">{displayEvent.description}</p>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardHeader>
                    <CardTitle>Venue Details</CardTitle>
                    <CardDescription>{displayEvent.location}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-gray-400">
                      <p>Venue: {displayEvent.venue}</p>
                    </div>
                    <div className="aspect-video rounded-lg overflow-hidden">
                      <iframe
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={`https://www.google.com/maps/embed/v1/place?key=${
                          process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
                        }&q=${encodeURIComponent(displayEvent.venue || displayEvent.location)}`}
                      ></iframe>
                    </div>
                  </CardContent>
                </Card>

                {blockchainEvent && (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Blockchain Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Event ID:</span>
                          <span className="font-mono">{Number(blockchainEvent.EventID)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">App ID:</span>
                          <span className="font-mono">{Number(blockchainEvent.EventAppID)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Creator:</span>
                          <span className="font-mono text-xs">{blockchainEvent.EventCreator}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Registered:</span>
                          <span className="font-mono">
                            {Number(blockchainEvent.RegisteredCount)} / {Number(blockchainEvent.MaxParticipants)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Image URL:</span>
                          <span className="font-mono text-xs truncate max-w-[200px]">{blockchainEvent.EventImage}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card className="bg-gray-800/50 border-gray-700 sticky top-6">
                  <CardHeader>
                    <CardTitle>Ticket Information</CardTitle>
                    <CardDescription>{isPast ? "This event has ended" : "Secure your spot now"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Price per ticket</span>
                        <span className="text-xl font-semibold">{displayEvent.ticket_price} ALGO</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-300">Available tickets</span>
                        <span className="text-xl font-semibold">{availableTickets}</span>
                      </div>
                      {renderTicketActionContent()}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
      <UserDetailsDialog
        isOpen={showUserDetailsDialog}
        onClose={() => {
          setShowUserDetailsDialog(false)
          setIsPurchasing(false)
        }}
        onSubmit={handleUserDetailsSubmit}
      />
    </div>
  )
}
