"use client"

import React, { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
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
import algosdk, { ABIType } from "algosdk"
import { type QRPayload, generateQRCodeDataURL, signPayload } from "@/lib/qr-utils"
import { UserDetailsDialog } from "@/components/user-details-dialog"

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
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [assetId, setAssetId] = useState<number | null>(null)
  const [registeredCount, setRegisteredCount] = useState<number | null>(null)

  const [isGeneratingQR, setIsGeneratingQR] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [registeredUsers, setRegisteredUsers] = useState<{ address: string; email: string }[]>([])
  const [isUserRegistered, setIsUserRegistered] = useState(false)
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
              setRegisteredCount(Number(eventConfig.RegisteredCount))

              // Fetch the asset ID for this event's app
              try {
                const appInfo = await indexer.lookupApplications(Number(eventConfig.EventAppID)).do()
                if (appInfo.application && appInfo.application.params["global-state"]) {
                  const globalState = appInfo.application.params["global-state"]
                  const assetIdEntry = globalState.find((entry: any) => {
                    // Decode the key:
                    let keyStr: string
                    if (typeof entry.key === "string") {
                      // entry.key is base64-encoded string
                      keyStr = Buffer.from(entry.key, "base64").toString()
                    } else {
                      // entry.key is Uint8Array
                      keyStr = Buffer.from(entry.key).toString()
                    }
                    return keyStr === "assetID"
                  })

                  if (assetIdEntry) {
                    const assetIdValue = assetIdEntry.value.uint
                    console.log("Found assetID in global state:", assetIdValue)
                    setAssetId(Number(assetIdValue))
                  } else {
                    console.log("assetID not found in global state")
                  }
                }
              } catch (assetError) {
                console.error("Error fetching asset ID:", assetError)
              }

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

        // Check if the user has already registered for this event
        if (activeAddress && algodClient) {
          try {
            // We'll check if the user has opted into the asset for this event
            // This is a simple way to check if they've registered
            if (assetId) {
              const accountInfo = await algodClient.accountInformation(activeAddress).do()
              const assets = accountInfo.assets || []
              const hasAsset = assets.some((asset: any) => asset["asset-id"] === assetId)

              if (hasAsset) {
                setRequestStatus({
                  exists: true,
                  status: "approved", // If they have the asset, they're approved
                  assetId: assetId,
                })
              }
            }
          } catch (error) {
            console.error("Error checking user registration:", error)
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
  }, [resolvedParams.id, activeAddress, algodClient])

  // Fetch asset ID and registered count separately when the event app ID is available
  useEffect(() => {
    async function fetchAppData() {
      if (!blockchainEvent || !blockchainEvent.EventAppID) return

      try {
        const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
        const appID = Number(blockchainEvent.EventAppID)

        console.log("Fetching app data for app ID:", appID)

        const appInfo = await indexer.lookupApplications(appID).do()

        if (!appInfo.application) {
          console.error("Application not found")
          return
        }

        // Check both "global-state" and "globalState" formats
        const globalState = appInfo.application.params["global-state"] || appInfo.application.params["globalState"]

        if (!globalState) {
          console.error("Global state not found")
          return
        }

        console.log("Global state:", globalState)

        // Find asset ID - only look for the exact key "assetID"
        const assetIdEntry = globalState.find((entry: any) => {
          let keyStr: string
          if (typeof entry.key === "string") {
            keyStr = Buffer.from(entry.key, "base64").toString()
          } else {
            keyStr = Buffer.from(entry.key).toString()
          }
          return keyStr === "assetID"
        })

        if (assetIdEntry) {
          // Try both uint and bytes formats
          const assetIdValue =
            assetIdEntry.value.uint ||
            (assetIdEntry.value.bytes
              ? Number.parseInt(Buffer.from(assetIdEntry.value.bytes, "base64").toString())
              : null)

          console.log("Found assetID in global state:", assetIdValue)
          setAssetId(Number(assetIdValue))
        } else {
          console.error("assetID not found in global state")
        }

        // Find registered count
        const registeredCountEntry = globalState.find((entry: any) => {
          let keyStr: string
          if (typeof entry.key === "string") {
            keyStr = Buffer.from(entry.key, "base64").toString()
          } else {
            keyStr = Buffer.from(entry.key).toString()
          }
          return keyStr === "registeredCount" || keyStr === "RegisteredCount"
        })

        if (registeredCountEntry) {
          // Try both uint and bytes formats
          const registeredCountValue =
            registeredCountEntry.value.uint ||
            (registeredCountEntry.value.bytes
              ? Number.parseInt(Buffer.from(registeredCountEntry.value.bytes, "base64").toString())
              : null)

          console.log("Found registeredCount in global state:", registeredCountValue)
          setRegisteredCount(Number(registeredCountValue))

          // Update available tickets based on the registered count from global state
          if (blockchainEvent && blockchainEvent.MaxParticipants) {
            const availableCount = Number(blockchainEvent.MaxParticipants) - Number(registeredCountValue)
            setAvailableTickets(Math.max(0, availableCount))
          }
        } else {
          console.log("registeredCount not found in global state, using value from event config")
        }

        // Fetch registered users from boxes
        try {
          console.log("Fetching registered users for app ID:", appID)
          const boxesResp = await indexer.searchForApplicationBoxes(appID).do()
          console.log("Event app boxes response:", boxesResp)

          const users: { address: string; email: string }[] = []

          for (const box of boxesResp.boxes) {
            try {
              // Decode box.name - this contains the user's address but not as an ABI tuple
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
                  appID,
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

              // Log raw box value for debugging
              console.log("Raw box value bytes:", Array.from(valueBuf))
              console.log("Raw box value hex:", valueBuf.toString("hex"))

              // Try to convert the box name to an Algorand address
              // The box name might be the raw public key bytes of the address
              try {
                // If the name is 32 bytes, it might be a public key
                if (nameBuf.length === 32) {
                  const addr = algosdk.encodeAddress(new Uint8Array(nameBuf))

                  // Use ABI type to decode the email string as requested
                  try {
                    const stringAbiType = algosdk.ABIType.from("string")

                    // Decode the buffer containing the encoded email
                    const email = stringAbiType.decode(valResp.value)

                    console.log("Decoded email using ABI:", valResp.value)

                    

                    users.push({
                      address: addr,
                      email: email,
                    })

                    // Check if this is the current user
                    if (activeAddress && addr === activeAddress) {
                      setIsUserRegistered(true)
                      // If the user is registered, update the request status
                      if (assetId) {
                        setRequestStatus({
                          exists: true,
                          status: "approved",
                          assetId: Number(assetId),
                        })

                        // Log that we found the user
                        console.log("Found current user in registered users:", addr)
                      }
                    }
                  } catch (abiError) {
                    console.error("Error decoding email using ABI:", abiError)

                    // Fallback to simple toString if ABI decoding fails
                    const email = valueBuf.toString()
                    console.log("Fallback email using toString:", email)

                    users.push({
                      address: addr,
                      email: email,
                    })

                    // Check if this is the current user (same as above)
                    if (activeAddress && addr === activeAddress) {
                      setIsUserRegistered(true)
                      if (assetId) {
                        setRequestStatus({
                          exists: true,
                          status: "approved",
                          assetId: Number(assetId),
                        })
                        console.log("Found current user in registered users (fallback):", addr)
                      }
                    }
                  }
                } else {
                  console.log("Box name is not 32 bytes, might not be an address:", nameBuf.length)
                  // Try to interpret the box name and value as strings for debugging
                  console.log("Box name as string:", nameBuf.toString())
                  console.log("Box value as string:", valueBuf.toString())
                }
              } catch (decodeError) {
                console.error("Error processing box name as address:", decodeError)
              }
            } catch (boxError) {
              console.error("Error processing box for registered user:", boxError)
            }
          }

          console.log("Registered users:", users)
          setRegisteredUsers(users)
        } catch (boxesError) {
          console.error("Error fetching boxes for registered users:", boxesError)
        }
      } catch (error) {
        console.error("Error fetching app data:", error)
      }
    }

    fetchAppData()
  }, [blockchainEvent, activeAddress])

  // Update the useEffect for QR code generation to also check isUserRegistered
  // Replace the existing QR code generation useEffect with this updated version:

  useEffect(() => {
    const generateQR = async () => {
      // Check if user is registered either through requestStatus or isUserRegistered flag
      if ((requestStatus.status === "approved" || isUserRegistered) && event && activeAddress && assetId) {
        setIsGeneratingQR(true)
        try {
          console.log("Generating QR code with:", {
            assetId: assetId,
            userAddress: activeAddress,
            eventId: event.event_id,
          })

          const ticketData = {
            assetId: assetId,
            userAddress: activeAddress,
            eventId: event.event_id,
            timestamp: new Date().toISOString(),
            eventName: event.event_name,
          }

          // Make sure we have the signing key
          const signingKey = process.env.NEXT_PUBLIC_TICKET_SIGNING_KEY
          if (!signingKey) {
            console.error("Missing NEXT_PUBLIC_TICKET_SIGNING_KEY environment variable")
            throw new Error("Missing ticket signing key")
          }

          const signature = await signPayload(ticketData, signingKey)
          const qrPayload: QRPayload = {
            payload: ticketData,
            signature,
          }

          const qrDataUrl = await generateQRCodeDataURL(JSON.stringify(qrPayload))
          console.log("QR code generated successfully:", qrDataUrl ? "success" : "failed")

          if (!qrDataUrl) {
            throw new Error("QR code generation returned empty result")
          }

          setQrCode(qrDataUrl)
        } catch (error) {
          console.error("Error generating QR code:", error)
          toast.error(`Failed to generate ticket QR code: ${error instanceof Error ? error.message : String(error)}`)
        } finally {
          setIsGeneratingQR(false)
        }
      }
    }

    generateQR()
  }, [requestStatus.status, assetId, event, activeAddress, isUserRegistered])

  // Update the handleUserDetailsSubmit function
  const handleUserDetailsSubmit = async (details: { email: string; firstName: string; lastName: string }) => {
    try {
      setUserDetails(details)
      setUserDetailsSubmitted(true)
      setShowUserDetailsDialog(false)

      // Continue with purchase process directly instead of calling handlePurchaseTicket again
      if (!activeAddress || !event || !algodClient || !transactionSigner) {
        toast.error("Please connect your wallet first")
        return
      }

      setIsPurchasing(true)

      // Get the app ID from the event
      const appID = event.app_id || blockchainEvent?.EventAppID

      if (!appID) {
        throw new Error("Invalid application ID")
      }

      // Check if we have the asset ID
      if (!assetId) {
        console.error("Asset ID not found, attempting to fetch it now")

        // Try to fetch the asset ID directly
        const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
        const appInfo = await indexer.lookupApplications(Number(appID)).do()

        if (!appInfo.application) {
          throw new Error("Application not found")
        }

        // Check both possible formats for global state
        const globalState = appInfo.application.params["global-state"] || appInfo.application.params["globalState"]

        if (!globalState) {
          throw new Error("Global state not found")
        }

        console.log("Global state:", JSON.stringify(globalState, null, 2))

        // Log all keys in global state to help debug
        globalState.forEach((entry: any) => {
          let keyStr: string
          if (typeof entry.key === "string") {
            keyStr = Buffer.from(entry.key, "base64").toString()
          } else {
            keyStr = Buffer.from(entry.key).toString()
          }
          console.log(
            `Global state key: ${keyStr}, value type: ${entry.value ? Object.keys(entry.value).join(",") : "null"}`,
          )
        })

        const assetIdEntry = globalState.find((entry: any) => {
          let keyStr: string
          if (typeof entry.key === "string") {
            keyStr = Buffer.from(entry.key, "base64").toString()
          } else {
            keyStr = Buffer.from(entry.key).toString()
          }
          return keyStr === "assetID"
        })

        if (assetIdEntry) {
          const foundAssetId =
            assetIdEntry.value.uint ||
            (assetIdEntry.value.bytes
              ? Number.parseInt(Buffer.from(assetIdEntry.value.bytes, "base64").toString())
              : null)

          if (foundAssetId) {
            setAssetId(Number(foundAssetId))
            console.log(`Set asset ID to: ${foundAssetId}`)
          } else {
            throw new Error("Asset ID value not found in global state")
          }
        } else {
          throw new Error("Asset ID not found in global state. Please ensure the event is properly configured.")
        }
      }

      if (!assetId) {
        throw new Error("Asset ID not found after attempts to retrieve it")
      }

      // Create the application transaction
      const suggestedParams = await algodClient.getTransactionParams().do()

      if (!details.email) {
        throw new Error("Email is required")
      }

      const txn = algosdk.makeApplicationNoOpTxnFromObject({
        sender: activeAddress,
        appIndex: Number(appID),
        appArgs: [
          algosdk
            .getMethodByName(
              [
                new algosdk.ABIMethod({
                  name: "registerEvent",
                  desc: "",
                  args: [{ type: "string", name: "email", desc: "" }],
                  returns: { type: "void", desc: "" },
                }),
              ],
              "registerEvent",
            )
            .getSelector(),
            new algosdk.ABIStringType().encode(details.email)
                  ],
        suggestedParams: { ...suggestedParams },
        boxes: [{ appIndex: 0, name: algosdk.decodeAddress(activeAddress).publicKey }],
        foreignAssets: [assetId], // Use the asset ID
      })

      const optInTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
        sender: activeAddress,
        receiver: activeAddress,
        assetIndex: assetId, // Use the asset ID
        amount: 0,
        suggestedParams,
      })

      // Group the transactions
      const txns = [optInTxn, txn]
      algosdk.assignGroupID(txns)

      // Sign both transactions
      const signedTxns = await transactionSigner(txns, [0, 1])

      // Send the signed group to the network
      const { txid } = await algodClient.sendRawTransaction(signedTxns).do()
      console.log("Transaction confirmed:", txid)

      // Update local state to reflect the new request
      setRequestStatus({ exists: true, status: "approved", assetId: assetId })

      // Update registered count and available tickets
      if (registeredCount !== null) {
        const newRegisteredCount = registeredCount + 1
        setRegisteredCount(newRegisteredCount)

        if (blockchainEvent && blockchainEvent.MaxParticipants) {
          const newAvailableTickets = Number(blockchainEvent.MaxParticipants) - newRegisteredCount
          setAvailableTickets(Math.max(0, newAvailableTickets))
        }
      } else {
        // Fallback if we don't have registered count
        setAvailableTickets((prev) => Math.max(0, prev - 1))
      }

      toast.success("Ticket purchased successfully!")
      router.refresh()
    } catch (error) {
      console.error("Error purchasing ticket:", error)
      toast.error(
        `Error purchasing ticket: ${error instanceof Error ? error.message : String(error || "Unknown error")}`,
      )
    } finally {
      setIsPurchasing(false)
    }
  }

  // Replace the handlePurchaseTicket function with this updated version
  const handlePurchaseTicket = () => {
    if (!activeAddress || !event || !algodClient || !transactionSigner) {
      toast.error("Please connect your wallet first")
      return
    }

    try {
      setIsPurchasing(true)

      // Show user details dialog if not submitted yet
      if (!userDetailsSubmitted) {
        setShowUserDetailsDialog(true)
        return
      }

      // If we get here, it means userDetailsSubmitted is true but handleUserDetailsSubmit
      // didn't complete the purchase (which shouldn't happen with our new implementation)
      toast.error("Something went wrong. Please try again.")
    } catch (error) {
      console.error("Error purchasing ticket:", error)
      toast.error(
        `Error purchasing ticket: ${error instanceof Error ? error.message : String(error || "Unknown error")}`,
      )
    } finally {
      setIsPurchasing(false)
    }
  }

  if (isLoading) {
    return <EventSkeleton />
  }

  // Update the renderTicketActionContent function to properly handle isUserRegistered
  // Replace the existing renderTicketActionContent function with this updated version:

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

    // Check if user is registered either through requestStatus or isUserRegistered flag
    if (requestStatus.exists || isUserRegistered) {
      return (
        <Card className="border-dashed">
          <CardContent className="pt-6">
            <div className="text-center">
              {requestStatus.status === "pending" ? (
                <>
                  <Clock4 className="h-8 w-8 mb-2 mx-auto text-yellow-500" />
                  <p className="text-sm text-gray-400 mb-4">Your ticket request is pending approval</p>
                </>
              ) : requestStatus.status === "approved" || isUserRegistered ? (
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
                    <div className="text-center">
                      <p className="text-sm text-red-400 mb-2">Failed to generate QR code</p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          // Force regenerate QR code
                          setQrCode(null)
                          setIsGeneratingQR(true)
                          // This will trigger the useEffect
                        }}
                      >
                        <Loader2 className="w-4 h-4 mr-2" />
                        Retry
                      </Button>
                    </div>
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
                    <p>Asset ID: {assetId || "Not found"}</p>
                    <p>Registered Count: {registeredCount || "Not found"}</p>
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
                            {registeredCount !== null ? registeredCount : Number(blockchainEvent.RegisteredCount)} /{" "}
                            {Number(blockchainEvent.MaxParticipants)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Asset ID:</span>
                          <span className="font-mono">{assetId || "Not found"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Image URL:</span>
                          <span className="font-mono text-xs truncate max-w-[200px]">{blockchainEvent.EventImage}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {blockchainEvent && (
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Registered Attendees</CardTitle>
                      <CardDescription>
                        {registeredUsers.length} out of {Number(blockchainEvent.MaxParticipants)} spots filled
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {registeredUsers.length > 0 ? (
                          <div className="max-h-[300px] overflow-y-auto space-y-2">
                            {registeredUsers.map((user, index) => (
                              <div
                                key={index}
                                className="flex items-center justify-between p-2 rounded-md bg-gray-700/30"
                              >
                                <div className="flex items-center">
                                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center mr-3">
                                    {user.email.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="overflow-hidden">
                                    <p className="text-sm text-gray-300 truncate">{user.email}</p>
                                    <p className="text-xs text-gray-400 font-mono truncate">
                                      {user.address.substring(0, 8)}...{user.address.substring(user.address.length - 8)}
                                    </p>
                                  </div>
                                </div>
                                {user.address === activeAddress && (
                                  <Badge
                                    variant="outline"
                                    className="ml-2 bg-green-900/20 text-green-400 border-green-800"
                                  >
                                    You
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-center py-4">No attendees registered yet</p>
                        )}
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
