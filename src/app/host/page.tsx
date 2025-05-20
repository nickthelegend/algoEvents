"use client"

import { useEffect, useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { createClient } from "@supabase/supabase-js"
import { format } from "date-fns"
import Link from "next/link"
import { Calendar, MapPin, Users, Ticket, Settings, ArrowRight, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
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
}

function LoadingSkeleton() {
  return (
    <div className="space-y-8">
      {/* Profile Section Skeleton */}
      <div className="grid md:grid-cols-[2fr,1fr] gap-6">
        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <Skeleton className="h-8 w-48 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-gray-900/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <Skeleton className="h-5 w-5" />
                      <Skeleton className="h-5 w-8" />
                    </div>
                    <Skeleton className="h-4 w-24 mb-1" />
                    <Skeleton className="h-3 w-20" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-800/50 border-gray-700">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <div className="space-y-4">
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-48" />
              </div>
              <div>
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Events Section Skeleton */}
      <div className="space-y-6">
        <Skeleton className="h-10 w-72 rounded-lg" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="bg-gray-800/50 border-gray-700 overflow-hidden">
              <CardContent className="p-0">
                <div className="grid md:grid-cols-[250px,1fr,auto] gap-6">
                  <Skeleton className="h-[200px]" />
                  <div className="p-6 md:p-4 space-y-4">
                    <div>
                      <Skeleton className="h-6 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3 mt-1" />
                    </div>
                    <div className="flex flex-wrap gap-4">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                  <div className="p-6 md:p-4 flex items-center">
                    <Skeleton className="h-10 w-32" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function HostPage() {
  const { activeAddress } = useWallet()
  const [events, setEvents] = useState<UIEvent[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!activeAddress) return

      try {
        setIsLoading(true)
        setError(null)

        // Fetch user profile
        const { data: profile } = await supabase.from("users").select("*").eq("wallet_address", activeAddress).single()

        if (!profile) {
          // Create user profile if it doesn't exist
          const { data: newProfile } = await supabase
            .from("users")
            .insert([
              {
                wallet_address: activeAddress,
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single()

          setUserProfile(newProfile)
        } else {
          setUserProfile(profile)
        }

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

        const fetchedEvents: UIEvent[] = []

        // Process each box to get event data
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

            // Check if this event was created by the current wallet
            if (eventConfig.EventCreator.toLowerCase() === activeAddress.toLowerCase()) {
              console.log("Found event created by current wallet:", eventConfig)

              // Map to UI format
              const uiEvent: UIEvent = {
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

              fetchedEvents.push(uiEvent)
            }
          } catch (boxError) {
            console.error("Error processing box:", boxError)
          }
        }

        console.log("Fetched events created by this wallet:", fetchedEvents)
        setEvents(fetchedEvents)
      } catch (error) {
        console.error("Error fetching data:", error)
        setError("Failed to load events from blockchain. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [activeAddress])

  // For each app ID, fetch additional details
  useEffect(() => {
    async function fetchAppDetails() {
      if (events.length === 0) return

      try {
        const indexer = new algosdk.Indexer("", "https://testnet-idx.algonode.cloud", "")
        const updatedEvents = [...events]
        let hasUpdates = false

        for (let i = 0; i < events.length; i++) {
          const event = events[i]

          if (event.app_id) {
            try {
              // Look up application details
              const appInfo = await indexer.lookupApplications(event.app_id).do()

              if (appInfo.application && appInfo.application.params && appInfo.application.params["global-state"]) {
                const globalState = appInfo.application.params["global-state"]

                // Look for creatorAddress in global state
                const creatorEntry = globalState.find((entry: any) => {
                  // Decode the key
                  let keyStr: string
                  if (typeof entry.key === "string") {
                    keyStr = Buffer.from(entry.key, "base64").toString()
                  } else {
                    keyStr = Buffer.from(entry.key).toString()
                  }
                  return keyStr === "creatorAddress"
                })

                if (creatorEntry) {
                  // Extract creator address
                  let creatorAddress: string
                  if (creatorEntry.value.type === 1) {
                    // bytes
                    creatorAddress = Buffer.from(creatorEntry.value.bytes, "base64").toString()
                  } else {
                    // uint
                    creatorAddress = creatorEntry.value.uint.toString()
                  }

                  console.log(`App ${event.app_id} creator address:`, creatorAddress)

                  // Update event if needed
                  if (creatorAddress && creatorAddress !== event.created_by) {
                    updatedEvents[i] = {
                      ...event,
                      created_by: creatorAddress,
                    }
                    hasUpdates = true
                  }
                }
              }
            } catch (appError) {
              console.error(`Error fetching details for app ${event.app_id}:`, appError)
            }
          }
        }

        if (hasUpdates) {
          setEvents(updatedEvents)
        }
      } catch (error) {
        console.error("Error fetching application details:", error)
      }
    }

    fetchAppDetails()
  }, [events])

  if (!activeAddress) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 flex items-center justify-center">
        <Card className="w-full max-w-md mx-4 bg-gray-800/50 border-gray-700">
          <CardContent className="p-6 text-center">
            <Ticket className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Connect Your Wallet</h2>
            <p className="text-gray-400 mb-4">
              Please connect your wallet to view your hosted events and manage your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <LoadingSkeleton />
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
              <h3 className="text-xl font-medium mb-2">Error Loading Events</h3>
              <p className="text-gray-400 mb-6">{error}</p>
              <Button onClick={() => window.location.reload()}>Try Again</Button>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Host Profile Section */}
              <div className="grid md:grid-cols-[2fr,1fr] gap-6">
                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <h1 className="text-2xl font-bold mb-2">Host Dashboard</h1>
                        <p className="text-gray-400">Manage your events and profile</p>
                      </div>
                      <Button variant="outline" asChild>
                        <Link href="/create">
                          Create New Event
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </Link>
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Ticket className="w-5 h-5 text-primary" />
                            <Badge variant="outline">{events.length}</Badge>
                          </div>
                          <h3 className="font-medium">Total Events</h3>
                          <p className="text-sm text-gray-400">Events you've created</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Users className="w-5 h-5 text-green-500" />
                            <Badge variant="outline">{events.reduce((acc, event) => acc + event.max_tickets, 0)}</Badge>
                          </div>
                          <h3 className="font-medium">Total Tickets</h3>
                          <p className="text-sm text-gray-400">Across all events</p>
                        </CardContent>
                      </Card>
                      <Card className="bg-gray-900/50 border-gray-700">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between mb-2">
                            <Calendar className="w-5 h-5 text-blue-500" />
                            <Badge variant="outline">
                              {events.filter((e) => new Date(e.event_date) > new Date()).length}
                            </Badge>
                          </div>
                          <h3 className="font-medium">Upcoming Events</h3>
                          <p className="text-sm text-gray-400">Events yet to happen</p>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-lg font-semibold">Profile Details</h2>
                      <Button variant="ghost" size="icon">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm text-gray-400">Wallet Address</label>
                        <p className="font-mono text-sm truncate">{activeAddress}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-400">Member Since</label>
                        <p>{format(new Date(userProfile?.created_at || new Date()), "MMMM d, yyyy")}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Events Section */}
              <div className="space-y-6">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="bg-gray-800/50">
                    <TabsTrigger value="all">All Events</TabsTrigger>
                    <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
                    <TabsTrigger value="past">Past</TabsTrigger>
                  </TabsList>

                  <TabsContent value="all" className="mt-6">
                    <EventsList events={events} />
                  </TabsContent>

                  <TabsContent value="upcoming" className="mt-6">
                    <EventsList events={events.filter((event) => new Date(event.event_date) > new Date())} />
                  </TabsContent>

                  <TabsContent value="past" className="mt-6">
                    <EventsList events={events.filter((event) => new Date(event.event_date) <= new Date())} />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Your existing EventsList component remains the same
function EventsList({ events }: { events: UIEvent[] }) {
  if (events.length === 0) {
    return (
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-12 text-center">
          <Ticket className="w-12 h-12 mx-auto mb-4 text-gray-600" />
          <h3 className="text-xl font-semibold mb-2">No Events Found</h3>
          <p className="text-gray-400 mb-6">Start creating events to see them listed here.</p>
          <Button asChild>
            <Link href="/create">Create Your First Event</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid gap-4">
      {events.map((event) => (
        <Card key={event.event_id} className="bg-gray-800/50 border-gray-700 overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-[250px,1fr,auto] gap-6">
              <div className="aspect-[4/3] md:aspect-auto relative">
                <img
                  src={event.image_url.replace("ipfs://", "https://ipfs.io/ipfs/") || "/placeholder.svg"}
                  alt={event.event_name}
                  className="object-cover w-full h-full"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <Badge
                  className="absolute bottom-2 left-2"
                  variant={new Date(event.event_date) > new Date() ? "default" : "secondary"}
                >
                  {new Date(event.event_date) > new Date() ? "Upcoming" : "Past"}
                </Badge>
              </div>

              <div className="p-6 md:p-4 space-y-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{event.event_name}</h3>
                  <p className="text-gray-400 line-clamp-2">{event.description}</p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-gray-400">
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5 text-primary" />
                    {format(new Date(event.event_date), "MMMM d, yyyy")}
                  </div>
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1.5 text-primary" />
                    {event.location}
                  </div>
                  <div className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5 text-primary" />
                    {event.max_tickets} tickets
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-4 flex items-center">
                <Button asChild variant="outline">
                  <Link href={`/event/manage/${event.event_id}`}>
                    Manage Event
                    <Settings className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
