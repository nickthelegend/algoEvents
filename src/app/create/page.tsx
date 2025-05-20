"use client"

import { useState } from "react"
import { useWallet } from "@txnlab/use-wallet-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Upload, Loader2, CalendarIcon, MapPin, ImageIcon, Tag, Ticket, Clock, Search } from "lucide-react"
import { cn } from "@/lib/utils"
import { Calendar } from "@/components/ui/calendar"
import { toast } from "react-toastify"
import { createClient } from "@supabase/supabase-js"
import { TicketManagerClient } from "@/contracts/TicketManagerClient"
import { AlgorandClient } from "@algorandfoundation/algokit-utils/types/algorand-client"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { TicketFactory,TicketClient } from "@/contracts/TicketClient"
import { OnApplicationComplete } from "algosdk"
import { AlgoAmount } from "@algorandfoundation/algokit-utils/types/amount"
// import { AlgoAmount } from "@algorandfoundation/algokit-utils"

// Initialize Supabase client
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = "AIzaSyACn5LbHpFrDZrJ9pkg1OLc4EkntvcmNsA"

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
  const [mapOpen, setMapOpen] = useState(false)
  const [searchValue, setSearchValue] = useState("")
  const [currentStep, setCurrentStep] = useState(1)

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

  const handleLocationSearch = () => {
    if (searchValue) {
      setFormData({
        ...formData,
        location: searchValue,
        eventMetadata: {
          ...formData.eventMetadata,
          venue: searchValue,
        },
      })
      setMapOpen(false)
    }
  }

  const getMapEmbedUrl = (location: string) => {
    return `https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=${encodeURIComponent(location)}`
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

      // Get the maximum number of tickets and event cost
      const maxParticipants = Number.parseInt(formData.maxTickets)
      const eventCost = Number.parseInt(formData.ticketPrice) || 0

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

      toast.info("Creating application on the blockchain...", { autoClose: false })

      // Create application using EventFactory
      const appFactory = new TicketFactory({
        defaultSender: activeAddress,
        defaultSigner: transactionSigner,
        algorand,
      })

      const { result, appClient } = await appFactory.send.create.createApplication({
        sender: activeAddress,
        signer: transactionSigner,
        onComplete: OnApplicationComplete.NoOpOC,
        args: [formData.name, formData.location, BigInt(startTime), BigInt(endTime), BigInt(eventCost)],
      })

      // Get application reference
      const appID = await appClient.appId
      const appAddress = await appClient.appAddress.toString()

      toast.info(`Application created with ID: ${appID}`, { autoClose: 2000 })

const client = algorand.client.getTypedAppClientById(TicketManagerClient, {
  appId: BigInt(739825314),
  defaultSender: activeAddress,
  defaultSigner: transactionSigner
});
const client2 = algorand.client.getTypedAppClientById(TicketClient, {
  appId: BigInt(appID),
  defaultSender: activeAddress,
  defaultSigner: transactionSigner
});
      await algorand
  .newGroup()
  .addAppCallMethodCall(await client.params.createEvent({args: {eventConfig : {
    eventId: BigInt(eventId),
    eventAppId: BigInt(appID), // Using the newly created appId
    eventCategory: formData.eventMetadata.category,
    eventImage: ipfsURL,
    eventCost: BigInt(eventCost),
    maxParticipants: BigInt(maxParticipants),
    startTime: BigInt(startTime),
    endTime: BigInt(endTime),
    eventCreator: activeAddress,
    eventName: formData.name,
    location: formData.location,
    registeredCount: BigInt(0),
  },

} 

 }

))
  .addPayment({
    sender: activeAddress,
    receiver: appAddress,
    amount: AlgoAmount.Algo(3),
    signer: transactionSigner,
  }).addAppCallMethodCall(await client2.params.createTickets({args: {assetUrl: ipfsURL, totalTickets:BigInt(maxParticipants)}}))
.send({populateAppCallResources: true });     
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

  const nextStep = () => {
    if (currentStep === 1 && !formData.name) {
      toast.error("Please enter an event name")
      return
    }
    if (currentStep === 2 && !date) {
      toast.error("Please select an event date")
      return
    }
    if (currentStep === 3 && !formData.location) {
      toast.error("Please select a location")
      return
    }
    setCurrentStep((prev) => Math.min(prev + 1, 4))
  }

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1))
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800 py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Create Your Event
          </h1>
          <p className="text-gray-400 mt-2">Fill in the details below to create your event on the blockchain</p>
        </div>

        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex justify-between items-center max-w-3xl mx-auto">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all",
                    currentStep === step
                      ? "bg-purple-600 text-white"
                      : currentStep > step
                        ? "bg-green-500 text-white"
                        : "bg-gray-800 text-gray-400",
                  )}
                >
                  {currentStep > step ? "✓" : step}
                </div>
                <span className={cn("text-xs mt-2", currentStep >= step ? "text-white" : "text-gray-500")}>
                  {step === 1 ? "Basics" : step === 2 ? "Date & Time" : step === 3 ? "Location" : "Details"}
                </span>
              </div>
            ))}
          </div>
          <div className="w-full bg-gray-800 h-1 mt-4 rounded-full max-w-3xl mx-auto">
            <div
              className="bg-gradient-to-r from-purple-400 to-pink-600 h-1 rounded-full transition-all"
              style={{ width: `${(currentStep / 4) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Form Content */}
        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm">
          <CardContent className="p-6">
            {/* Step 1: Basic Info */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-[1fr,300px] gap-6">
                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Event Name</Label>
                      <Input
                        placeholder="Give your event a catchy name"
                        className="text-2xl h-14 bg-gray-900/50 border-gray-700 focus:border-purple-500"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Description</Label>
                      <Textarea
                        placeholder="Describe your event in detail..."
                        className="min-h-[150px] bg-gray-900/50 border-gray-700 focus:border-purple-500"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      />
                    </div>

                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Event Category</Label>
                      <Select
                        value={formData.eventMetadata.category}
                        onValueChange={(value) =>
                          setFormData({
                            ...formData,
                            eventMetadata: { ...formData.eventMetadata, category: value },
                          })
                        }
                      >
                        <SelectTrigger className="bg-gray-900/50 border-gray-700 focus:border-purple-500">
                          <SelectValue placeholder="Select a category" />
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

                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Event Image</Label>
                    <Card className="bg-gray-900/50 border-dashed border-2 border-gray-700 aspect-square relative group overflow-hidden">
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
                                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                              </div>
                            ) : imagePreview ? (
                              <div className="relative w-full h-full">
                                <img
                                  src={imagePreview || "/placeholder.svg"}
                                  alt="Event cover"
                                  className="w-full h-full object-cover rounded-lg"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <Upload className="h-8 w-8 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="text-center">
                                <ImageIcon className="h-12 w-12 mx-auto mb-2 text-gray-500" />
                                <p className="text-sm text-gray-400">Upload event image</p>
                                <p className="text-xs text-gray-500 mt-2">Recommended size: 1200x630px</p>
                              </div>
                            )}
                          </div>
                        </label>
                      </CardContent>
                    </Card>
                    {ipfsHash && <div className="mt-2 text-xs text-green-500">✓ Image uploaded to IPFS</div>}
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Date & Time */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Event Date</Label>
                    <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={setDate}
                        className="mx-auto"
                        disabled={(date) => date < new Date()}
                      />
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div>
                      <Label className="text-sm text-gray-400 mb-2 block">Selected Date</Label>
                      <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 flex items-center">
                        <CalendarIcon className="h-5 w-5 mr-3 text-purple-500" />
                        <span className="text-lg">
                          {date
                            ? date.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "No date selected"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-700/30 rounded-lg p-4">
                      <h3 className="font-medium text-purple-400 flex items-center">
                        <Clock className="h-4 w-4 mr-2" />
                        Event Duration
                      </h3>
                      <p className="text-sm text-gray-400 mt-2">
                        By default, your event will be scheduled for 24 hours from the selected date. You can modify the
                        duration after creation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Location */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <div>
                  <Label className="text-sm text-gray-400 mb-2 block">Event Location</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Enter location or select on map"
                      className="bg-gray-900/50 border-gray-700 focus:border-purple-500 flex-1"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                    <Button
                      variant="outline"
                      className="bg-gray-900/50 border-gray-700 hover:bg-purple-900/20 hover:text-purple-400"
                      onClick={() => setMapOpen(true)}
                    >
                      <MapPin className="h-4 w-4 mr-2" />
                      Pick on Map
                    </Button>
                  </div>
                </div>

                {formData.location && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-3 text-purple-500 mt-1 flex-shrink-0" />
                      <div>
                        <h3 className="font-medium">Selected Location</h3>
                        <p className="text-sm text-gray-400 mt-1">{formData.location}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg overflow-hidden h-[300px]">
                  {formData.location ? (
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={getMapEmbedUrl(formData.location)}
                      allowFullScreen
                    ></iframe>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-400">Enter a location to see it on the map</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 4: Final Details */}
            {currentStep === 4 && (
              <div className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Maximum Tickets</Label>
                    <div className="relative">
                      <Ticket className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" />
                      <Input
                        type="number"
                        placeholder="Number of available tickets"
                        className="pl-10 bg-gray-900/50 border-gray-700 focus:border-purple-500"
                        value={formData.maxTickets}
                        onChange={(e) => setFormData({ ...formData, maxTickets: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-400 mb-2 block">Event Cost (ALGO)</Label>
                    <div className="relative">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">Ⱥ</div>
                      <Input
                        type="number"
                        placeholder="0.00"
                        className="pl-10 bg-gray-900/50 border-gray-700 focus:border-purple-500"
                        value={formData.ticketPrice}
                        onChange={(e) => setFormData({ ...formData, ticketPrice: e.target.value })}
                        disabled={formData.ticketPrice === "0"}
                      />
                    </div>
                    <div className="flex items-center mt-2">
                      <input
                        type="checkbox"
                        id="freeTicket"
                        className="rounded border-gray-700 bg-gray-800/50 text-purple-600 focus:ring-purple-500"
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData({ ...formData, ticketPrice: "0" })
                          }
                        }}
                      />
                      <Label htmlFor="freeTicket" className="text-sm text-gray-400 ml-2">
                        This is a free event
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-6 mt-6">
                  <h3 className="text-lg font-medium mb-4">Event Summary</h3>
                  <div className="space-y-4">
                    <div className="flex items-start">
                      <Tag className="h-5 w-5 mr-3 text-purple-500 mt-1" />
                      <div>
                        <h4 className="text-sm text-gray-400">Event Name</h4>
                        <p className="font-medium">{formData.name || "Not specified"}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <CalendarIcon className="h-5 w-5 mr-3 text-purple-500 mt-1" />
                      <div>
                        <h4 className="text-sm text-gray-400">Date</h4>
                        <p className="font-medium">
                          {date
                            ? date.toLocaleDateString("en-US", {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              })
                            : "Not specified"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <MapPin className="h-5 w-5 mr-3 text-purple-500 mt-1" />
                      <div>
                        <h4 className="text-sm text-gray-400">Location</h4>
                        <p className="font-medium">{formData.location || "Not specified"}</p>
                      </div>
                    </div>

                    <div className="flex items-start">
                      <Ticket className="h-5 w-5 mr-3 text-purple-500 mt-1" />
                      <div>
                        <h4 className="text-sm text-gray-400">Tickets</h4>
                        <p className="font-medium">
                          {formData.maxTickets ? `${formData.maxTickets} tickets available` : "Not specified"} •
                          {formData.ticketPrice === "0"
                            ? " Free"
                            : formData.ticketPrice
                              ? ` ${formData.ticketPrice} ALGO`
                              : " Price not specified"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8">
              {currentStep > 1 ? (
                <Button
                  variant="outline"
                  onClick={prevStep}
                  className="bg-gray-900/50 border-gray-700 hover:bg-gray-800"
                >
                  Previous
                </Button>
              ) : (
                <div></div>
              )}

              {currentStep < 4 ? (
                <Button
                  onClick={nextStep}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                >
                  Continue
                </Button>
              ) : (
                <>
                  <div className="bg-yellow-900/20 border border-yellow-700/30 rounded-lg p-4 mb-4 max-w-md mx-auto">
                    <h3 className="font-medium text-yellow-400 flex items-center">
                      <Clock className="h-4 w-4 mr-2" />
                      Fee Notice
                    </h3>
                    <p className="text-sm text-gray-400 mt-2">
                      Creating an event will deduct 3 ALGO from your wallet to fund the application and maintain the
                      minimum balance requirement for IPFS storage.
                    </p>
                  </div>
                  <Button
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0"
                    onClick={createTicketNFTs}
                    disabled={isCreating || !activeAddress}
                  >
                    {isCreating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Event...
                      </>
                    ) : (
                      "Create Event & Mint Tickets"
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Map Dialog */}
      <Dialog open={mapOpen} onOpenChange={setMapOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle>Select Location</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search for a location"
                className="bg-gray-900/50 border-gray-700"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleLocationSearch()
                  }
                }}
              />
              <Button variant="outline" onClick={handleLocationSearch}>
                <Search className="h-4 w-4" />
              </Button>
            </div>

            <div className="h-[400px] rounded-md overflow-hidden">
              {searchValue ? (
                <iframe
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  style={{ border: 0 }}
                  src={getMapEmbedUrl(searchValue)}
                  allowFullScreen
                ></iframe>
              ) : (
                <div className="flex items-center justify-center h-full bg-gray-900">
                  <p className="text-gray-400">Search for a location to see it on the map</p>
                </div>
              )}
            </div>

            <div className="text-sm text-gray-400">
              Enter a location name, address, or landmark in the search box above.
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMapOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleLocationSearch}>Confirm Location</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
