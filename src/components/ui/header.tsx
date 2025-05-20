"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Wallet2, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import ConnectWalletModal from "./connect-wallet-modal"
import { useWallet } from "@txnlab/use-wallet-react"
import { toast } from "react-toastify"

const navigationItems = [
  { name: "Events", href: "/events" },
  { name: "Calendars", href: "/calendars" },
  { name: "Host", href: "/host" },
]

export function SiteHeader() {
  const pathname = usePathname()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { activeAccount, wallets } = useWallet()

  const handleConnect = () => {
    if (activeAccount) {
      toast.info(`Already connected: ${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}`)
    } else {
      setIsModalOpen(true)
    }
  }

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen)
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b border-white/10 bg-black/50 backdrop-blur-md supports-[backdrop-filter]:bg-black/20">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center">
            <img
              src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/logo-J8HZiRoosb17PVntKSD0AqIkva2z5E.png"
              alt="Algorand Events Logo"
              className="h-12 w-auto mr-[-5]"
            />
            <span className="text-[32px] font-bold text-white mb-1">Events</span>
          </Link>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          {navigationItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "px-4 py-2 text-sm font-medium text-gray-300 rounded-full transition-colors hover:text-white hover:bg-white/5",
                pathname === item.href && "text-white bg-white/5",
              )}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="flex items-center space-x-4">
          {/* Wallet Button - Simplified on mobile */}
          <Button variant="outline" className="text-white border-white/20 hover:bg-white/5" onClick={handleConnect}>
            <Wallet2 className="mr-2 h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">
              {activeAccount
                ? `${activeAccount.address.slice(0, 4)}...${activeAccount.address.slice(-4)}`
                : "Connect Wallet"}
            </span>
          </Button>

          {/* Mobile Menu Button */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={toggleMobileMenu}>
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-black/90 backdrop-blur-md">
          <div className="container mx-auto px-4 py-4">
            <nav className="flex flex-col space-y-2">
              {navigationItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={cn(
                    "px-4 py-3 text-sm font-medium text-gray-300 rounded-md transition-colors hover:text-white hover:bg-white/5",
                    pathname === item.href && "text-white bg-white/5",
                  )}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.name}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      <ConnectWalletModal wallets={wallets} isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </header>
  )
}
