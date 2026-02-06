import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import type { Session } from '@supabase/supabase-js'

type ProfileRow = {
  first_name?: string | null
  last_name?: string | null
  avatar_url?: string | null
}

function isDemoMode() {
  try {
    return window.localStorage.getItem('lakehouse_demo') === '1'
  } catch {
    return false
  }
}

export default function UserProfile() {
  const navigate = useNavigate()
  const [session, setSession] = useState<Session | null>(null)
  const [, setProfile] = useState<ProfileRow | null>(null)

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const demo = isDemoMode()

  const displayEmail = session?.user?.email ?? ''
  const displayName = useMemo(() => {
    const a = (firstName || '').trim()
    const b = (lastName || '').trim()
    const name = [a, b].filter(Boolean).join(' ').trim()
    return name || (displayEmail || 'Member')
  }, [firstName, lastName, displayEmail])

  useEffect(() => {
    let alive = true

    async function init() {
      setIsLoading(true)
      setErrorMsg(null)

      const { data } = await supabase.auth.getSession()
      if (!alive) return
      setSession(data.session ?? null)

      if (!data.session?.user) {
        setIsLoading(false)
        return
      }

      const { data: row, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, avatar_url')
        .eq('id', data.session.user.id)
        .single()

      if (!alive) return

      if (error) {
        setErrorMsg(error.message)
        setProfile(null)
      } else {
        setProfile(row ?? null)
        setFirstName(String(row?.first_name ?? ''))
        setLastName(String(row?.last_name ?? ''))
        setAvatarUrl(row?.avatar_url ?? null)
      }

      setIsLoading(false)
    }

    init()

    return () => {
      alive = false
    }
  }, [])

  async function onSave(e: FormEvent) {
    e.preventDefault()
    setErrorMsg(null)
    setSuccessMsg(null)

    if (demo) {
      setErrorMsg('Profile editing is disabled in demo mode.')
      return
    }

    if (!session?.user) {
      setErrorMsg('You must be signed in to edit your profile.')
      return
    }

    setIsSaving(true)
    try {
      const updates = {
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      }

      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)

      if (error) {
        setErrorMsg(error.message)
        return
      }

      setSuccessMsg('Profile updated.')
    } finally {
      setIsSaving(false)
    }
  }

  async function onPickAvatar(file: File) {
    setErrorMsg(null)
    setSuccessMsg(null)

    if (demo) {
      setErrorMsg('Avatar uploads are disabled in demo mode.')
      return
    }

    if (!session?.user) {
      setErrorMsg('You must be signed in to upload an avatar.')
      return
    }

    // basic guardrails
    if (!file.type.startsWith('image/')) {
      setErrorMsg('Please choose an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Please choose an image under 5MB.')
      return
    }

    setIsUploading(true)
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
      const path = `${session.user.id}/${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, {
          upsert: true,
          cacheControl: '3600',
        })

      if (uploadError) {
        setErrorMsg(uploadError.message)
        return
      }

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = pub?.publicUrl || null

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', session.user.id)

      if (updateError) {
        setErrorMsg(updateError.message)
        return
      }

      setAvatarUrl(publicUrl)
      setSuccessMsg('Avatar updated.')
    } finally {
      setIsUploading(false)
    }
  }

  if (isLoading) {
    return (
      <div style={styles.page}>
        <div style={styles.pageInner}>Loading profile…</div>
      </div>
    )
  }

  if (!session?.user) {
    return (
      <div style={styles.page}>
        <div style={styles.pageInner}>
          <div style={styles.h1}>Profile</div>
          <div style={styles.muted}>You’re not signed in.</div>
          <div style={{ marginTop: 14, display: 'flex', gap: 10 }}>
            <button type="button" style={styles.primaryBtn} onClick={() => navigate('/login')}>
              Go to login
            </button>
            <button type="button" style={styles.secondaryBtn} onClick={() => navigate('/calendar')}>
              Back to calendar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.pageInner}>
        <div style={styles.headerRow}>
          <div>
            <div style={styles.h1}>Profile</div>
            <div style={styles.muted}>
              {demo ? (
                <span style={styles.demoPill}>DEMO MODE</span>
              ) : null}{' '}
              Signed in as <strong>{displayEmail}</strong>
            </div>
          </div>
        </div>

        {errorMsg ? <div style={styles.error}>{errorMsg}</div> : null}
        {successMsg ? <div style={styles.success}>{successMsg}</div> : null}

        <div style={styles.section}>
          <div style={styles.sectionTitle}>Avatar</div>

          <div style={styles.avatarRow}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="" style={styles.avatarImg} referrerPolicy="no-referrer" />
            ) : (
              <div style={styles.avatarFallback} aria-hidden="true">
                {(displayName[0] || '?').toUpperCase()}
              </div>
            )}

            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800 }}>{displayName}</div>
              <div style={styles.muted}>Upload a photo to show on the calendar.</div>

              <label style={styles.uploadLabel}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files && e.target.files[0]
                    if (f) onPickAvatar(f)
                    e.currentTarget.value = ''
                  }}
                  disabled={demo || isUploading}
                  style={{ display: 'none' }}
                />
                <span style={demo ? styles.uploadBtnDisabled : styles.uploadBtn}>
                  {isUploading ? 'Uploading…' : 'Upload photo'}
                </span>
              </label>
            </div>
          </div>
        </div>

        <form onSubmit={onSave} style={styles.section}>
          <div style={styles.sectionTitle}>Details</div>

          <div style={styles.grid2}>
            <label style={styles.field}>
              <span style={styles.label}>First name</span>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={demo || isSaving}
                style={styles.input}
                autoComplete="given-name"
              />
            </label>

            <label style={styles.field}>
              <span style={styles.label}>Last name</span>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={demo || isSaving}
                style={styles.input}
                autoComplete="family-name"
              />
            </label>
          </div>

          <div style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button type="submit" disabled={demo || isSaving} style={demo ? styles.primaryBtnDisabled : styles.primaryBtn}>
              {isSaving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100dvh',
    width: '100%',
    background: '#ffffff',
  },
  pageInner: {
    width: '100%',
    minHeight: '100dvh',
    padding: '16px 16px 24px',
    boxSizing: 'border-box',
  },
  headerRow: {
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    paddingBottom: 12,
    borderBottom: '1px solid #d6e6e3',
  },
  h1: {
    fontSize: 20,
    fontWeight: 900,
    color: '#2f6f73',
  },
  muted: {
    marginTop: 4,
    color: '#1f2933',
    opacity: 0.8,
    fontSize: 14,
  },
  demoPill: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: 999,
    background: 'rgba(95,167,163,0.18)',
    border: '1px solid rgba(95,167,163,0.45)',
    color: '#2f6f73',
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.3,
  },
  section: {
    marginTop: 16,
    paddingTop: 14,
    borderTop: '1px solid #d6e6e3',
  },
  sectionTitle: {
    fontWeight: 900,
    color: '#2f6f73',
    marginBottom: 10,
  },
  avatarRow: {
    display: 'flex',
    gap: 12,
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  avatarImg: {
    width: 72,
    height: 72,
    borderRadius: 16,
    objectFit: 'cover',
    border: '1px solid #d6e6e3',
    background: '#eef4f3',
  },
  avatarFallback: {
    width: 72,
    height: 72,
    borderRadius: 16,
    background: '#eef4f3',
    border: '1px solid #d6e6e3',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 28,
    fontWeight: 900,
    color: '#2f6f73',
  },
  uploadLabel: {
    display: 'inline-block',
    marginTop: 8,
  },
  uploadBtn: {
    display: 'inline-block',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid #2f6f73',
    background: '#ffffff',
    color: '#2f6f73',
    fontWeight: 800,
    cursor: 'pointer',
  },
  uploadBtnDisabled: {
    display: 'inline-block',
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(47,111,115,0.35)',
    background: '#ffffff',
    color: 'rgba(47,111,115,0.55)',
    fontWeight: 800,
    cursor: 'not-allowed',
  },
  grid2: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
    gap: 12,
  },
  field: {
    display: 'grid',
    gap: 6,
  },
  label: {
    fontSize: 12,
    opacity: 0.8,
  },
  input: {
    height: 42,
    borderRadius: 12,
    border: '1px solid #d6e6e3',
    padding: '0 12px',
    fontSize: 16,
    outline: 'none',
    boxSizing: 'border-box',
  },
  error: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(154, 79, 79, 0.35)',
    background: 'rgba(154, 79, 79, 0.08)',
    color: '#9a4f4f',
    fontWeight: 800,
    fontSize: 14,
  },
  success: {
    marginTop: 12,
    padding: '10px 12px',
    borderRadius: 12,
    border: '1px solid rgba(47, 111, 115, 0.35)',
    background: 'rgba(47, 111, 115, 0.08)',
    color: '#2f6f73',
    fontWeight: 800,
    fontSize: 14,
  },
  primaryBtn: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #2f6f73',
    background: '#2f6f73',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'pointer',
  },
  primaryBtnDisabled: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid rgba(47,111,115,0.35)',
    background: 'rgba(47,111,115,0.4)',
    color: '#ffffff',
    fontWeight: 900,
    cursor: 'not-allowed',
  },
  secondaryBtn: {
    padding: '12px 14px',
    borderRadius: 12,
    border: '1px solid #d6e6e3',
    background: '#ffffff',
    color: '#2f6f73',
    fontWeight: 900,
    cursor: 'pointer',
  },
}