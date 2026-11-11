import React, { useState } from 'react'
import { MapPin, Navigation, CheckCircle2 } from 'lucide-react'

interface LocationPickerProps {
  address: string;
  setAddress?: (val: string) => void;
  latitude?: number | null;
  setLatitude?: (val: number | null) => void;
  longitude?: number | null;
  setLongitude?: (val: number | null) => void;
  onLocationSelect?: (addr: string, lat: number | null, lng: number | null) => void;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  address,
  setAddress,
  latitude = null,
  setLatitude,
  longitude = null,
  setLongitude,
  onLocationSelect
}) => {
  const [locating, setLocating] = useState(false)

  const updateAddr = (val: string) => {
    if (setAddress) setAddress(val)
    if (onLocationSelect) onLocationSelect(val, latitude, longitude)
  }

  const updateCoords = (lat: number | null, lng: number | null) => {
    if (setLatitude) setLatitude(lat)
    if (setLongitude) setLongitude(lng)
    if (onLocationSelect) onLocationSelect(address, lat, lng)
  }

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser')
      return
    }

    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        updateCoords(lat, lng)

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`)
          const data = await res.json()
          if (data && data.display_name) {
            updateAddr(data.display_name)
          } else {
            updateAddr(`Doorstep Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
          }
        } catch (e) {
          updateAddr(`Doorstep Location (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
        } finally {
          setLocating(false)
        }
      },
      (error) => {
        console.error('Geolocation error:', error)
        alert('Could not detect location automatically. Please type your address manually.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  return (
    <div className="space-y-3 text-left">
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <MapPin className="h-4 w-4 text-amber-500" /> Doorstep Service Address
        </label>
        
        <button
          type="button"
          onClick={handleGetCurrentLocation}
          disabled={locating}
          className="flex items-center gap-1 text-[10px] font-extrabold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer disabled:opacity-50"
        >
          <Navigation className={`h-3 w-3 ${locating ? 'animate-spin' : ''}`} />
          <span>{locating ? 'Detecting GPS Location...' : 'Use Current Location'}</span>
        </button>
      </div>

      <input
        type="text"
        value={address}
        onChange={(e) => updateAddr(e.target.value)}
        placeholder="Enter House No, Street, Apartment, City for Doorstep Detailing..."
        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-900 dark:text-white text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none transition-all font-semibold"
      />

      {latitude && longitude && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
          <CheckCircle2 className="h-3.5 w-3.5" />
          <span>GPS Pin Locked: {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>
        </div>
      )}
    </div>
  )
}
