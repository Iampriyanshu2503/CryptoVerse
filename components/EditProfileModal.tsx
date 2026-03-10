"use client"
// ─── Edit Profile Modal ───────────────────────────────────────────────────────
import { useState, useRef, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import type { Profile } from "@/lib/supabase"

interface Props {
  profile: Profile
  onClose: () => void
  onSaved: (updated: Partial<Profile>) => void
}

const SOCIAL_FIELDS = [
  { key:"github",   label:"GitHub",   icon:"GH",  placeholder:"username",          prefix:"github.com/",   color:"#e2e8f0" },
  { key:"linkedin", label:"LinkedIn", icon:"in",  placeholder:"username or URL",   prefix:"linkedin.com/in/", color:"#0a66c2" },
  { key:"twitter",  label:"Twitter",  icon:"𝕏",   placeholder:"handle (no @)",     prefix:"x.com/",        color:"#e7e9ea" },
  { key:"discord",  label:"Discord",  icon:"DC",  placeholder:"user#0000 or tag",  prefix:"",              color:"#5865f2" },
  { key:"website",  label:"Website",  icon:"🌐",  placeholder:"https://yoursite.com", prefix:"",            color:"#60a5fa" },
]

export default function EditProfileModal({ profile, onClose, onSaved }: Props) {
  const [displayName, setDisplayName] = useState(profile.display_name ?? "")
  const [bio,         setBio]         = useState(profile.bio         ?? "")
  const [location,    setLocation]    = useState(profile.location    ?? "")
  const [github,      setGithub]      = useState(profile.github      ?? "")
  const [linkedin,    setLinkedin]    = useState(profile.linkedin    ?? "")
  const [twitter,     setTwitter]     = useState(profile.twitter     ?? "")
  const [discord,     setDiscord]     = useState(profile.discord     ?? "")
  const [website,     setWebsite]     = useState(profile.website     ?? "")

  const [avatarPreview, setAvatarPreview] = useState<string | null>(profile.avatar_url ?? null)
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [uploading,     setUploading]     = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [dragOver,      setDragOver]      = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) { setError("Please select an image file."); return }
    if (file.size > 2 * 1024 * 1024)    { setError("Image must be under 2MB.");     return }
    setError(null)
    setAvatarFile(file)
    const reader = new FileReader()
    reader.onload = e => setAvatarPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) handleFileSelect(f)
  }, [handleFileSelect])

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return profile.avatar_url ?? null
    setUploading(true)
    const ext  = avatarFile.name.split(".").pop() ?? "jpg"
    const path = `${profile.id}/avatar.${ext}`
    const { error: upErr } = await supabase.storage
      .from("avatars").upload(path, avatarFile, { upsert: true, contentType: avatarFile.type })
    setUploading(false)
    if (upErr) { setError("Avatar upload failed: " + upErr.message); return null }
    const { data } = supabase.storage.from("avatars").getPublicUrl(path)
    return `${data.publicUrl}?t=${Date.now()}`   // cache-bust
  }

  const handleSave = async () => {
    setSaving(true); setError(null)
    try {
      const avatar_url = await uploadAvatar()
      if (error) { setSaving(false); return }

      const updates: Partial<Profile> = {
        display_name: displayName.trim() || null,
        bio:          bio.trim()         || null,
        location:     location.trim()    || null,
        github:       github.trim()      || null,
        linkedin:     linkedin.trim()    || null,
        twitter:      twitter.trim().replace(/^@/,"") || null,
        discord:      discord.trim()     || null,
        website:      website.trim()     || null,
        avatar_url,
      }

      const { error: dbErr } = await supabase
        .from("profiles").update(updates).eq("id", profile.id)

      if (dbErr) throw new Error(dbErr.message)
      onSaved(updates)
      onClose()
    } catch (e: any) {
      setError(e?.message ?? "Save failed")
    } finally {
      setSaving(false)
    }
  }

  const initials = (profile.display_name ?? profile.username).slice(0,2).toUpperCase()

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(0,0,0,0.8)", backdropFilter:"blur(12px)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background:"#0a0a0f", border:"1px solid rgba(255,255,255,0.1)", boxShadow:"0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04)" }}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
          <div>
            <p className="text-[15px] font-black text-white">Edit Profile</p>
            <p className="text-[11px] text-gray-600 mt-0.5">Update your info and social links</p>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/10 transition-all">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto" style={{ maxHeight:"70vh" }}>
          <div className="px-6 py-5 space-y-5">

            {/* ── Avatar upload ── */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Profile Photo</p>
              <div className="flex items-center gap-5">
                {/* Preview */}
                <div className="relative shrink-0">
                  <div className="w-20 h-20 rounded-2xl overflow-hidden flex items-center justify-center"
                    style={{ background:"rgba(255,255,255,0.05)", border:"1.5px solid rgba(255,255,255,0.1)" }}>
                    {avatarPreview
                      ? <img src={avatarPreview} alt="avatar" className="w-full h-full object-cover"/>
                      : <span className="text-2xl font-black text-gray-400">{initials}</span>
                    }
                  </div>
                  {avatarPreview && (
                    <button onClick={() => { setAvatarPreview(null); setAvatarFile(null) }}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center bg-red-500/90 hover:bg-red-400 transition-colors">
                      <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                        <path d="M1 1l6 6M7 1L1 7" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Drop zone */}
                <div
                  className="flex-1 rounded-2xl flex flex-col items-center justify-center py-5 gap-2 cursor-pointer transition-all"
                  style={{
                    border:`1.5px dashed ${dragOver ? "rgba(96,165,250,0.6)" : "rgba(255,255,255,0.1)"}`,
                    background: dragOver ? "rgba(96,165,250,0.06)" : "rgba(255,255,255,0.02)",
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}>
                  <span className="text-2xl">📸</span>
                  <p className="text-[12px] text-gray-400 font-semibold">Drop image or click to browse</p>
                  <p className="text-[10px] text-gray-700">JPG, PNG, WebP · max 2MB</p>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f) }}/>
              </div>
            </div>

            {/* ── Basic info ── */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Basic Info</p>
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] text-gray-600 mb-1.5 block">Display Name</label>
                  <input value={displayName} onChange={e => setDisplayName(e.target.value)}
                    placeholder={profile.username}
                    maxLength={32}
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none transition-all"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => e.target.style.borderColor="rgba(96,165,250,0.4)"}
                    onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 mb-1.5 block">Bio <span className="text-gray-700">({bio.length}/160)</span></label>
                  <textarea value={bio} onChange={e => setBio(e.target.value)}
                    placeholder="Cryptography enthusiast, CTF player..."
                    maxLength={160} rows={3}
                    className="w-full px-4 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none resize-none transition-all"
                    style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}
                    onFocus={e => e.target.style.borderColor="rgba(96,165,250,0.4)"}
                    onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
                </div>
                <div>
                  <label className="text-[11px] text-gray-600 mb-1.5 block">Location</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm">📍</span>
                    <input value={location} onChange={e => setLocation(e.target.value)}
                      placeholder="City, Country"
                      maxLength={64}
                      className="w-full pl-9 pr-4 py-2.5 rounded-xl text-[13px] text-white placeholder-gray-700 outline-none transition-all"
                      style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.08)" }}
                      onFocus={e => e.target.style.borderColor="rgba(96,165,250,0.4)"}
                      onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.08)"}/>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Social links ── */}
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Social & Links</p>
              <div className="space-y-2.5">
                {[
                  { key:"github",   label:"GitHub",   placeholder:"username",              icon:"GH", color:"#e2e8f0", val:github,   set:setGithub   },
                  { key:"linkedin", label:"LinkedIn", placeholder:"username",               icon:"in", color:"#0a66c2", val:linkedin, set:setLinkedin },
                  { key:"twitter",  label:"Twitter / X", placeholder:"handle (no @)",      icon:"𝕏",  color:"#e7e9ea", val:twitter,  set:setTwitter  },
                  { key:"discord",  label:"Discord",  placeholder:"username or tag",        icon:"DC", color:"#5865f2", val:discord,  set:setDiscord  },
                  { key:"website",  label:"Website",  placeholder:"https://yoursite.com",   icon:"🌐", color:"#60a5fa", val:website,  set:setWebsite  },
                ].map(({ key, label, placeholder, icon, color, val, set }) => (
                  <div key={key} className="flex items-center gap-2.5">
                    {/* Icon badge */}
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-[11px] font-black"
                      style={{ background:`${color}18`, border:`1px solid ${color}30`, color }}>
                      {icon}
                    </div>
                    <div className="flex-1">
                      <label className="text-[9px] text-gray-700 uppercase tracking-widest block mb-1">{label}</label>
                      <input value={val} onChange={e => set(e.target.value)}
                        placeholder={placeholder}
                        className="w-full px-3.5 py-2 rounded-xl text-[12px] text-white placeholder-gray-700 outline-none transition-all"
                        style={{ background:"rgba(255,255,255,0.04)", border:"1px solid rgba(255,255,255,0.07)" }}
                        onFocus={e => e.target.style.borderColor=`${color}50`}
                        onBlur={e => e.target.style.borderColor="rgba(255,255,255,0.07)"}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 flex items-center justify-between gap-3"
          style={{ borderTop:"1px solid rgba(255,255,255,0.06)" }}>
          {error
            ? <p className="text-[11px] text-red-400 flex-1">{error}</p>
            : <p className="text-[11px] text-gray-700 flex-1">Changes are saved to your account</p>
          }
          <div className="flex gap-2 shrink-0">
            <button onClick={onClose}
              className="px-4 py-2 rounded-xl text-[12px] font-semibold text-gray-400 hover:text-white transition-colors"
              style={{ border:"1px solid rgba(255,255,255,0.08)" }}>
              Cancel
            </button>
            <button onClick={handleSave} disabled={saving || uploading}
              className="px-5 py-2 rounded-xl text-[12px] font-bold text-white transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              style={{ background:"linear-gradient(135deg,#2563eb,#1d4ed8)", boxShadow:"0 0 20px rgba(59,130,246,0.3)" }}>
              {(saving || uploading) && (
                <svg className="animate-spin w-3.5 h-3.5" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 12"/>
                </svg>
              )}
              {uploading ? "Uploading…" : saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}