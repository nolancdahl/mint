import React, { useState, useEffect } from 'react'
import { auth, googleProvider } from '../lib/firebase'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { COLORS, FONTS } from '../lib/theme'

export const useAuth = () => {
  const [user, setUser] = useState(undefined) // undefined = loading
  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u))
  }, [])
  return user
}

export const LoginScreen = () => {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (e) {
      if (e.code !== 'auth/popup-closed-by-user') {
        setError('Sign-in failed. Try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', padding: '40px 24px',
      background: COLORS.cream,
    }}>
      <div className="garmint-logo" style={{
        fontSize: '32px', color: COLORS.green, marginBottom: '8px',
      }}>
        garmint
      </div>
      <p style={{
        fontFamily: FONTS.sub, fontSize: '13px', color: COLORS.textMuted,
        marginBottom: '40px', textAlign: 'center',
      }}>
        Sign in to sync your wardrobe across devices
      </p>
      <button
        onClick={handleLogin}
        disabled={loading}
        style={{
          padding: '14px 32px', background: COLORS.green, color: COLORS.cream,
          border: 'none', borderRadius: '999px', fontFamily: FONTS.sub,
          fontSize: '13px', fontWeight: 600, letterSpacing: '0.08em',
          textTransform: 'uppercase', cursor: loading ? 'default' : 'pointer',
          opacity: loading ? 0.6 : 1, transition: 'opacity 0.15s',
        }}
      >
        {loading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      {error && (
        <p style={{
          fontFamily: FONTS.sub, fontSize: '12px', color: COLORS.danger,
          marginTop: '16px',
        }}>
          {error}
        </p>
      )}
    </div>
  )
}

export const handleSignOut = () => signOut(auth)
