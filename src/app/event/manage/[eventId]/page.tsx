"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import Link from "next/link"
import {
  Users,
  Calendar,
  MapPin,
  Settings,
  Share2,
  ChevronRight,
  Mail,
  Download,
  QrCode,
  MessageSquare,
  Bell,
  Clock,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Check,
  X,
  MoreHorizontal,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  AlertCircle,
  Code,
  Ticket,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "react-toastify"
import { useWallet } from "@txnlab/use-wallet-react"
import algosdk from "algosdk"

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

// UI event type
type UIEvent = {
  event_id: number
  event_name: string
  description: string
  location: string
  venue: string
  event_date: string
  max_tickets: number
  ticket_price: number
  image_url: string
  category: string
  created_by: string
  app_id: number
  registered_count: number
}

type Request = {
  request_id: number
  wallet_address: string
  request_status: "pending" | "approved" | "rejected"
  requested_at: string
  reviewed_at: string | null
  admin_notes: string | null
  asset_id: number
  user_id: string
  user: {
    wallet_address: string
    created_at: string
    email?: string
  }
}

function sliceIntoChunks(arr: any[], chunkSize: number) {
  const res = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    res.push(chunk)
  }
  return res
}

function EventManageSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="border-b border-gray-800 bg-gray-900/50 sticky top-0 z-50 backdrop-blur-xl">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="icon" disabled>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <div className="h-6 w-40 bg-gray-800 rounded animate-pulse"></div>
                <div className="h-4 w-24 bg-gray-800 rounded animate-pulse mt-1"></div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <div className="h-9 w-32 bg-gray-800 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-gray-800/50 border-gray-700">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-5 w-5 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-6 w-8 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="h-5 w-24 bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            <div className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
                <div className="aspect-video relative">
                  <div className="w-full h-full bg-gray-700 animate-pulse"></div>
                </div>
              </Card>

              <div className="h-10 w-full bg-gray-800 rounded animate-pulse"></div>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-700 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div>
                      <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-2"></div>
                      <div className="h-4 w-full bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="grid md:grid-cols-3 gap-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i}>
                          <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-2"></div>
                          <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-700 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-16 bg-gray-700 rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 w-24 bg-gray-700 rounded animate-pulse"></div>
                  </div>
                  <div className="space-y-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex justify-between text-sm">
                        <div className="h-4 w-24 bg-gray-700 rounded animate-pulse"></div>
                        <div className="h-4 w-16 bg-gray-700 rounded animate-pulse"></div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <div className="h-6 w-32 bg-gray-700 rounded animate-pulse"></div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-9 w-full bg-gray-700 rounded animate-pulse"></div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EventManagePage({ params }: { params: { eventId: string } }) {
  const router = useRouter()
  const { activeAddress, algodClient, transactionSigner } = useWallet()

  const [event, setEvent] = useState<UIEvent | null>(null)
  const [requests, setRequests] = useState<Request[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedRequests, setSelectedRequests] = useState<number[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">("all")
  const [adminNotesDialog, setAdminNotesDialog] = useState<{
    isOpen: boolean
    requestId: number | null
    notes: string
  }>({
    isOpen: false,
    requestId: null,
    notes: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false)

  useEffect(() => {
    async function fetchData() {
      if (!activeAddress) {
        toast.error("Please connect your wallet first")
        return
      }

      try {
        setIsLoading(true)
        setError(null)
        console.log("Fetching data for event ID:", params.eventId)

        // Initialize Algorand Indexer
        const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
        const mainAppId = 739825314 // Main contract app ID

        // Get all boxes for the main application
        const boxesResp = await indexer.searchForApplicationBoxes(mainAppId).do()
        console.log("Boxes response:", boxesResp)

        if (!boxesResp.boxes || boxesResp.boxes.length === 0) {
          setError("No events found in the blockchain.")
          setIsLoading(false)
          return
        }

        // Updated ABI type with all fields including EventCost
        const abiType = algosdk.ABIType.from(
          "(uint64,string,string,address,string,uint64,uint64,string,uint64,uint64,uint64,uint64)",
        )

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
                mainAppId,
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
              bigint, // 5: EventCost
              bigint, // 6: MaxParticipants
              string, // 7: Location
              bigint, // 8: StartTime
              bigint, // 9: EndTime
              bigint, // 10: RegisteredCount
              bigint, // 11: EventAppID
            ]

            // Map to EventConfig
            const eventConfig: EventConfig = {
              EventID: decodedTuple[0],
              EventName: decodedTuple[1],
              EventCategory: decodedTuple[2],
              EventCreator: decodedTuple[3],
              EventImage: decodedTuple[4],
              EventCost: decodedTuple[5],
              MaxParticipants: decodedTuple[6],
              Location: decodedTuple[7],
              StartTime: decodedTuple[8],
              EndTime: decodedTuple[9],
              RegisteredCount: decodedTuple[10],
              EventAppID: decodedTuple[11],
            }

            // Check if this is the event we're looking for
            if (Number(eventConfig.EventID) === Number(params.eventId)) {
              console.log("Found matching event:", eventConfig)
              eventFound = true

              // Check if the current user is the creator of this event
              if (eventConfig.EventCreator.toLowerCase() !== activeAddress.toLowerCase()) {
                setError("You don't have permission to manage this event.")
                setIsLoading(false)
                return
              }

              // Create event object from blockchain data
              const eventObj: UIEvent = {
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
                registered_count: Number(eventConfig.RegisteredCount),
              }

              setEvent(eventObj)

              // Fetch ticket requests from Supabase
              const { data: requestsData, error: requestsError } = await supabase
                .from("requests")
                .select(`
                  *,
                  user:users!requests_user_id_fkey (
                    wallet_address,
                    created_at,
                    email
                  )
                `)
                .eq("event_id", params.eventId)
                .order("requested_at", { ascending: false })

              if (requestsError) {
                console.error("Error fetching requests:", requestsError)
                // Continue without requests data
              } else {
                // Transform the data to match our Request type
                const transformedRequests: Request[] =
                  requestsData?.map((request: any) => ({
                    request_id: request.request_id,
                    wallet_address: request.wallet_address,
                    request_status: request.request_status,
                    requested_at: request.requested_at,
                    reviewed_at: request.reviewed_at,
                    admin_notes: request.admin_notes,
                    asset_id: request.asset_id,
                    user: request.user,
                    user_id: request.user_id,
                  })) || []

                setRequests(transformedRequests)
                console.log("Fetched requests:", transformedRequests)
              }

              break
            }
          } catch (boxError) {
            console.error("Error processing box:", boxError)
          }
        }

        if (!eventFound) {
          console.error("Event not found in blockchain data:", params.eventId)
          setError(`Event with ID ${params.eventId} not found in blockchain data.`)
        }
      } catch (error) {
        console.error("Error fetching data:", error)
        setError(`Failed to fetch event data: ${error instanceof Error ? error.message : String(error)}`)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [params.eventId, activeAddress])

  const handleSelectAll = () => {
    if (selectedRequests.length === filteredRequests.length) {
      setSelectedRequests([])
    } else {
      setSelectedRequests(filteredRequests.map((r) => r.request_id))
    }
  }

  const handleSelectRequest = (requestId: number) => {
    if (selectedRequests.includes(requestId)) {
      setSelectedRequests(selectedRequests.filter((id) => id !== requestId))
    } else {
      setSelectedRequests([...selectedRequests, requestId])
    }
  }

  const updateRequestStatus = async (
    requestId: number,
    status: "pending" | "approved" | "rejected",
    notes?: string,
  ) => {
    try {
      const { error } = await supabase
        .from("requests")
        .update({
          request_status: status,
          reviewed_at: new Date().toISOString(),
          admin_notes: notes || null,
        })
        .eq("request_id", requestId)

      if (error) throw error

      // Update local state
      setRequests(
        requests.map((request) =>
          request.request_id === requestId
            ? {
                ...request,
                request_status: status,
                reviewed_at: new Date().toISOString(),
                admin_notes: notes || null,
              }
            : request,
        ),
      )

      toast.success(`Request ${status === "approved" ? "approved" : "rejected"} successfully`)
    } catch (error) {
      console.error("Error updating request:", error)
      toast.error("Failed to update request status")
    }
  }

  const handleBulkAction = async (action: "approve" | "reject") => {
    if (!activeAddress || !algodClient || !transactionSigner || !event) {
      toast.error("Please connect your wallet first")
      return
    }

    if (selectedRequests.length === 0) {
      toast.error("No requests selected")
      return
    }

    setIsProcessingBulkAction(true)

    try {
      const suggestedParams = await algodClient.getTransactionParams().do()

      if (action === "approve") {
        const transactions: algosdk.Transaction[] = []

        const selectedRequestsDetails = requests.filter((request) => selectedRequests.includes(request.request_id))

        // Create asset transfer transactions for each approved request
        for (const request of selectedRequestsDetails) {
          console.log(
            "Request ID:",
            request.request_id,
            "Asset ID:",
            request.asset_id,
            "Wallet Address:",
            request.wallet_address,
          )

          const xferTxn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
            sender: activeAddress,
            receiver: request.wallet_address,
            suggestedParams,
            assetIndex: request.asset_id,
            amount: 1,
          })
          transactions.push(xferTxn)

          // Send confirmation email if user has email
          if (request.user?.email) {
            try {
              const response = await fetch("/api/resend", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  email: request.user.email,
                  audienceId: "57a5c553-2ff2-48a1-b9f5-dff4b5c04da9",
                  event,
                  ticketDetails: {
                    assetId: request.asset_id,
                    userAddress: request.wallet_address,
                    eventId: event.event_id,
                  },
                }),
              })

              if (!response.ok) {
                console.error("Failed to send confirmation email:", await response.text())
              } else {
                console.log(`Confirmation email sent to ${request.user.email}`)
              }
            } catch (emailError) {
              console.error(`Error sending confirmation email to ${request.user.email}:`, emailError)
              // Continue with other emails even if one fails
            }
          }
        }

        console.log("transactions:", transactions)

        if (transactions.length > 0) {
          // Sign all transactions
          const signedTxns = await transactionSigner(
            transactions,
            transactions.map((_, i) => i),
          )
          console.log("signedTxns:", signedTxns)

          // Send transactions in chunks
          const signedAssetTransactions = sliceIntoChunks(signedTxns, 1)
          for (let i = 0; i < signedAssetTransactions.length; i++) {
            try {
              const { txid } = await algodClient.sendRawTransaction(signedAssetTransactions[i]).do()
              const result = await algosdk.waitForConfirmation(algodClient, txid, 4)
              console.log(result)

              if (i % 5 === 0 || i === signedAssetTransactions.length - 1) {
                toast.success(`Transaction ${i + 1} of ${signedAssetTransactions.length} confirmed!`, {
                  autoClose: 1000,
                })
              }
            } catch (err) {
              console.error(err)
              toast.error(`Transaction ${i + 1} of ${signedAssetTransactions.length} failed!`, {
                autoClose: 1000,
              })
            }

            await new Promise((resolve) => setTimeout(resolve, 20))
          }
        }
      }

      // Update request status in database
      const { error } = await supabase
        .from("requests")
        .update({
          request_status: action === "approve" ? "approved" : "rejected",
          reviewed_at: new Date().toISOString(),
        })
        .in("request_id", selectedRequests)

      if (error) throw error

      // Update local state
      setRequests(
        requests.map((request) =>
          selectedRequests.includes(request.request_id)
            ? {
                ...request,
                request_status: action === "approve" ? "approved" : "rejected",
                reviewed_at: new Date().toISOString(),
              }
            : request,
        ),
      )

      // Clear selection
      setSelectedRequests([])
      toast.success(
        `${selectedRequests.length} requests ${action === "approve" ? "approved" : "rejected"} successfully`,
      )
    } catch (error) {
      console.error("Error performing bulk action:", error)
      toast.error(`Failed to ${action} requests: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessingBulkAction(false)
    }
  }

  // Filter requests based on search query and status filter
  const filteredRequests = requests.filter((request) => {
    const matchesSearch = request.wallet_address.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === "all" || request.request_status === filterStatus
    return matchesSearch && matchesStatus
  })

  const renderRequestsTable = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading requests...</p>
        </div>
      )
    }

    if (filteredRequests.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium mb-2">No Requests Found</h3>
          <p className="text-gray-400 mb-4">
            {searchQuery || filterStatus !== "all"
              ? "Try adjusting your search or filters"
              : "Share your event to start getting registrations"}
          </p>
          {!searchQuery && filterStatus === "all" && (
            <Button>
              <Share2 className="w-4 h-4 mr-2" />
              Share Event
            </Button>
          )}
        </div>
      )
    }

    return (
      <div className="rounded-md border border-gray-700">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-12">
                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={handleSelectAll}>
                  {selectedRequests.length === filteredRequests.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Wallet Address</TableHead>
              <TableHead>Asset ID</TableHead>
              <TableHead>Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Admin Notes</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredRequests.map((request) => (
              <TableRow key={request.request_id} className="hover:bg-gray-800/50">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleSelectRequest(request.request_id)}
                  >
                    {selectedRequests.includes(request.request_id) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-mono">{request.wallet_address}</TableCell>
                <TableCell>{request.asset_id}</TableCell>
                <TableCell>{format(new Date(request.requested_at), "MMM d, yyyy HH:mm")}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      request.request_status === "approved"
                        ? "success"
                        : request.request_status === "rejected"
                          ? "destructive"
                          : "default"
                    }
                  >
                    {request.request_status.charAt(0).toUpperCase() + request.request_status.slice(1)}
                  </Badge>
                </TableCell>
                <TableCell>
                  {request.admin_notes ? (
                    <span className="text-sm text-gray-400">{request.admin_notes}</span>
                  ) : (
                    <span className="text-sm text-gray-500">No notes</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem
                        onClick={() =>
                          setAdminNotesDialog({
                            isOpen: true,
                            requestId: request.request_id,
                            notes: request.admin_notes || "",
                          })
                        }
                      >
                        Add Notes
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-green-500"
                        onClick={() => updateRequestStatus(request.request_id, "approved")}
                      >
                        <Check className="w-4 h-4 mr-2" />
                        Approve Request
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-500"
                        onClick={() => updateRequestStatus(request.request_id, "rejected")}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Reject Request
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    )
  }

  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
            <p className="text-gray-400 mb-6">Please connect your wallet to manage this event.</p>
            <Button asChild>
              <Link href="/events">Return to Events</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return <EventManageSkeleton />
  }

  if (error || !event) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="p-6 text-center">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
            <h2 className="text-2xl font-bold mb-2">Event Not Found</h2>
            <p className="text-gray-400 mb-6">
              {error || "This event doesn't exist or you don't have permission to view it."}
            </p>
            <Button asChild>
              <Link href="/host">Return to Dashboard</Link>
            </Button>
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
                <Link href="/host">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div>
                <h1 className="text-lg font-semibold">{event.event_name}</h1>
                <p className="text-sm text-gray-400">Event Management</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" asChild>
                <Link href={`/event/${event.event_id}`} target="_blank">
                  View Event Page
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Users className="h-5 w-5 text-primary" />
                  <Badge variant="outline">{event.registered_count}</Badge>
                </div>
                <h3 className="font-medium">Registered</h3>
                <p className="text-sm text-gray-400">Total attendees</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  <Badge variant="outline">{requests.filter((r) => r.request_status === "approved").length}</Badge>
                </div>
                <h3 className="font-medium">Approved</h3>
                <p className="text-sm text-gray-400">Approved requests</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Clock className="h-5 w-5 text-blue-500" />
                  <Badge variant="outline">{event.max_tickets}</Badge>
                </div>
                <h3 className="font-medium">Capacity</h3>
                <p className="text-sm text-gray-400">Maximum tickets</p>
              </CardContent>
            </Card>
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Code className="h-5 w-5 text-purple-500" />
                  <Badge variant="outline">{event.app_id}</Badge>
                </div>
                <h3 className="font-medium">App ID</h3>
                <p className="text-sm text-gray-400">Blockchain identifier</p>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid md:grid-cols-[1fr,300px] gap-8">
            <div className="space-y-6">
              {/* Event Preview */}
              <Card className="bg-gray-800/50 border-gray-700 overflow-hidden">
                <div className="aspect-video relative">
                  <img
                    src={
                      event.image_url ? event.image_url.replace("ipfs://", "https://ipfs.io/ipfs/") : "/placeholder.svg"
                    }
                    alt={event.event_name}
                    className="object-cover w-full h-full"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <h2 className="text-2xl font-bold mb-2">{event.event_name}</h2>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1.5" />
                        {event.event_date ? format(new Date(event.event_date), "MMMM d, yyyy") : "Date not set"}
                      </div>
                      <div className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1.5" />
                        {event.location || "Location not set"}
                      </div>
                      <div className="flex items-center">
                        <Users className="w-4 h-4 mr-1.5" />
                        {event.max_tickets} capacity
                      </div>
                      <div className="flex items-center">
                        <Ticket className="w-4 h-4 mr-1.5" />
                        {event.ticket_price > 0 ? `${event.ticket_price} ALGO` : "Free"}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Tabs */}
              <Tabs defaultValue="attendees" className="space-y-6">
                <TabsList className="bg-gray-800/50 p-1">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="attendees">Attendees</TabsTrigger>
                  <TabsTrigger value="communications">Communications</TabsTrigger>
                  <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Event Details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label>Description</Label>
                          <p className="text-gray-400 mt-1">{event.description || "No description available"}</p>
                        </div>
                        <div className="grid md:grid-cols-3 gap-4">
                          <div>
                            <Label>Category</Label>
                            <p className="text-gray-400 mt-1">{event.category || "Not specified"}</p>
                          </div>
                          <div>
                            <Label>Ticket Price</Label>
                            <p className="text-gray-400 mt-1">{event.ticket_price || 0} ALGO</p>
                          </div>
                          <div>
                            <Label>Venue</Label>
                            <p className="text-gray-400 mt-1">{event.venue || "Not specified"}</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid md:grid-cols-2 gap-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Quick Actions</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Button className="w-full justify-start" variant="outline">
                          <Share2 className="w-4 h-4 mr-2" />
                          Share Event
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR Code
                        </Button>
                        <Button className="w-full justify-start" variant="outline">
                          <Download className="w-4 h-4 mr-2" />
                          Export Guest List
                        </Button>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Event Stats</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between text-sm mb-2">
                              <span className="text-gray-400">Registration Progress</span>
                              <span>
                                {event.registered_count}/{event.max_tickets}
                              </span>
                            </div>
                            <Progress value={(event.registered_count / event.max_tickets) * 100} className="h-2" />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm text-gray-400">Pending</p>
                              <p className="text-2xl font-semibold">
                                {requests.filter((r) => r.request_status === "pending").length}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Approved</p>
                              <p className="text-2xl font-semibold">
                                {requests.filter((r) => r.request_status === "approved").length}
                              </p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Blockchain Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <Label>App ID</Label>
                          <p className="text-gray-400 mt-1 font-mono">{event.app_id}</p>
                        </div>
                        <div>
                          <Label>Event ID</Label>
                          <p className="text-gray-400 mt-1 font-mono">{event.event_id}</p>
                        </div>
                        <div>
                          <Label>Creator Address</Label>
                          <p className="text-gray-400 mt-1 font-mono text-xs break-all">{event.created_by}</p>
                        </div>
                        <div>
                          <Label>IPFS Image</Label>
                          <p className="text-gray-400 mt-1 font-mono text-xs break-all">{event.image_url}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="attendees">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <CardTitle>Attendee Management</CardTitle>
                          <CardDescription>Review and manage ticket requests</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Search by wallet..."
                              value={searchQuery}
                              onChange={(e) => setSearchQuery(e.target.value)}
                              className="w-[200px] bg-gray-900/50"
                            />
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon">
                                  <Filter className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setFilterStatus("all")}>All Requests</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("pending")}>
                                  Pending Only
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("approved")}>
                                  Approved Only
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("rejected")}>
                                  Rejected Only
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {selectedRequests.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction("approve")}
                                className="text-green-500"
                                disabled={isProcessingBulkAction}
                              >
                                {isProcessingBulkAction ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <Check className="w-4 h-4 mr-2" />
                                )}
                                Approve Selected
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleBulkAction("reject")}
                                className="text-red-500"
                                disabled={isProcessingBulkAction}
                              >
                                {isProcessingBulkAction ? (
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                  <X className="w-4 h-4 mr-2" />
                                )}
                                Reject Selected
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="rounded-md">{renderRequestsTable()}</ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="communications">
                  <div className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Send Message</CardTitle>
                        <CardDescription>
                          Communicate with your attendees via email or push notifications.
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <Input placeholder="Message subject..." className="bg-gray-900/50" />
                        <textarea
                          placeholder="Type your message here..."
                          className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline">
                            <Bell className="w-4 h-4 mr-2" />
                            Send Push
                          </Button>
                          <Button>
                            <Mail className="w-4 h-4 mr-2" />
                            Send Email
                          </Button>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Message History</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-center py-8">
                          <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                          <h3 className="text-lg font-medium mb-2">No Messages Sent</h3>
                          <p className="text-gray-400">Messages you send to your attendees will appear here.</p>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                <TabsContent value="settings">
                  <Card className="bg-gray-800/50 border-gray-700">
                    <CardHeader>
                      <CardTitle>Event Settings</CardTitle>
                      <CardDescription>Manage your event details and preferences.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="grid gap-4">
                        <div>
                          <Label>Event Name</Label>
                          <Input defaultValue={event.event_name || ""} className="bg-gray-900/50 mt-1" />
                        </div>
                        <div>
                          <Label>Description</Label>
                          <textarea
                            defaultValue={event.description || ""}
                            className="w-full h-32 px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                          />
                        </div>
                        <div className="grid md:grid-cols-2 gap-4">
                          <div>
                            <Label>Location</Label>
                            <Input defaultValue={event.location || ""} className="bg-gray-900/50 mt-1" />
                          </div>
                          <div>
                            <Label>Venue</Label>
                            <Input defaultValue={event.venue || ""} className="bg-gray-900/50 mt-1" />
                          </div>
                        </div>
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline">Cancel</Button>
                        <Button>Save Changes</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-gray-800/50 border-gray-700 mt-6">
                    <CardHeader>
                      <CardTitle className="text-red-500">Danger Zone</CardTitle>
                      <CardDescription>These actions cannot be undone.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button variant="destructive" className="w-full justify-start">
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancel Event
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Event Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/20">
                        Live
                      </Badge>
                      <span className="text-sm text-gray-400">Event is public</span>
                    </div>
                    <Button variant="outline" size="sm">
                      Change Status
                    </Button>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Ticket Sales</span>
                      <span className="text-green-500">Active</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Registration</span>
                      <span className="text-green-500">Open</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Visibility</span>
                      <span className="text-green-500">Public</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Quick Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <QrCode className="w-4 h-4 mr-2" />
                    Check-in QR Code
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Download className="w-4 h-4 mr-2" />
                    Download Guest List
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="w-4 h-4 mr-2" />
                    Event Settings
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-gray-800/50 border-gray-700">
                <CardHeader>
                  <CardTitle>Blockchain Info</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">App ID</span>
                    <span className="font-mono">{event.app_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Event ID</span>
                    <span className="font-mono">{event.event_id}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Registered</span>
                    <span className="font-mono">{event.registered_count}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Price</span>
                    <span className="font-mono">{event.ticket_price} ALGO</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      {/* Admin Notes Dialog */}
      <Dialog
        open={adminNotesDialog.isOpen}
        onOpenChange={(isOpen) => setAdminNotesDialog({ isOpen, requestId: null, notes: "" })}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Admin Notes</DialogTitle>
            <DialogDescription>
              Add notes about this ticket request. These notes are only visible to admins.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder="Enter admin notes..."
              value={adminNotesDialog.notes}
              onChange={(e) => setAdminNotesDialog({ ...adminNotesDialog, notes: e.target.value })}
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAdminNotesDialog({ isOpen: false, requestId: null, notes: "" })}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (adminNotesDialog.requestId) {
                  updateRequestStatus(
                    adminNotesDialog.requestId,
                    requests.find((r) => r.request_id === adminNotesDialog.requestId)?.request_status || "pending",
                    adminNotesDialog.notes,
                  )
                  setAdminNotesDialog({ isOpen: false, requestId: null, notes: "" })
                }
              }}
            >
              Save Notes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
