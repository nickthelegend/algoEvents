"use client"

import { useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "react-toastify"
import { createClient } from "@supabase/supabase-js"
import { Clock, MapPin } from "lucide-react"
import { TicketManagerClient } from "@/contracts/TicketManagerClient"
import { AlgorandClient } from "@algorandfoundation/algokit-utils/types/algorand-client"

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

interface EventMetadata {
  name: string
  description: string
  location: string
  date: string
  image: string
  maxTickets: number
  ticketPrice: number
  venue: string
  organizer: string
  category: string
  requiresApproval: boolean
}

function sliceIntoChunks(arr: any[], chunkSize: number) {
  const res = []
  for (let i = 0; i < arr.length; i += chunkSize) {
    const chunk = arr.slice(i, i + chunkSize)
    res.push(chunk)
  }
  return res
}
export default function CreateEventPage() {
  const { activeAddress, algodClient, transactionSigner } = useWallet()
  const [ipfsHash, setIpfsHash] = useState<string | null>(null)
  const [date, setDate] = useState<Date | undefined>(undefined)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    maxTickets: "",
    ticketPrice: "",
    eventMetadata: {
      venue: "",
      organizer: "",
      category: "",
      requiresApproval: false,
    },
  })
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>("/placeholder.svg")
  const [isUploading, setIsUploading] = useState(false)
  const handleImageUpload = async (file: File) => {
    try {
      setIsUploading(true)

      // Preview
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
      setImageFile(file)

      // Upload to IPFS
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/upload-to-ipfs", {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        throw new Error("Failed to upload to IPFS")
      }

      const data = await response.json()
      setIpfsHash(data.ipfsHash)
      toast.success("Image uploaded to IPFS successfully!")
    } catch (error) {
      console.error("Error uploading image:", error)
      toast.error("Failed to upload image to IPFS")
    } finally {
      setIsUploading(false)
    }
  }

  const createTicketNFTs = async () => {
    if (!activeAddress || !algodClient || !transactionSigner) {
      toast.error("Please connect your wallet first")
      return
    }

    if (!ipfsHash) {
      toast.error("Please upload an event image first")
      return
    }

    if (!date) {
      toast.error("Please select an event date")
      return
    }

    try {
      setIsCreating(true)

      // Generate a unique event ID (could be timestamp-based or random)
      const eventId = Date.now()

      // Calculate start and end times based on the selected date
      const startTime = Math.floor(date.getTime() / 1000)
      const endTime = startTime + 24 * 60 * 60 // 24 hours later

      // Format the IPFS URL
      const ipfsURL = `ipfs://${ipfsHash}`

      // Get the maximum number of tickets
      const maxParticipants = Number.parseInt(formData.maxTickets)
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
      // Initialize the TicketManagerClient
      const Caller = new TicketManagerClient({
        appId: BigInt(739823874),
        algorand: algorand,
        defaultSender: activeAddress,
      })

      toast.info("Creating event on the blockchain...", { autoClose: false })

      // Call the smart contract to create the event
      await Caller.send.createEvent({
        signer: transactionSigner,
        args: {
          eventConfig: {
            eventId: BigInt(eventId),
            eventAppId: BigInt(739823874), // Using the same appId as the client
            eventCategory: formData.eventMetadata.category,
            eventImage: ipfsURL,
            maxParticipants: BigInt(maxParticipants),
            startTime: BigInt(startTime),
            endTime: BigInt(endTime),
            eventCreator: activeAddress,
            eventName: formData.name,
            location: formData.location,
            registeredCount: BigInt(0),
          },
        },
        populateAppCallResources: true,
      })

      toast.success("Event created successfully on the blockchain!")

      // Redirect to the events page or show success message
      // router.push('/events')
    } catch (error) {
      console.error("Error creating event on blockchain:", error)
      toast.error("Failed to create event on the blockchain")
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="grid md:grid-cols-[300px,1fr] gap-6">
          {/* Image Upload Section */}
          <Card className="bg-gray-800/50 border-dashed border-2 border-gray-700 aspect-square relative group">
            <CardContent className="p-0 h-full">
              <label className="w-full h-full flex flex-col items-center justify-center p-6 cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleImageUpload(file)
                  }}
                  disabled={isUploading}
                />
                <div className="relative w-full h-full">
                  {isUploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : imagePreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={imagePreview || "/placeholder.svg"}
                        alt="Event cover"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="h-8 w-8" />
                      </div>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2" />
                      <p className="text-sm text-gray-400">Upload event image</p>
                    </div>
                  )}
                </div>
              </label>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Input
              placeholder="Event Name"
              className="text-3xl h-16 bg-transparent border-none placeholder:text-gray-500"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />

            <div className="grid gap-4">
              <div className="flex items-center space-x-4">
                <div className="space-y-2 flex-1">
                  <Label>Event Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal bg-gray-800/50",
                          !date && "text-muted-foreground",
                        )}
                      >
                        <Clock className="mr-2 h-4 w-4" />
                        {date ? date.toLocaleDateString() : "Select date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar mode="single" selected={date} onSelect={setDate} initialFocus />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Event Location"
                  className="bg-gray-800/50 flex-1"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                />
                <Button
                  variant="outline"
                  className="bg-gray-800/50"
                  onClick={() =>
                    window.open(
                      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(formData.location)}`,
                      "_blank",
                    )
                  }
                >
                  <MapPin className="h-4 w-4" />
                </Button>
              </div>

              <Textarea
                placeholder="Event Description"
                className="min-h-[100px] bg-gray-800/50"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />

              <div className="grid gap-4">
                <div className="flex items-center justify-between">
                  <Label>Maximum Tickets</Label>
                  <Input
                    type="number"
                    className="w-32 bg-gray-800/50"
                    value={formData.maxTickets}
                    onChange={(e) => setFormData({ ...formData, maxTickets: e.target.value })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Label>Ticket Price (ALGO)</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="freeTicket"
                        className="rounded border-gray-700 bg-gray-800/50"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, ticketPrice: "0" })
                          }
                        }}
                      />
                      <Label htmlFor="freeTicket" className="text-sm text-gray-400">
                        Free Event
                      </Label>
                    </div>
                  </div>
                  <Input
                    type="number"
                    className="w-32 bg-gray-800/50"
                    value={formData.ticketPrice}
                    onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                    disabled={formData.ticketPrice === "0"}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Event Category</Label>
                  <Select
                    value={formData.eventMetadata.category}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        eventMetadata: { ...formData.eventMetadata, category: value },
                      })
                    }
                  >
                    <SelectTrigger className="w-32 bg-gray-800/50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ai">AI</SelectItem>
                      <SelectItem value="arts">Arts & Culture</SelectItem>
                      <SelectItem value="climate">Climate</SelectItem>
                      <SelectItem value="fitness">Fitness</SelectItem>
                      <SelectItem value="wellness">Wellness</SelectItem>
                      <SelectItem value="crypto">Crypto</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <Button
            className="w-full max-w-md bg-primary hover:bg-primary/90"
            onClick={createTicketNFTs}
            disabled={isCreating || !activeAddress}
          >
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Tickets...
              </>
            ) : (
              "Create Event & Mint Tickets"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
