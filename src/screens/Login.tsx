import { useState } from 'react'
import { useApp } from '../context'
import { USERS_DATA, type UserRole } from '../data'
import { T } from '../components'

export default function LoginScreen() {
  const { dispatch } = useApp()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<UserRole>('موظف_نهمة')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showBiometric, setShowBiometric] = useState(false)
  const [biometricEnabled, setBiometricEnabled] = useState(false)

  const handleLogin = async () => {
    setError('')
    setLoading(true)
    await new Promise(r => setTimeout(r, 700))
    const user = USERS_DATA.find(u => u.username === username && u.password === password && u.role === role)
    setLoading(false)
    if (!user) { setError('خطأ في البيانات — تحقق من اسم المستخدم وكلمة المرور والدور'); return }
    setShowBiometric(true)
    setTimeout(() => {
      dispatch({ type: 'LOGIN', user })
    }, 300)
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(160deg, #0B1526 0%, #0F2040 50%, #0B1835 100%)',
      alignItems: 'center', justifyContent: 'center',
      padding: 24, gap: 0,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <div style={{
          width: 80, height: 80, borderRadius: 24,
          background: 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 16px', fontSize: 36,
          boxShadow: '0 8px 32px rgba(14,165,233,0.3)',
        }}>🚛</div>
        <h1 style={{ color: '#F1F5F9', fontSize: 24, fontWeight: 800, margin: 0 }}>هيئة النقل</h1>
        <p style={{ color: '#64748B', fontSize: 13, margin: '6px 0 0' }}>نظام البوابير — الإصدار ٢٫٠</p>
      </div>

      {/* Card */}
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 20,
        padding: '28px 24px',
        width: '100%',
        maxWidth: 340,
        backdropFilter: 'blur(12px)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>اسم المستخدم</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>👤</span>
            <input
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="أدخل اسم المستخدم"
              style={{
                width: '100%', padding: '12px 44px 12px 14px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, color: '#F1F5F9', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>كلمة المرور</label>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15 }}>🔒</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', padding: '12px 44px 12px 14px',
                background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 12, color: '#F1F5F9', fontSize: 14,
                outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
              }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#94A3B8' }}>الدور الوظيفي</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            style={{
              padding: '12px 14px', background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12,
              color: '#F1F5F9', fontSize: 14, outline: 'none',
              fontFamily: 'inherit', direction: 'rtl', cursor: 'pointer',
            }}
          >
            <option value="موظف_نهمة" style={{ background: '#0F2040' }}>موظف نهمة</option>
            <option value="مدير_مكتب" style={{ background: '#0F2040' }}>مدير مكتب</option>
          </select>
        </div>

        {error && (
          <div style={{
            background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#FCA5A5',
          }}>{error}</div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading}
          style={{
            width: '100%', padding: '14px', borderRadius: 12,
            background: loading ? '#334155' : 'linear-gradient(135deg, #1D4ED8, #0EA5E9)',
            border: 'none', color: '#fff', fontSize: 15, fontWeight: 700,
            cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', transition: 'opacity 0.2s',
            boxShadow: loading ? 'none' : '0 4px 20px rgba(29,78,216,0.4)',
          }}
        >
          {loading ? '⏳ جاري التحقق...' : '🔑 دخول'}
        </button>

        {/* Biometric option */}
        {showBiometric && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginTop: 4 }}>
            <input type="checkbox" checked={biometricEnabled} onChange={() => setBiometricEnabled(!biometricEnabled)}
              style={{ width: 16, height: 16, accentColor: T.primary }} />
            <span style={{ fontSize: 13, color: '#94A3B8' }}>تفعيل الدخول بالبصمة 👆</span>
          </label>
        )}

        {/* Demo hint */}
        <div style={{ fontSize: 11, color: '#475569', textAlign: 'center', marginTop: 4, lineHeight: 1.8 }}>
          <div>موظف نهمة: <span style={{ color: '#64748B' }}>موظف1 / 1234</span></div>
          <div>مدير مكتب: <span style={{ color: '#64748B' }}>مدير1 / admin</span></div>
        </div>
      </div>

      {/* Biometric shortcut */}
      {biometricEnabled && (
        <button
          onClick={() => dispatch({ type: 'LOGIN', user: USERS_DATA[0] })}
          style={{
            marginTop: 24, background: 'none', border: '1px solid rgba(255,255,255,0.15)',
            borderRadius: 12, padding: '12px 24px', color: '#94A3B8', cursor: 'pointer',
            fontSize: 13, fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 8,
          }}>
          👆 الدخول بالبصمة
        </button>
      )}
    </div>
  )
}
