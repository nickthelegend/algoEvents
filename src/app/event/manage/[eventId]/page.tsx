"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  Clock,
  ArrowLeft,
  XCircle,
  MoreHorizontal,
  CheckSquare,
  Square,
  Filter,
  Loader2,
  AlertCircle,
  Code,
  Ticket,
  Eye,
  Send,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
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
// const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

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

// Registered user type
type RegisteredUser = {
  walletAddress: string
  email: string
  registrationTime?: string
}

// Email template type
type EmailTemplate = {
  name: string
  subject: string
  content: string
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
  const { activeAddress, algodClient } = useWallet()

  const [event, setEvent] = useState<UIEvent | null>(null)
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [filterStatus, setFilterStatus] = useState<"all" | "email" | "no-email">("all")
  const [error, setError] = useState<string | null>(null)
  const [isProcessingBulkAction, setIsProcessingBulkAction] = useState(false)

  // Email composition state
  const [emailDialog, setEmailDialog] = useState<{
    isOpen: boolean
    subject: string
    content: string
    previewMode: boolean
  }>({
    isOpen: false,
    subject: "",
    content: "",
    previewMode: false,
  })

  // Email templates
  const emailTemplates: EmailTemplate[] = [
    {
      name: "Event Reminder",
      subject: "Reminder: {{event_name}} is Coming Up!",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Reminder: {{event_name}} is Coming Up!</h2>
          <p>Hello,</p>
          <p>This is a friendly reminder that <strong>{{event_name}}</strong> is coming up soon!</p>
          <p><strong>Date:</strong> {{event_date}}</p>
          <p><strong>Location:</strong> {{event_location}}</p>
          <p>We're looking forward to seeing you there. If you have any questions, please don't hesitate to reach out.</p>
          <p>Best regards,<br>The Event Team</p>
        </div>
      `,
    },
    {
      name: "Event Update",
      subject: "Important Update for {{event_name}}",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Important Update for {{event_name}}</h2>
          <p>Hello,</p>
          <p>We have an important update regarding <strong>{{event_name}}</strong>.</p>
          <p>[Insert your update details here]</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Best regards,<br>The Event Team</p>
        </div>
      `,
    },
    {
      name: "Thank You",
      subject: "Thank You for Attending {{event_name}}",
      content: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #6366f1;">Thank You for Attending {{event_name}}</h2>
          <p>Hello,</p>
          <p>Thank you for attending <strong>{{event_name}}</strong>! We hope you had a great time.</p>
          <p>We would love to hear your feedback. Please take a moment to share your thoughts with us.</p>
          <p>We look forward to seeing you at future events!</p>
          <p>Best regards,<br>The Event Team</p>
        </div>
      `,
    },
  ]

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

              // Fetch registered users from the event app
              await fetchRegisteredUsers(Number(eventConfig.EventAppID))

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

  // Function to fetch registered users from the event app
  const fetchRegisteredUsers = async (appId: number) => {
    try {
      console.log("Fetching registered users for app ID:", appId)

      // Initialize Algorand Indexer
      const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")

      // Get all boxes for the event application
      const boxesResp = await indexer.searchForApplicationBoxes(appId).do()
      console.log("Event app boxes response:", boxesResp)

      if (!boxesResp.boxes || boxesResp.boxes.length === 0) {
        console.log("No registered users found for this event.")
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
                appId,
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
      setRegisteredUsers(users)
    } catch (error) {
      console.error("Error fetching registered users:", error)
      toast.error("Failed to fetch registered users")
    }
  }

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([])
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.walletAddress))
    }
  }

  const handleSelectUser = (walletAddress: string) => {
    if (selectedUsers.includes(walletAddress)) {
      setSelectedUsers(selectedUsers.filter((addr) => addr !== walletAddress))
    } else {
      setSelectedUsers([...selectedUsers, walletAddress])
    }
  }

  // Function to apply template to email content
  const applyTemplate = (templateName: string) => {
    const template = emailTemplates.find((t) => t.name === templateName)
    if (!template || !event) return

    // Replace placeholders with actual event data
    const subject = template.subject.replace("{{event_name}}", event.event_name)

    const content = template.content
      .replace(/{{event_name}}/g, event.event_name)
      .replace(/{{event_date}}/g, format(new Date(event.event_date), "MMMM d, yyyy 'at' h:mm a"))
      .replace(/{{event_location}}/g, event.location)

    setEmailDialog({
      ...emailDialog,
      subject,
      content,
    })
  }

  // Function to send emails to selected users
  const sendEmails = async () => {
    if (selectedUsers.length === 0) {
      toast.error("No users selected")
      return
    }

    if (!emailDialog.subject.trim() || !emailDialog.content.trim()) {
      toast.error("Subject and content are required")
      return
    }

    setIsProcessingBulkAction(true)

    try {
      const selectedUserDetails = registeredUsers.filter(
        (user) => selectedUsers.includes(user.walletAddress) && user.email,
      )

      if (selectedUserDetails.length === 0) {
        toast.error("None of the selected users have email addresses")
        setIsProcessingBulkAction(false)
        return
      }

      // Send emails in batches to avoid overwhelming the API
      const batchSize = 10
      const batches = []

      for (let i = 0; i < selectedUserDetails.length; i += batchSize) {
        batches.push(selectedUserDetails.slice(i, i + batchSize))
      }

      let successCount = 0
      let failCount = 0

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i]
        const promises = batch.map(async (user) => {
          try {
            const response = await fetch("/api/resend", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                email: user.email,
                audienceId: "57a5c553-2ff2-48a1-b9f5-dff4b5c04da9", // Your audience ID
                subject: emailDialog.subject,
                htmlContent: emailDialog.content,
                event: event,
              }),
            })

            if (!response.ok) {
              console.error(`Failed to send email to ${user.email}:`, await response.text())
              return false
            }

            return true
          } catch (error) {
            console.error(`Error sending email to ${user.email}:`, error)
            return false
          }
        })

        const results = await Promise.all(promises)
        successCount += results.filter(Boolean).length
        failCount += results.filter((r) => !r).length

        // Show progress toast every batch
        toast.info(`Sending emails: ${i * batchSize + results.length}/${selectedUserDetails.length}`, {
          autoClose: 1000,
        })
      }

      // Show final results
      if (successCount > 0) {
        toast.success(`Successfully sent ${successCount} emails`)
      }

      if (failCount > 0) {
        toast.error(`Failed to send ${failCount} emails`)
      }

      // Close the dialog
      setEmailDialog({
        isOpen: false,
        subject: "",
        content: "",
        previewMode: false,
      })

      // Clear selection
      setSelectedUsers([])
    } catch (error) {
      console.error("Error sending emails:", error)
      toast.error(`Failed to send emails: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsProcessingBulkAction(false)
    }
  }

  // Filter users based on search query and status filter
  const filteredUsers = registeredUsers.filter((user) => {
    const matchesSearch =
      user.walletAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus =
      filterStatus === "all" || (filterStatus === "email" && user.email) || (filterStatus === "no-email" && !user.email)

    return matchesSearch && matchesStatus
  })

  const renderUsersTable = () => {
    if (isLoading) {
      return (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading registered users...</p>
        </div>
      )
    }

    if (filteredUsers.length === 0) {
      return (
        <div className="text-center py-12">
          <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-lg font-medium mb-2">No Registered Users Found</h3>
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
                  {selectedUsers.length === filteredUsers.length ? (
                    <CheckSquare className="h-4 w-4" />
                  ) : (
                    <Square className="h-4 w-4" />
                  )}
                </Button>
              </TableHead>
              <TableHead>Wallet Address</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Registration Time</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.walletAddress} className="hover:bg-gray-800/50">
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={() => handleSelectUser(user.walletAddress)}
                  >
                    {selectedUsers.includes(user.walletAddress) ? (
                      <CheckSquare className="h-4 w-4" />
                    ) : (
                      <Square className="h-4 w-4" />
                    )}
                  </Button>
                </TableCell>
                <TableCell className="font-mono">
                  {user.walletAddress.substring(0, 8)}...{user.walletAddress.substring(user.walletAddress.length - 8)}
                </TableCell>
                <TableCell>
                  {user.email ? (
                    <span className="text-sm">{user.email}</span>
                  ) : (
                    <span className="text-sm text-gray-500">No email</span>
                  )}
                </TableCell>
                <TableCell>
                  {user.registrationTime ? format(new Date(user.registrationTime), "MMM d, yyyy HH:mm") : "Unknown"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      {user.email && (
                        <DropdownMenuItem
                          onClick={() => {
                            setSelectedUsers([user.walletAddress])
                            setEmailDialog({
                              isOpen: true,
                              subject: "",
                              content: "",
                              previewMode: false,
                            })
                          }}
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem
                        onClick={() => {
                          navigator.clipboard.writeText(user.walletAddress)
                          toast.success("Wallet address copied to clipboard")
                        }}
                      >
                        Copy Wallet Address
                      </DropdownMenuItem>
                      {user.email && (
                        <DropdownMenuItem
                          onClick={() => {
                            navigator.clipboard.writeText(user.email)
                            toast.success("Email address copied to clipboard")
                          }}
                        >
                          Copy Email
                        </DropdownMenuItem>
                      )}
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
                  <Mail className="h-5 w-5 text-green-500" />
                  <Badge variant="outline">{registeredUsers.filter((u) => u.email).length}</Badge>
                </div>
                <h3 className="font-medium">With Email</h3>
                <p className="text-sm text-gray-400">Users with email</p>
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
                        <Button
                          className="w-full justify-start"
                          variant="outline"
                          onClick={() => {
                            // Create CSV content
                            const csvContent = [
                              ["Wallet Address", "Email", "Registration Time"],
                              ...registeredUsers.map((user) => [
                                user.walletAddress,
                                user.email || "N/A",
                                user.registrationTime || "Unknown",
                              ]),
                            ]
                              .map((row) => row.join(","))
                              .join("\n")

                            // Create download link
                            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                            const url = URL.createObjectURL(blob)
                            const link = document.createElement("a")
                            link.setAttribute("href", url)
                            link.setAttribute("download", `${event.event_name.replace(/\s+/g, "_")}_attendees.csv`)
                            document.body.appendChild(link)
                            link.click()
                            document.body.removeChild(link)
                          }}
                        >
                          <Download className="w-4 h-4 mr-2" />
                          Export Attendee List
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
                              <p className="text-sm text-gray-400">With Email</p>
                              <p className="text-2xl font-semibold">{registeredUsers.filter((u) => u.email).length}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-400">Without Email</p>
                              <p className="text-2xl font-semibold">{registeredUsers.filter((u) => !u.email).length}</p>
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
                          <CardTitle>Registered Attendees</CardTitle>
                          <CardDescription>View and manage event attendees</CardDescription>
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <div className="flex gap-2">
                            <Input
                              placeholder="Search attendees..."
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
                                <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                                  All Attendees
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("email")}>
                                  With Email Only
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setFilterStatus("no-email")}>
                                  Without Email
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                          {selectedUsers.length > 0 && (
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Check if selected users have emails
                                  const usersWithEmail = registeredUsers.filter(
                                    (user) => selectedUsers.includes(user.walletAddress) && user.email,
                                  )

                                  if (usersWithEmail.length === 0) {
                                    toast.error("None of the selected users have email addresses")
                                    return
                                  }

                                  setEmailDialog({
                                    isOpen: true,
                                    subject: "",
                                    content: "",
                                    previewMode: false,
                                  })
                                }}
                                className="text-primary"
                                disabled={isProcessingBulkAction}
                              >
                                <Mail className="w-4 h-4 mr-2" />
                                Email Selected ({selectedUsers.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ScrollArea className="rounded-md">{renderUsersTable()}</ScrollArea>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="communications">
                  <div className="space-y-6">
                    <Card className="bg-gray-800/50 border-gray-700">
                      <CardHeader>
                        <CardTitle>Send Message</CardTitle>
                        <CardDescription>Communicate with your attendees via email</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="space-y-2">
                          <Label>Select Recipients</Label>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                const usersWithEmail = registeredUsers.filter((user) => user.email)
                                if (usersWithEmail.length === 0) {
                                  toast.error("No users have email addresses")
                                  return
                                }
                                setSelectedUsers(usersWithEmail.map((u) => u.walletAddress))
                              }}
                            >
                              All Users with Email ({registeredUsers.filter((u) => u.email).length})
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Email Template</Label>
                          <div className="flex flex-wrap gap-2">
                            {emailTemplates.map((template) => (
                              <Button
                                key={template.name}
                                variant="outline"
                                size="sm"
                                onClick={() => applyTemplate(template.name)}
                              >
                                {template.name}
                              </Button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Subject</Label>
                          <Input
                            placeholder="Email subject..."
                            className="bg-gray-900/50"
                            value={emailDialog.subject}
                            onChange={(e) => setEmailDialog({ ...emailDialog, subject: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Content (HTML)</Label>
                          <Textarea
                            placeholder="Type your message here... HTML is supported"
                            className="min-h-[200px] bg-gray-900/50 font-mono text-sm"
                            value={emailDialog.content}
                            onChange={(e) => setEmailDialog({ ...emailDialog, content: e.target.value })}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setEmailDialog({
                                ...emailDialog,
                                previewMode: !emailDialog.previewMode,
                              })
                            }}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            {emailDialog.previewMode ? "Hide Preview" : "Preview"}
                          </Button>
                          <Button
                            onClick={() => {
                              if (selectedUsers.length === 0) {
                                toast.error("No recipients selected")
                                return
                              }

                              if (!emailDialog.subject || !emailDialog.content) {
                                toast.error("Subject and content are required")
                                return
                              }

                              // Check if selected users have emails
                              const usersWithEmail = registeredUsers.filter(
                                (user) => selectedUsers.includes(user.walletAddress) && user.email,
                              )

                              if (usersWithEmail.length === 0) {
                                toast.error("None of the selected users have email addresses")
                                return
                              }

                              sendEmails()
                            }}
                            disabled={isProcessingBulkAction}
                          >
                            {isProcessingBulkAction ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Sending...
                              </>
                            ) : (
                              <>
                                <Send className="w-4 h-4 mr-2" />
                                Send Email
                              </>
                            )}
                          </Button>
                        </div>

                        {emailDialog.previewMode && (
                          <div className="mt-6 border border-gray-700 rounded-md p-4">
                            <h3 className="text-lg font-medium mb-2">Email Preview</h3>
                            <div className="bg-white text-black rounded-md p-4">
                              <div className="mb-4">
                                <strong>Subject:</strong> {emailDialog.subject}
                              </div>
                              <div className="border-t border-gray-200 pt-4">
                                <div dangerouslySetInnerHTML={{ __html: emailDialog.content }} />
                              </div>
                            </div>
                          </div>
                        )}
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
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      // Create CSV content
                      const csvContent = [
                        ["Wallet Address", "Email", "Registration Time"],
                        ...registeredUsers.map((user) => [
                          user.walletAddress,
                          user.email || "N/A",
                          user.registrationTime || "Unknown",
                        ]),
                      ]
                        .map((row) => row.join(","))
                        .join("\n")

                      // Create download link
                      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
                      const url = URL.createObjectURL(blob)
                      const link = document.createElement("a")
                      link.setAttribute("href", url)
                      link.setAttribute("download", `${event.event_name.replace(/\s+/g, "_")}_attendees.csv`)
                      document.body.appendChild(link)
                      link.click()
                      document.body.removeChild(link)
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download Attendee List
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

      {/* Email Composition Dialog */}
      <Dialog
        open={emailDialog.isOpen}
        onOpenChange={(isOpen) => {
          if (!isOpen) {
            setEmailDialog({
              isOpen: false,
              subject: "",
              content: "",
              previewMode: false,
            })
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Compose Email</DialogTitle>
            <DialogDescription>
              Send an email to {selectedUsers.length} selected attendee{selectedUsers.length !== 1 ? "s" : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Email Template</Label>
              <div className="flex flex-wrap gap-2">
                {emailTemplates.map((template) => (
                  <Button key={template.name} variant="outline" size="sm" onClick={() => applyTemplate(template.name)}>
                    {template.name}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Subject</Label>
              <Input
                placeholder="Email subject..."
                className="bg-gray-900/50"
                value={emailDialog.subject}
                onChange={(e) => setEmailDialog({ ...emailDialog, subject: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Content (HTML)</Label>
              <Textarea
                placeholder="Type your message here... HTML is supported"
                className="min-h-[200px] bg-gray-900/50 font-mono text-sm"
                value={emailDialog.content}
                onChange={(e) => setEmailDialog({ ...emailDialog, content: e.target.value })}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setEmailDialog({
                    ...emailDialog,
                    previewMode: !emailDialog.previewMode,
                  })
                }}
              >
                <Eye className="w-4 h-4 mr-2" />
                {emailDialog.previewMode ? "Hide Preview" : "Preview"}
              </Button>
            </div>

            {emailDialog.previewMode && (
              <div className="mt-4 border border-gray-700 rounded-md p-4">
                <h3 className="text-lg font-medium mb-2">Email Preview</h3>
                <div className="bg-white text-black rounded-md p-4">
                  <div className="mb-4">
                    <strong>Subject:</strong> {emailDialog.subject}
                  </div>
                  <div className="border-t border-gray-200 pt-4">
                    <div dangerouslySetInnerHTML={{ __html: emailDialog.content }} />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setEmailDialog({
                  isOpen: false,
                  subject: "",
                  content: "",
                  previewMode: false,
                })
              }}
            >
              Cancel
            </Button>
            <Button onClick={sendEmails} disabled={isProcessingBulkAction}>
              {isProcessingBulkAction ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Send Email
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
